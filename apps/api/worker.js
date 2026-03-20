import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import app from './src/app.js';
import { initializeApp } from './src/bootstrap.js';
import { runDailySnapshot } from './src/jobs/dailySnapshotJob.js';

let startupPromise;

async function ensureInitialized() {
  if (!startupPromise) {
    startupPromise = initializeApp().catch((error) => {
      startupPromise = null;
      throw error;
    });
  }

  return startupPromise;
}

const server = createServer(async (req, res) => {
  try {
    await ensureInitialized();
    app(req, res);
  } catch (error) {
    console.error('Worker request initialization failed:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Worker initialization failed.' }));
  }
});

server.listen(8080);

export default {
  fetch: httpServerHandler(server),
  async scheduled(controller, env, ctx) {
    try {
      await ensureInitialized();
      ctx.waitUntil(runDailySnapshot());
    } catch (error) {
      console.error('Scheduled snapshot failed to initialize:', error);
      throw error;
    }
  },
};