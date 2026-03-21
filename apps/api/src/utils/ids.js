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
  return new Date(value).toISOString();
}

export function toMonthKey(value) {
  return new Date(value).toISOString().slice(0, 7);
}