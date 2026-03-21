import { all, execute, first } from './db.js';
import { createObjectId, nowIso } from '../utils/ids.js';

function mapSnapshot(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    symbolHash: row.symbol_hash,
    currency: row.currency,
    closePrice: row.close_price,
    dayChange: row.day_change,
    dayChangePercent: row.day_change_percent,
    tradingDate: row.trading_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fxUSDBRL: row.fx_usdbrl,
    fxBRLUSD: row.fx_brlusd,
    totalValueUSD: row.total_value_usd,
    totalValueBRL: row.total_value_brl,
  };
}

export async function countSnapshotsByUser({ userId, fromDate, toDate, allRecords }) {
  const row = allRecords
    ? await first(`SELECT COUNT(*) AS total FROM snapshots WHERE user_id = ?`, [userId])
    : await first(
        `SELECT COUNT(*) AS total FROM snapshots WHERE user_id = ? AND trading_date >= ? AND trading_date <= ?`,
        [userId, fromDate, toDate],
      );

  return Number(row?.total ?? 0);
}

export async function listSnapshotsByUser({ userId, fromDate, toDate, allRecords, limit, offset }) {
  const rows = allRecords
    ? await all(
        `SELECT * FROM snapshots WHERE user_id = ? ORDER BY trading_date DESC, symbol_hash ASC LIMIT ? OFFSET ?`,
        [userId, limit, offset],
      )
    : await all(
        `SELECT * FROM snapshots
          WHERE user_id = ?
            AND trading_date >= ?
            AND trading_date <= ?
          ORDER BY trading_date DESC, symbol_hash ASC
          LIMIT ? OFFSET ?`,
        [userId, fromDate, toDate, limit, offset],
      );

  return rows.map(mapSnapshot);
}

export async function upsertSnapshotRecord(record) {
  const existing = await first(
    `SELECT id FROM snapshots WHERE user_id = ? AND symbol_hash = ? AND trading_date = ? LIMIT 1`,
    [record.userId, record.symbolHash, record.tradingDate],
  );

  const id = existing?.id ?? createObjectId();
  const createdAt = existing ? record.createdAt : nowIso();

  await execute(
    `INSERT INTO snapshots (
       id, user_id, symbol, symbol_hash, currency, close_price, day_change, day_change_percent,
       trading_date, created_at, updated_at, fx_usdbrl, fx_brlusd, total_value_usd, total_value_brl
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, symbol_hash, trading_date) DO UPDATE SET
       symbol = excluded.symbol,
       currency = excluded.currency,
       close_price = excluded.close_price,
       day_change = excluded.day_change,
       day_change_percent = excluded.day_change_percent,
       updated_at = excluded.updated_at,
       fx_usdbrl = excluded.fx_usdbrl,
       fx_brlusd = excluded.fx_brlusd,
       total_value_usd = excluded.total_value_usd,
       total_value_brl = excluded.total_value_brl`,
    [
      id,
      record.userId,
      record.symbol,
      record.symbolHash,
      record.currency,
      record.closePrice,
      record.dayChange,
      record.dayChangePercent,
      record.tradingDate,
      createdAt,
      record.updatedAt ?? nowIso(),
      record.fxUSDBRL ?? null,
      record.fxBRLUSD ?? null,
      record.totalValueUSD ?? null,
      record.totalValueBRL ?? null,
    ],
  );

  return { inserted: !existing, id };
}