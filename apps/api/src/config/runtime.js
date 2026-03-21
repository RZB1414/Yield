import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const runtimeStorage = new AsyncLocalStorage();
let globalRuntimeEnv = null;
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

export function runWithRuntimeContext(context, callback) {
  return runtimeStorage.run(context, callback);
}

export function getRuntimeContext() {
  return runtimeStorage.getStore() ?? null;
}

export function getCloudflareEnv() {
  return getRuntimeContext()?.env ?? globalRuntimeEnv;
}

export function setGlobalRuntimeEnv(env) {
  globalRuntimeEnv = env ?? null;

  if (!env) {
    return;
  }

  for (const key of ['CRYPTO_SECRET', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ALLOWED_ORIGINS']) {
    if (typeof env[key] === 'string') {
      process.env[key] = env[key];
    }
  }
}

export function getEnvironmentValue(name) {
  const env = getCloudflareEnv();

  if (env && env[name] !== undefined && env[name] !== null) {
    return env[name];
  }

  return process.env[name];
}