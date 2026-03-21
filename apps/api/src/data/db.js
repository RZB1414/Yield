import { getCloudflareEnv } from '../config/runtime.js';

function getDb() {
  const env = getCloudflareEnv();

  if (!env?.DB) {
    throw new Error('Cloudflare D1 binding "DB" is not configured for this request.');
  }

  return env.DB;
}

export async function execute(sql, params = []) {
  return getDb().prepare(sql).bind(...params).run();
}

export async function first(sql, params = []) {
  const row = await getDb().prepare(sql).bind(...params).first();
  return row ?? null;
}

export async function all(sql, params = []) {
  const result = await getDb().prepare(sql).bind(...params).all();
  return result.results ?? [];
}

export async function batch(statements) {
  const db = getDb();
  const preparedStatements = statements.map(({ sql, params = [] }) => db.prepare(sql).bind(...params));
  return db.batch(preparedStatements);
}

export function isUniqueConstraintError(error) {
  return Boolean(error?.message && /unique constraint failed|UNIQUE constraint failed|D1_ERROR/i.test(error.message));
}