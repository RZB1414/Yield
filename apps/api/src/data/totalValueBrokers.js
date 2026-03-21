import { all, execute, first, isUniqueConstraintError } from './db.js';
import { createObjectId, nowIso, toMonthKey } from '../utils/ids.js';

function mapTotalValueBroker(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    date: row.date,
    dateMonth: row.date_month,
    currency: row.currency,
    totalValueInUSD: row.total_value_in_usd,
    totalValueInBRL: row.total_value_in_brl,
    brokerId: row.broker_id,
    brokerName: row.broker_name,
    brokerCurrency: row.broker_currency,
    brokerUserId: row.broker_user_id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findTotalValueBrokerById(id) {
  return mapTotalValueBroker(await first(`SELECT * FROM total_value_brokers WHERE id = ? LIMIT 1`, [id]));
}

export async function findTotalValueBrokerByUserBrokerMonth(userId, brokerId, date) {
  return mapTotalValueBroker(
    await first(
      `SELECT * FROM total_value_brokers WHERE user_id = ? AND broker_id = ? AND date_month = ? LIMIT 1`,
      [userId, brokerId, toMonthKey(date)],
    ),
  );
}

export async function createTotalValueBrokerRecord({ date, currency, totalValueInUSD, totalValueInBRL, broker, userId }) {
  const id = createObjectId();
  const timestamp = nowIso();
  const isoDate = new Date(date).toISOString();
  const dateMonth = toMonthKey(date);

  try {
    await execute(
      `INSERT INTO total_value_brokers (
         id, date, date_month, currency, total_value_in_usd, total_value_in_brl,
         broker_id, broker_name, broker_currency, broker_user_id, user_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        isoDate,
        dateMonth,
        currency,
        totalValueInUSD,
        totalValueInBRL,
        broker._id,
        broker.broker,
        broker.currency,
        broker.userId ?? null,
        userId,
        timestamp,
      ],
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      error.code = 'TOTAL_VALUE_CONFLICT';
    }

    throw error;
  }

  return mapTotalValueBroker({
    id,
    date: isoDate,
    date_month: dateMonth,
    currency,
    total_value_in_usd: totalValueInUSD,
    total_value_in_brl: totalValueInBRL,
    broker_id: broker._id,
    broker_name: broker.broker,
    broker_currency: broker.currency,
    broker_user_id: broker.userId ?? null,
    user_id: userId,
    created_at: timestamp,
    updated_at: null,
  });
}

export async function listTotalValueBrokersByUserId(userId) {
  return (await all(`SELECT * FROM total_value_brokers WHERE user_id = ? ORDER BY date DESC`, [userId])).map(mapTotalValueBroker);
}

export async function updateTotalValueBrokerValue(id, fieldName, encryptedValue) {
  const timestamp = nowIso();
  await execute(
    `UPDATE total_value_brokers
        SET ${fieldName} = ?,
            updated_at = ?
      WHERE id = ?`,
    [encryptedValue, timestamp, id],
  );

  return findTotalValueBrokerById(id);
}

export async function deleteTotalValueBrokerRecord(id) {
  const current = await findTotalValueBrokerById(id);

  if (!current) {
    return null;
  }

  await execute(`DELETE FROM total_value_brokers WHERE id = ?`, [id]);
  return current;
}