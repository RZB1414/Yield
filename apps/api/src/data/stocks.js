import { all, execute, first, isUniqueConstraintError } from './db.js';
import { createObjectId, nowIso } from '../utils/ids.js';

function mapStock(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    symbol: row.symbol,
    symbolHash: row.symbol_hash,
    currency: row.currency,
    averagePrice: row.average_price,
    stocksQuantity: row.stocks_quantity,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listStocksByUserId(userId) {
  return (await all(`SELECT * FROM stocks WHERE user_id = ? ORDER BY created_at ASC`, [userId])).map(mapStock);
}

export async function listAllStocks() {
  return (await all(`SELECT * FROM stocks ORDER BY created_at ASC`)).map(mapStock);
}

export async function findStockById(id) {
  return mapStock(await first(`SELECT * FROM stocks WHERE id = ? LIMIT 1`, [id]));
}

export async function createStockRecord({ symbol, symbolHash, currency, averagePrice, stocksQuantity, userId }) {
  const id = createObjectId();
  const timestamp = nowIso();

  try {
    await execute(
      `INSERT INTO stocks (id, symbol, symbol_hash, currency, average_price, stocks_quantity, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, symbol, symbolHash, currency, averagePrice, stocksQuantity, userId, timestamp],
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      error.code = 'STOCK_CONFLICT';
    }

    throw error;
  }

  return mapStock({
    id,
    symbol,
    symbol_hash: symbolHash,
    currency,
    average_price: averagePrice,
    stocks_quantity: stocksQuantity,
    user_id: userId,
    created_at: timestamp,
    updated_at: null,
  });
}

export async function updateStockRecord(id, { averagePrice, stocksQuantity }) {
  const timestamp = nowIso();

  await execute(
    `UPDATE stocks
        SET average_price = ?,
            stocks_quantity = ?,
            updated_at = ?
      WHERE id = ?`,
    [averagePrice, stocksQuantity, timestamp, id],
  );

  return findStockById(id);
}

export async function deleteStockRecord(id) {
  const current = await findStockById(id);

  if (!current) {
    return null;
  }

  await execute(`DELETE FROM stocks WHERE id = ?`, [id]);
  return current;
}