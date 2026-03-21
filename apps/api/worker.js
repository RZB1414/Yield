import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import app from './src/app.js';
import { initializeApp } from './src/bootstrap.js';
import { runWithRuntimeContext, setGlobalRuntimeEnv } from './src/config/runtime.js';
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

const server = createServer((req, res) => {
  try {
    app(req, res);
  } catch (error) {
    console.error('Worker request initialization failed:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Worker initialization failed.' }));
  }
});

server.listen(8080);
const workerHandler = httpServerHandler({ port: 8080 });

export default {
  async fetch(request, env, ctx) {
    setGlobalRuntimeEnv(env);
    return runWithRuntimeContext({ env, ctx }, async () => {
      await ensureInitialized();
      return workerHandler.fetch(request, env, ctx);
    });
  },
  async scheduled(controller, env, ctx) {
    setGlobalRuntimeEnv(env);
    return runWithRuntimeContext({ env, ctx }, async () => {
      try {
        await ensureInitialized();
        ctx.waitUntil(runDailySnapshot());
      } catch (error) {
        console.error('Scheduled snapshot failed to initialize:', error);
        throw error;
      }
    });
  },
};