import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CryptoJS from 'crypto-js';
import { resolveMongoUri } from '../src/config/dbConnect.js';
import { Snapshot } from '../src/models/Snapshot.js';

dotenv.config();

const SECRET = process.env.CRYPTO_SECRET;
const MONGO_URI = resolveMongoUri();
if (!MONGO_URI) {
  console.error('[seedSnapshots] MongoDB connection string not configured. Set MONGO_URI or DB_USER/DB_PASSWORD (and optional DB_HOST/DB_NAME).');
  process.exit(1);
}
if (!SECRET) {
  console.warn('[seedSnapshots] CRYPTO_SECRET not set. Aborting for safety.');
  process.exit(1);
}

const looksEncrypted = (val) => typeof val === 'string' && /^U2FsdGVkX1/i.test(val);
const enc = (v) => {
  if (v == null) return v;
  const s = String(v);
  if (looksEncrypted(s)) return s;
  return CryptoJS.AES.encrypt(s, SECRET).toString();
};
const sha = (s) => CryptoJS.SHA256(s).toString(CryptoJS.enc.Hex);

// Helpers
const toUTCDate = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUTC = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[seedSnapshots] Connected');

  // Configure aqui: usuários e tickers de teste
  const userId = '68961ed88aaf344ccb97029a';
  const positions = [
    // BRL - B3
    { symbol: 'PETR4', currency: 'BRL', avg: 35.0, qty: 200 },
    { symbol: 'ITUB4', currency: 'BRL', avg: 28.5, qty: 150 },
    // USD - US
    { symbol: 'NVDA', currency: 'USD', avg: 100.0, qty: 10 },
    { symbol: 'AAPL', currency: 'USD', avg: 160.0, qty: 15 }
  ];

  const days = 15; // gerar 15 dias
  const today = toUTCDate(new Date());

  let created = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysUTC(today, -i);
    // pula fins de semana
    const dow = date.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    // Taxa simulada BRL por USD para o dia
    const fxUSDBRL = 4.5 + Math.random() * 0.4 - 0.2; // entre ~4.3 e 4.7
    const fxBRLUSD = 1 / fxUSDBRL;

    for (const p of positions) {
      const upper = p.symbol.toUpperCase();
      const apiSymbol = p.currency === 'BRL' && !upper.endsWith('.SA') ? `${upper}.SA` : upper;
      const storedSymbol = apiSymbol.endsWith('.SA') ? apiSymbol.replace('.SA', '') : apiSymbol;
      const symbolHash = sha(storedSymbol);

      // Simulação simples de preços: oscila em torno do avg
      // previousClose ~ avg * (1 + ruido leve), close = previousClose * (1 + variação diária)
      const rnd = (min, max) => Math.random() * (max - min) + min;
      const prevClose = p.avg * rnd(0.95, 1.05);
      const dailyPct = rnd(-0.02, 0.02); // -2% a +2%
      const close = prevClose * (1 + dailyPct);

      const perShareChange = close - prevClose;
      const dayChange = perShareChange * p.qty;
      const baseCost = p.avg * p.qty;
      const dayChangePercent = baseCost !== 0 ? (dayChange / baseCost) * 100 : 0;
      const positionValue = close * p.qty;
      let totalValueUSD = null;
      let totalValueBRL = null;
      if (p.currency.toUpperCase() === 'BRL') {
        totalValueBRL = positionValue;
        totalValueUSD = positionValue * fxBRLUSD;
      } else if (p.currency.toUpperCase() === 'USD') {
        totalValueUSD = positionValue;
        totalValueBRL = positionValue * fxUSDBRL;
      }

      const filter = { userId, symbolHash, tradingDate: date };
      const update = {
        $setOnInsert: {
          userId,
          symbol: enc(storedSymbol),
          symbolHash,
          currency: enc(p.currency),
          tradingDate: date,
          createdAt: new Date()
        },
        $set: {
          closePrice: enc(close),
          dayChange: enc(dayChange),
          dayChangePercent: enc(dayChangePercent),
          updatedAt: new Date(),
          fxUSDBRL: enc(fxUSDBRL),
          fxBRLUSD: enc(fxBRLUSD),
          totalValueUSD: totalValueUSD != null ? enc(totalValueUSD) : undefined,
          totalValueBRL: totalValueBRL != null ? enc(totalValueBRL) : undefined
        }
      };
      const res = await Snapshot.updateOne(filter, update, { upsert: true });
      if (res.upsertedCount === 1 || (res.upserted && res.upserted.length)) created++;
    }
  }

  console.log(`[seedSnapshots] Done. Created/updated docs: ${created}`);
  await mongoose.connection.close();
}

seed().catch((e) => {
  console.error('[seedSnapshots] Error:', e);
  process.exitCode = 1;
});
