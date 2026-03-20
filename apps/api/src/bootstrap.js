import { dbConnection } from './config/dbConnect.js';
import { encryptedDividends } from './models/EncryptedDividends.js';
import { btgDividends } from './models/BtgDividends.js';
import { Snapshot } from './models/Snapshot.js';

let bootstrapPromise;

async function syncIndexes() {
  await encryptedDividends.syncIndexes();
  const encryptedIndexes = await encryptedDividends.collection.getIndexes();

  await btgDividends.syncIndexes();
  const btgIndexes = await btgDividends.collection.getIndexes();

  await Snapshot.syncIndexes();
  const snapshotIndexes = await Snapshot.collection.getIndexes();

  console.log('Indexes synchronized successfully:', {
    encryptedIndexes,
    btgIndexes,
    snapshotIndexes,
  });
}

export async function initializeApp() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await dbConnection();
      await syncIndexes();
      return true;
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}