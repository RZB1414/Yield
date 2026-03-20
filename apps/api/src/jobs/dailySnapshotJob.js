import YahooFinance from "yahoo-finance2";
import CryptoJS from "crypto-js";
import { stock } from "../models/Stock.js";
import { Snapshot } from "../models/Snapshot.js";

const yahooFinance = new YahooFinance();

// Lógica reutilizável (não agenda aqui para poder ser chamada pelo GitHub Actions)
export async function runDailySnapshot() {
  // Lê a secret aqui para garantir que dotenv já tenha carregado
  const SECRET = process.env.CRYPTO_SECRET;
  if (!SECRET) {
    console.warn("[Snapshot] CRYPTO_SECRET não definida. Tentando continuar, mas descriptografia pode falhar.");
  }
  const now = new Date();
  // const day = now.getUTCDay();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) {
    console.log("[Snapshot] Weekend. Skipping.");
    return;
  }

  const tradingDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    const allPositions = await stock.find({});
    if (!allPositions.length) {
      console.log("[Snapshot] No positions found.");
      return;
    }

    // Descriptografia no estilo do StockController: tenta descriptografar e, se vier vazio, retorna o valor original
    const decryptOrPass = (val) => {
      if (val == null) return val;
      try {
        const s = CryptoJS.AES.decrypt(val, SECRET).toString(CryptoJS.enc.Utf8);
        return s || val;
      } catch {
        return val;
      }
    };

    const decryptedPositions = allPositions.map(p => ({
      userId: p.userId,
      symbol: decryptOrPass(p.symbol),
      currency: decryptOrPass(p.currency),
      averagePrice: parseFloat(decryptOrPass(p.averagePrice)) || null,
      stocksQuantity: parseFloat(decryptOrPass(p.stocksQuantity)) || null
    }));

    // Normalização de símbolos para Yahoo Finance:
    // - BRL (B3): adicionar sufixo .SA
    // - Se currency não estiver presente, inferir: tickers com 4 letras + 1 dígito (ex: PETR4) costumam ser B3.
    const symbolMapping = {}; // originalSymbol -> apiSymbol
    const apiSymbols = decryptedPositions.map(p => {
      if (!p.symbol) return null;
      const upper = p.symbol.toUpperCase().trim();
      const isLikelyB3 = /[A-Z]{4}\d{1,2}$/i.test(upper);
      const isBRL = p.currency && p.currency.toUpperCase() === 'BRL';

      if ((isBRL || (!p.currency && isLikelyB3)) && !upper.endsWith('.SA')) {
        symbolMapping[upper] = `${upper}.SA`;
        return `${upper}.SA`;
      }
      symbolMapping[upper] = upper; // sem alteração
      return upper;
    }).filter(Boolean);

    const uniqueSymbols = [...new Set(apiSymbols)];
    const quotesMap = {}; // apiSymbol -> quote
    let fxUSDBRL = null; // cache de câmbio por execução

    // Garante que índices (incluindo o único) estejam inicializados antes dos upserts
    try {
      await Snapshot.init();
    } catch (idxErr) {
      console.warn('[Snapshot] Warn initializing indexes:', idxErr.message);
    }

    try {
      if (!uniqueSymbols.length) {
        console.log('[Snapshot] No symbols to quote after normalization.');
      } else {
        const batch = await yahooFinance.quote(uniqueSymbols);
        if (Array.isArray(batch)) {
          batch.forEach(q => { if (q && q.symbol) quotesMap[q.symbol] = q; });
        } else if (batch && batch.symbol) {
          quotesMap[batch.symbol] = batch;
        }
      }
    } catch (err) {
      console.warn("[Snapshot] Batch quote fail, fallback one by one:", err.message);
      for (const sym of uniqueSymbols) {
        try {
          const q = await yahooFinance.quote(sym);
          if (q && q.symbol) quotesMap[q.symbol] = q;
        } catch (er) {
          console.warn(`[Snapshot] Failed quote ${sym}:`, er.message);
        }
      }
    }

    // Busca taxa USDBRL uma vez por execução (opcional, para enriquecer snapshots)
    try {
      const fx = await yahooFinance.quote('USDBRL=X');
      const rate = fx?.regularMarketPrice;
      if (typeof rate === 'number' && isFinite(rate)) fxUSDBRL = rate; // BRL por 1 USD
    } catch (e) {
      console.warn('[Snapshot] Não foi possível obter USDBRL=X:', e.message);
    }

    let created = 0;
    let updated = 0;
    for (const pos of decryptedPositions) {
      if (!pos.symbol) {
        console.log('[Snapshot] Skip: symbol vazio');
        continue;
      }
      const originalSymbol = pos.symbol.toUpperCase().trim(); // normaliza para consistência

      // Se após tentativa ainda não temos um símbolo utilizável, pula
      if (!pos.symbol || typeof pos.symbol !== 'string') {
        console.warn(`[Snapshot] Invalid symbol after decryption. Skipping.`);
        continue;
      }

      // Evita tentar consultar símbolos obviamente inválidos (com + / = típicos de base64)
      if (/[+/=]/.test(originalSymbol)) {
        console.warn(`[Snapshot] Invalid ticker format after normalization: ${originalSymbol}. Skipping.`);
        continue;
      }
      const apiSymbol = symbolMapping[originalSymbol] ?? originalSymbol;
      // Usa apenas cotações Yahoo (sem dados do frontend)
      let closePrice, dayChange, dayChangePercent;
      const q = quotesMap[apiSymbol];
      if (!q) {
        console.log(`[Snapshot] Skip: quote não encontrado para ${originalSymbol} (apiSymbol=${apiSymbol})`);
        continue;
      }
      closePrice = q.regularMarketPrice;
      dayChange = q.regularMarketChange;
      dayChangePercent = q.regularMarketChangePercent;

      // Fallback: se variação vier null mas temos previousClose
      if ((dayChange == null || dayChangePercent == null) && q?.regularMarketPreviousClose != null && closePrice != null) {
        const prev = q.regularMarketPreviousClose;
        if (dayChange == null) dayChange = closePrice - prev; // variação por ação
        if (dayChangePercent == null && prev !== 0) {
          dayChangePercent = (dayChange / prev) * 100; // variação por ação em %
        }
      }

      // Define moeda alvo pela cotação (preferível) ou pelo sufixo .SA (B3)
      const targetCurrency = (q && typeof q.currency === 'string'
        ? q.currency.toUpperCase()
        : (apiSymbol.endsWith('.SA') ? 'BRL' : 'USD'));

      // Recalcula os valores para refletir o P&L do dia da sua posição, garantindo moeda alinhada
      // dayChange -> variação do valor da sua posição no dia: (Δpreço por ação do dia) * quantidade, na moeda do ativo (targetCurrency)
      // dayChangePercent -> variação % do dia em relação ao custo (preço médio convertido p/ targetCurrency * quantidade)
      const hasQty = typeof pos.stocksQuantity === 'number' && !isNaN(pos.stocksQuantity);
      const hasAvgRaw = typeof pos.averagePrice === 'number' && !isNaN(pos.averagePrice);
      let positionValue = null;
      if (hasQty && closePrice != null) {
        let prevClose = q?.regularMarketPreviousClose;
        if (prevClose == null && dayChange != null) {
          prevClose = closePrice - dayChange; // deduz previousClose pela variação por ação
        }
        // Se conseguirmos obter variação por ação no dia, convertemos para variação da posição
        const perShareChange = (prevClose != null && closePrice != null)
          ? (closePrice - prevClose)
          : (dayChange != null ? dayChange : null);

        if (perShareChange != null) {
          const qty = pos.stocksQuantity;
          const avg = pos.averagePrice; // mantém o preço médio original, sem conversão
          const positionChange = perShareChange * qty;
          const baseCost = (hasAvgRaw && isFinite(avg)) ? (avg * qty) : null;
          const positionChangePercent = (baseCost && baseCost !== 0) ? (positionChange / baseCost) * 100 : null;
          dayChange = positionChange;
          dayChangePercent = positionChangePercent != null ? positionChangePercent : dayChangePercent;
        }
        positionValue = closePrice * pos.stocksQuantity;
      }

      if (closePrice == null) {
        console.log(`[Snapshot] Skip: closePrice null ${originalSymbol}`);
        continue;
      }
      if (dayChange == null || dayChangePercent == null) {
        console.log(`[Snapshot] Skip: sem variação calculável ${originalSymbol}`);
        continue;
      }

      // Armazena sempre o símbolo normalizado em uppercase (sem .SA) para evitar duplicados case-sensitive
      // Mantemos o símbolo do usuário sem o sufixo .SA (se adicionamos apenas para consulta) assumindo que o cadastro original foi sem .SA.
      const storedSymbol = originalSymbol.endsWith('.SA') ? originalSymbol.replace('.SA', '') : originalSymbol;

      // Funções utilitárias
      const looksEncrypted = (val) => typeof val === 'string' && /^U2FsdGVkX1/i.test(val);
      const encrypt = (val) => {
        if (val == null) return val;
        const s = String(val);
        if (looksEncrypted(s)) return s; // evita duplo encryption
        try { return CryptoJS.AES.encrypt(s, SECRET).toString(); } catch { return s; }
      };
      const hashSymbol = (sym) => {
        // SHA-256 em hex
        return CryptoJS.SHA256(sym).toString(CryptoJS.enc.Hex);
      };

      const symbolHash = hashSymbol(storedSymbol);
      const filter = { userId: pos.userId, symbolHash, tradingDate };

      let totalValueUSD = null;
      let totalValueBRL = null;
      if (positionValue != null) {
        if (targetCurrency === 'BRL') {
          totalValueBRL = positionValue;
          if (fxUSDBRL != null && fxUSDBRL !== 0) totalValueUSD = positionValue / fxUSDBRL;
        } else if (targetCurrency === 'USD') {
          totalValueUSD = positionValue;
          if (fxUSDBRL != null) totalValueBRL = positionValue * fxUSDBRL;
        } else {
          // Para outras moedas, apenas mantém a moeda original
          if (targetCurrency) {
            // se informada BRL/USD via pos.currency, poderia ajustar no futuro
          }
        }
      }

      const update = {
        $setOnInsert: {
          userId: pos.userId,
          symbol: encrypt(storedSymbol), // criptografado apenas ao inserir
          symbolHash,
          currency: encrypt(targetCurrency),
          tradingDate,
          createdAt: new Date()
        },
        $set: {
          closePrice: encrypt(closePrice),
          dayChange: encrypt(dayChange),
          dayChangePercent: encrypt(dayChangePercent),
          updatedAt: new Date(),
          fxUSDBRL: fxUSDBRL != null ? encrypt(fxUSDBRL) : undefined,
          fxBRLUSD: fxUSDBRL != null && fxUSDBRL !== 0 ? encrypt(1 / fxUSDBRL) : undefined,
          totalValueUSD: totalValueUSD != null ? encrypt(totalValueUSD) : undefined,
          totalValueBRL: totalValueBRL != null ? encrypt(totalValueBRL) : undefined
        }
      };
      try {
        const res = await Snapshot.updateOne(filter, update, { upsert: true });
        if (res.upsertedCount === 1 || (res.upserted && res.upserted.length)) {
          created++;
        } else if (res.matchedCount >= 1) {
          updated++;
        }
      } catch (upErr) {
        if (upErr.code === 11000) {
          // corrida vencida por outra operação; ignorar
        } else {
          console.warn('[Snapshot] Upsert error:', upErr.message);
        }
      }
    }

    console.log(`[Snapshot] Done. New snapshots: ${created}, Updated snapshots: ${updated}`);
  } catch (error) {
    console.error("[Snapshot] General error:", error.message);
  }
}
