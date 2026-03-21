import { all, execute } from './db.js';
import { createObjectId, nowIso } from '../utils/ids.js';

function mapBroker(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    broker: row.broker,
    currency: row.currency,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBrokerRecord({ broker, currency, userId }) {
  const id = createObjectId();
  const timestamp = nowIso();

  await execute(
    `INSERT INTO brokers (id, broker, currency, user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, broker, currency, userId, timestamp],
  );

  return mapBroker({ id, broker, currency, user_id: userId, created_at: timestamp, updated_at: null });
}

export async function listBrokersByUserId(userId) {
  return (await all(`SELECT * FROM brokers WHERE user_id = ? ORDER BY created_at ASC`, [userId])).map(mapBroker);
}