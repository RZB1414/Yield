import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

const wranglerArgs = process.argv.slice(2);

if (wranglerArgs.length === 0) {
  console.error('Usage: node ./scripts/wrangler-with-cloudflare-env.mjs <wrangler args...>');
  process.exit(1);
}

const workspaceRoot = resolve(process.cwd(), '../..');
const envPath = resolve(workspaceRoot, '.env.cloudflare');
const loadedEnv = parseEnvFile(envPath);

const child = spawn('npx', ['wrangler@4.75.0', ...wranglerArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...loadedEnv,
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});