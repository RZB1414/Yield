import { all, execute, first, isUniqueConstraintError } from './db.js';
import { createObjectId, nowIso } from '../utils/ids.js';

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    userName: row.user_name,
    email: row.email,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createUserRecord({ userName, email, password }) {
  const id = createObjectId();
  const timestamp = nowIso();

  try {
    await execute(
      `INSERT INTO users (id, user_name, email, password, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userName, email, password, timestamp],
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      error.code = 'USER_EMAIL_CONFLICT';
    }

    throw error;
  }

  return mapUser({ id, user_name: userName, email, password, created_at: timestamp, updated_at: null });
}

export async function findUserByEmail(email) {
  return mapUser(await first(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]));
}

export async function findUserById(id) {
  return mapUser(await first(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]));
}

export async function listUsers() {
  return (await all(`SELECT * FROM users ORDER BY created_at DESC`)).map(mapUser);
}