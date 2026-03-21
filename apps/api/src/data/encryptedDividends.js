import { all, batch, execute } from './db.js';
import { createObjectId, nowIso } from '../utils/ids.js';

function mapEncryptedDividend(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    userId: row.user_id,
    encryptedData: row.encrypted_data,
    salt: row.salt,
    iv: row.iv,
    hash: row.hash,
    createdAt: row.created_at,
  };
}

export async function insertEncryptedDividends(records) {
  const timestamp = nowIso();
  const results = await batch(
    records.map((record) => ({
      sql: `INSERT OR IGNORE INTO encrypted_dividends (id, user_id, encrypted_data, salt, iv, hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        createObjectId(),
        record.userId,
        record.encryptedData,
        record.salt,
        record.iv,
        record.hash,
        timestamp,
      ],
    })),
  );

  const inserted = results.reduce((count, result) => count + (result.meta?.changes ?? 0), 0);
  return { inserted, duplicated: records.length - inserted };
}

export async function listEncryptedDividends() {
  return (await all(`SELECT * FROM encrypted_dividends ORDER BY created_at DESC`)).map(mapEncryptedDividend);
}

export async function listEncryptedDividendsByUserId(userId) {
  return (await all(`SELECT * FROM encrypted_dividends WHERE user_id = ? ORDER BY created_at DESC`, [userId])).map(mapEncryptedDividend);
}

export async function deleteEncryptedDividendsByUserId(userId) {
  return execute(`DELETE FROM encrypted_dividends WHERE user_id = ?`, [userId]);
}