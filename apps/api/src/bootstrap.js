import { getCloudflareEnv, getEnvironmentValue } from './config/runtime.js';

let bootstrapPromise;

export async function initializeApp() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const env = getCloudflareEnv();

      if (!env?.DB) {
        throw new Error('Cloudflare D1 binding "DB" is not configured.');
      }

      if (!getEnvironmentValue('JWT_SECRET')) {
        throw new Error('JWT_SECRET is not configured.');
      }

      if (!getEnvironmentValue('CRYPTO_SECRET')) {
        throw new Error('CRYPTO_SECRET is not configured.');
      }

      return true;
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}