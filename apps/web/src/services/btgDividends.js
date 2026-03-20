import axios from 'axios'
import { BASE_URL } from './apiConfig'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

const btgDividendsApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
})

btgDividendsApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Tenta usar worker ESM local; se falhar, fica sem worker (fallback interno depois)
let workerConfigured = false;
try {
  const w = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url);
  GlobalWorkerOptions.workerSrc = w.toString();
  workerConfigured = true;
} catch (e) {
  console.warn('Não foi possível configurar worker ESM local, será usado fallback sem worker. Erro:', e);
}

async function toArrayBuffer(input) {
  // Aceita File/Blob, URL string, ArrayBuffer e Uint8Array
  if (!input) throw new Error('Entrada inválida para extratoToArray');
  if (input instanceof ArrayBuffer) return input;
  if (input instanceof Uint8Array) return input.buffer;
  if (typeof input === 'string') {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Falha ao buscar PDF: ${res.status}`);
    return await res.arrayBuffer();
  }
  if (typeof input.arrayBuffer === 'function') {
    return await input.arrayBuffer();
  }
  throw new Error('Tipo de entrada não suportado (forneça File/Blob/URL/ArrayBuffer)');
}

async function saveBtgDividends(input) {
  const buffer = await toArrayBuffer(input);

  async function load(withWorker) {
    return getDocument({ data: buffer, isEvalSupported: false, disableWorker: !withWorker }).promise;
  }

  let pdf;
  try {
    pdf = await load(workerConfigured); // tenta com worker se configurado
  } catch (err) {
    const msg = (err && err.message) || '';
    const workerRelated = /worker/i.test(msg) || /Failed to fetch dynamically imported module/i.test(msg);
    if (workerRelated) {
      console.warn('Falha ao usar worker PDF.js, refazendo sem worker...', err);
      pdf = await load(false);
    } else {
      throw err;
    }
  }

  // Tokens brutos preservando ordem
  const tokens = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    for (const item of content.items) {
      const texto = (item.str || '').trim();
      if (!texto) continue;
      tokens.push(texto);
    }
  }
  // Sequência alvo de tokens (mantém ordem; ignora token nulo explicitamente)
  const padrao = ['R','end','variável','-','M','ovimentação','-','A','ções'];
  function encontrarInicio(){
    for (let i=0;i<tokens.length;i++){
      let k=0;
      for (let j=i;j<tokens.length && k<padrao.length;j++){
        const tk = tokens[j];
        if (tk === '\u0000' || tk === '\0') continue; // ignora null
        if (tk === padrao[k]) { k++; continue; }
        break;
      }
      if (k === padrao.length) return i;
    }
    return 0; // fallback: início
  }
  const start = encontrarInicio();
  // Inicia logo após o padrão em vez de usar offset fixo
  let resultado = tokens.slice(start + padrao.length);

  // Helper: corta tudo após a primeira (ou última) ocorrência da sequência.
  function cortarTudoDepois(arr, seq, { incluirSeq = false, ultima = false } = {}) {
    if (!seq || !seq.length) return arr;
    let found = -1;
    if (ultima) {
      for (let i = arr.length - seq.length; i >= 0; i--) {
        let ok = true;
        for (let j = 0; j < seq.length; j++) {
          if (arr[i + j] !== seq[j]) { ok = false; break; }
        }
        if (ok) { found = i; break; }
      }
    } else {
      for (let i = 0; i <= arr.length - seq.length; i++) {
        let ok = true;
        for (let j = 0; j < seq.length; j++) {
          if (arr[i + j] !== seq[j]) { ok = false; break; }
        }
        if (ok) { found = i; break; }
      }
    }
    if (found === -1) return arr; // não achou
    const end = incluirSeq ? found + seq.length : found; // se incluirSeq false, remove também a sequência
    return arr.slice(0, end);
  }

  // Mescla tickers quebrados (ex: PETR 4 -> PETR4)
  function mergeTickers(arr){
    const out = [];
    for (let i=0;i<arr.length;i++){
      const a = arr[i];
      const b = arr[i+1];
      if (/^[A-Z]{4}$/.test(a) && /^\d{1,2}$/.test(b||'')) { out.push(a + b); i++; }
      else out.push(a);
    }
    return out;
  }
  resultado = mergeTickers(resultado);

  // Sequência 'T','otal','de','C','ompras' – cortar tudo depois dela removendo a própria sequência
  resultado = cortarTudoDepois(resultado, ['T','otal','de','C','ompras'], { incluirSeq: false });


  // Cria objetos: data, lançamento (tokens até ticker), ticker, valor (primeiro monetário após ticker)
  const dataRegex = /^\d{2}\/\d{2}\/\d{2}(\d{2})?$/;
  const tickerRegex = /^[A-Z]{4}\d{1,2}$/;
  const moneyRegex = /^\d{1,3}(\.\d{3})*,\d{2}$/;

  function normData(d){
    return d.length === 8 ? d.replace(/(\d{2}\/\d{2}\/)(\d{2})$/, '$120$2') : d;
  }
  function parseMoney(pt){
    if (!moneyRegex.test(pt)) return null;
    const n = parseFloat(pt.replace(/\./g,'').replace(',', '.'));
    return isNaN(n)?null:n;
  }
  function parseDateBR(str){
    if(!str) return null;
    const parts = str.split('/');
    if(parts.length!==3) return null;
    const [dia,mes,ano] = parts.map(Number);
    if(!dia||!mes||!ano) return null;
    return new Date(ano, mes-1, dia);
  }

  const objetos = [];
  for (let i=0; i<resultado.length; i++) {
    if (!dataRegex.test(resultado[i])) continue;
    const dataToken = resultado[i];
    const data = normData(dataToken);
    let j = i + 1;
    const descTokens = [];
    let ticker = null;
    while (j < resultado.length) {
      const tk = resultado[j];
      if (dataRegex.test(tk)) break; // próxima data sem ticker
      if (tickerRegex.test(tk)) { ticker = tk; j++; break; }
      descTokens.push(tk); j++;
    }
    if (!ticker) continue;
  // Valor: último token antes da próxima data (independente de formato)
  let fimBloco = j;
  while (fimBloco < resultado.length && !dataRegex.test(resultado[fimBloco])) fimBloco++;
  const bloco = resultado.slice(j, fimBloco);
  const valorToken = bloco.length ? bloco[bloco.length - 1] : null;
  const valor = moneyRegex.test(valorToken || '') ? parseMoney(valorToken) : null;
  const userId = sessionStorage.getItem('userId')
  const valorAjustado = (descTokens.join(' ').trim() === 'VENDA' && typeof valor === 'number' && valor > 0) ? -valor : valor;
  objetos.push({ userId: userId, date: parseDateBR(data), lancamento: descTokens.join(' ').trim(), ticker, valor: valorAjustado });
  }
  if (!objetos.length) {
    console.warn('Nenhum objeto gerado', { start, padrao, preview: resultado.slice(0,40) });
  }
  console.log('Objetos gerados:', objetos);

  const result = await saveData({ records: objetos });
  
  async function saveData({ records }) {
    try {
      const response = await btgDividendsApi.post('/auth/createBtgDividends', { records });
      console.log('Dados salvos com sucesso:', response.data);
      return response.data
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  console.log('Resultado final:', result);
  

  return result
}

async function getBtgDividends(id) {
  try {
    const response = await btgDividendsApi.get(`/auth/getBtgDividendsByUserId/${id}`)
  const data = response.data || []
  // Usa o response.data para gerar os 2 arrays solicitados
  const { dividends, transactions } = splitBtgLancamentos(data)
  // Anexa os grupos ao próprio array para manter compatibilidade (length continua funcionando)
  data.btgDividends = dividends
  data.btgTransactions = transactions
  return { dividends, transactions }
  } catch (error) {
    console.error('Erro ao obter dados:', error);
    return null
  }
}

export {
  saveBtgDividends,
  getBtgDividends
}

// Retorna 2 arrays separados pelos tipos de lançamento solicitados
// 1) JUROS S / CAPITAL, COMPRA, RECEBIMENTO DIVIDENDOS, RENDIMENTO, RESTITUIÇÃO DE CAPITAL
// 2) VENDA, COMPRA
function splitBtgLancamentos(registros = []) {
  const grupo1Set = new Set([
    'JUROS S / CAPITAL',
    'RECEBIMENTO DIVIDENDOS',
    'RENDIMENTO',
    'RESTITUIÇÃO DE CAPITAL'
  ])
  const grupo2Set = new Set(['VENDA', 'COMPRA'])

  const normalizar = (s) => (s || '').toString().trim().toUpperCase()

  const dividends = []
  const transactions = []

  for (const r of registros) {
    const lanc = normalizar(r.lancamento)
    if (grupo1Set.has(lanc)) dividends.push(r)
    if (grupo2Set.has(lanc)) transactions.push(r)
  }

  // Retorna com chaves alinhadas ao uso em getBtgDividends
  return { dividends, transactions }
}