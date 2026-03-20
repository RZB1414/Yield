# Personal Yield

Full-stack application for portfolio tracking, dividends and investment snapshots.

## Monorepo Structure

This repository uses npm workspaces and is organized under `apps/`.

```text
Personal-Yield/
├── apps/
│   ├── api/   -> Express API prepared for local Node.js and Cloudflare Workers
│   └── web/   -> React frontend prepared for Cloudflare Pages
├── scripts/   -> local helper scripts
└── package.json
```

## Local Development

Prerequisites:
- Node.js 20+
- npm 10+
- MongoDB Atlas or another reachable MongoDB deployment

Install dependencies:

```bash
npm install
```

Create these local env files:
- `apps/api/.env` from `apps/api/.env.example`
- `apps/web/.env` from `apps/web/.env.example`

Run locally:

```bash
npm run dev:server
npm run dev:client
```

## Cloudflare Deployment

### 1. Save your Cloudflare API token locally

Create the file `/.env.cloudflare` in the repository root from `/.env.cloudflare.example` and fill it with:

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=a928f4bf274d697272e1ddf90cb49798
```

This file is ignored by Git.

### 2. Configure Worker secrets for the API

Create `apps/api/.dev.vars` from `apps/api/.dev.vars.example` for local `wrangler dev`.

Validate your Cloudflare authentication first:

```bash
npm run cf:whoami
```

To save runtime secrets in the Worker:

```bash
node ./scripts/run-with-env.mjs ./.env.cloudflare -- npm run cf:secret --workspace=@personal-yield/server -- MONGO_URI
node ./scripts/run-with-env.mjs ./.env.cloudflare -- npm run cf:secret --workspace=@personal-yield/server -- JWT_SECRET
node ./scripts/run-with-env.mjs ./.env.cloudflare -- npm run cf:secret --workspace=@personal-yield/server -- JWT_REFRESH_SECRET
node ./scripts/run-with-env.mjs ./.env.cloudflare -- npm run cf:secret --workspace=@personal-yield/server -- CRYPTO_SECRET
```

Optional Worker variable for CORS:

```bash
node ./scripts/run-with-env.mjs ./.env.cloudflare -- wrangler secret put CORS_ALLOWED_ORIGINS --config apps/api/wrangler.toml
```

Suggested value:

```text
https://personal-yield-web.pages.dev,https://<your-custom-pages-domain>
```

### 3. Deploy the API to Cloudflare Workers

Files added for this flow:
- `apps/api/wrangler.toml`
- `apps/api/worker.js`

The API now runs on Cloudflare Workers using Cloudflare's Node.js HTTP server compatibility layer, which allows the existing Express app to be reused.

Local Worker dev:

```bash
npm run cf:api:dev
```

### 4. Deploy the frontend to Cloudflare Pages

Files added for this flow:
- `apps/web/wrangler.toml`
- `apps/web/public/_redirects`

Before deploying the frontend, set `REACT_APP_API_URL` in the Cloudflare Pages project to your Worker URL.

Example:

```text
https://personal-yield-api.<your-subdomain>.workers.dev
```

Then deploy in this order:

```bash
npm run cf:deploy:api
npm run cf:deploy:web
```

The `_redirects` file keeps the CRA app working with client-side routing on Pages.

## Useful Commands

```bash
npm run build:client
npm run snapshot
npm run seed:snapshots
npm run test:client
npm run cf:whoami
npm run cf:deploy:api
npm run cf:deploy:web
```
