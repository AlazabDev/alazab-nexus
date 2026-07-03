# Alazab Nexus — Production Readiness Notes

This document is the current production reference for the `codex` branch changes.

## Deployment target

- Application name: `alazab-nexus`
- Production domain: `products.alazab.com`
- Repository: `https://github.com/AlazabDev/alazab-nexus.git`
- Package manager: `pnpm@11.6.0`

## Environment naming

Use the Supabase publishable key variable names used by the application code:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- server-side Supabase service role variable configured only in the hosting environment
- `ALLOWED_ORIGINS=https://products.alazab.com`
- `API_RATE_LIMIT_PER_MINUTE=120`
- `NODE_ENV=production`

Optional Azure OpenAI settings should be configured only in the hosting environment.

## Validation commands

Run these before promoting a branch:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run ci
```

`pnpm test` currently maps to `pnpm run typecheck` until a real test suite and lockfile-backed test dependency are added.

## CORS behavior

- Development without `ALLOWED_ORIGINS`: wildcard is allowed.
- Production without `ALLOWED_ORIGINS`: responses are locked down.
- Production with `ALLOWED_ORIGINS`: default JSON responses use the first allowed origin; handlers should still prefer `json(payload, status, { request })` for exact origin matching.

## Canonical deployment script

Use the new script for review deployments:

```bash
sudo DEPLOY_BRANCH=codex bash scripts/deploy-production.sh
```

For final production after review:

```bash
sudo DEPLOY_BRANCH=main bash scripts/deploy-production.sh
```

The older `scripts/deploy-ubiquiti.sh` is not the canonical production script after these changes.

## Docker

A production-oriented `Dockerfile` is included. Build locally with:

```bash
docker build -t alazab-nexus:codex .
docker run --env-file .env.production -p 3000:3000 alazab-nexus:codex
```
