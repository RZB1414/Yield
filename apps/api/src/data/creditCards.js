import { all, execute, first, isUniqueConstraintError } from './db.js';
import { createObjectId, nowIso, toMonthKey } from '../utils/ids.js';

function mapCreditCard(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    bank: row.bank,
    bankHash: row.bank_hash,
    date: row.date,
    currency: row.currency,
    value: row.value,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findCreditCardByUserBankMonth(userId, bankHash, date) {
  return mapCreditCard(
    await first(
      `SELECT * FROM credit_cards WHERE user_id = ? AND bank_hash = ? AND date_month = ? LIMIT 1`,
      [userId, bankHash, toMonthKey(date)],
    ),
  );
}

export async function createCreditCardRecord({ bank, bankHash, date, currency, value, userId }) {
  const id = createObjectId();
  const timestamp = nowIso();
  const monthKey = toMonthKey(date);

  try {
    await execute(
      `INSERT INTO credit_cards (id, bank, bank_hash, date, date_month, currency, value, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, bank, bankHash, new Date(date).toISOString(), monthKey, currency, value, userId, timestamp],
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      error.code = 'CREDIT_CARD_CONFLICT';
    }

    throw error;
  }

  return mapCreditCard({
    id,
    bank,
    bank_hash: bankHash,
    date: new Date(date).toISOString(),
    currency,
    value,
    user_id: userId,
    created_at: timestamp,
    updated_at: null,
  });
}

export async function listCreditCardsByUserId(userId) {
  return (await all(`SELECT * FROM credit_cards WHERE user_id = ? ORDER BY date DESC`, [userId])).map(mapCreditCard);
}

export async function findCreditCardById(id) {
  return mapCreditCard(await first(`SELECT * FROM credit_cards WHERE id = ? LIMIT 1`, [id]));
}

export async function deleteCreditCardRecord(id) {
  const current = await findCreditCardById(id);

  if (!current) {
    return null;
  }

  await execute(`DELETE FROM credit_cards WHERE id = ?`, [id]);
  return current;
}