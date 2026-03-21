import { all, batch } from './db.js';
import { createObjectId, nowIso, toIsoDate } from '../utils/ids.js';

function mapBtgDividend(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    date: row.date,
    lancamento: row.lancamento,
    ticker: row.ticker,
    valor: row.valor,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

export async function insertBtgDividends(records) {
  const timestamp = nowIso();
  const results = await batch(
    records.map((record) => ({
      sql: `INSERT OR IGNORE INTO btg_dividends (id, date, lancamento, ticker, valor, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        createObjectId(),
        toIsoDate(record.date),
        record.lancamento,
        record.ticker,
        Number(record.valor),
        record.userId,
        timestamp,
      ],
    })),
  );

  const inserted = results.reduce((count, result) => count + (result.meta?.changes ?? 0), 0);
  return { inserted, duplicates: records.length - inserted };
}

export async function listBtgDividendsByUserId(userId) {
  return (await all(`SELECT * FROM btg_dividends WHERE user_id = ? ORDER BY date DESC, created_at DESC`, [userId])).map(mapBtgDividend);
}