import CryptoJS from 'crypto-js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { getEnvironmentValue } from '../config/runtime.js';

let moduleDirectory = process.cwd();

try {
  moduleDirectory = fileURLToPath(new URL('.', import.meta.url));
} catch {
  moduleDirectory = process.cwd();
}

for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(process.cwd(), 'apps/api/.env.local'),
  resolve(moduleDirectory, '../../.env'),
  resolve(moduleDirectory, '../../.env.local'),
]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

function getRequiredSecret(name) {
  const value = getEnvironmentValue(name);

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getCryptoSecret() {
  return getRequiredSecret('CRYPTO_SECRET');
}

export function getJwtSecret() {
  return getRequiredSecret('JWT_SECRET');
}

export function encryptValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return CryptoJS.AES.encrypt(String(value), getCryptoSecret()).toString();
}

export function decryptValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(String(value), getCryptoSecret()).toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch {
    return null;
  }
}

export function decryptNumber(value) {
  const decrypted = decryptValue(value);

  if (decrypted === null) {
    return null;
  }

  const parsed = Number.parseFloat(decrypted);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createBlindIndex(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return CryptoJS.HmacSHA256(String(value), getCryptoSecret()).toString(CryptoJS.enc.Hex);
}

export function looksEncrypted(value) {
  return typeof value === 'string' && /^U2FsdGVkX1/i.test(value);
}