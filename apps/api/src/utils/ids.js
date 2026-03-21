import { randomBytes } from 'node:crypto';

export function createObjectId() {
  const timestampHex = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomHex = randomBytes(8).toString('hex');
  return `${timestampHex}${randomHex}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function toIsoDate(value) {
  // If already a YYYY-MM-DD string, return as-is to avoid timezone shifts
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  // Return date-only to avoid timezone issues
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toMonthKey(value) {
  return new Date(value).toISOString().slice(0, 7);
}