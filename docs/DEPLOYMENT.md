# Alazab Nexus — Deployment Guide

This is the canonical deployment guide for Alazab Nexus.

## Production identity

| Item              | Value                                           |
| ----------------- | ----------------------------------------------- |
| Application       | `alazab-nexus`                                  |
| Repository        | `https://github.com/AlazabDev/alazab-nexus.git` |
| Production domain | `products.alazab.com`                           |
| Package manager   | `pnpm@11.6.0`                                   |
| Runtime           | Node.js 22 recommended                          |

## Required environment variables

Use the publishable key names consumed by the application code. Do not use the old `VITE_SUPABASE_ANON_KEY` name in new deployments.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=https://products.alazab.com
API_RATE_LIMIT_PER_MINUTE=120
NODE_ENV=production
```

Optional Azure OpenAI variables:

```env
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT=
```

Azure AI Foundry product agent variables:

```env
AZURE_FOUNDRY_API_KEY=
AZURE_FOUNDRY_AGENT_ENDPOINT=https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway/agents/az-agent-prod/endpoint/protocols/openai/responses
```

`AZURE_FOUNDRY_API_KEY` is server-only and must not be exposed as a `VITE_*` variable.

## Pre-deployment checklist

Run the gate before promotion:

```bash
corepack enable
corepack prepare pnpm@11.6.0 --activate
pnpm install --frozen-lockfile
pnpm run ci
```

The current `ci` script runs:

```bash
pnpm run typecheck && pnpm run lint && pnpm run build
```

## Server deployment

Review/staging deployment from `codex`:

```bash
sudo DEPLOY_BRANCH=codex bash scripts/deploy-production.sh
```

Final deployment after review and merge:

```bash
sudo DEPLOY_BRANCH=main bash scripts/deploy-production.sh
```

The script uses:

```bash
APP_NAME=alazab-nexus
DOMAIN=products.alazab.com
APP_DIR=/opt/alazab-nexus
REPO_URL=https://github.com/AlazabDev/alazab-nexus.git
APP_PORT=3000
```

## Docker deployment

```bash
docker build -t alazab-nexus .
docker run --env-file .env.production -p 3000:3000 alazab-nexus
```

## Vercel deployment

Use these settings only if deploying through Vercel:

| Setting           | Value                            |
| ----------------- | -------------------------------- |
| Git repository    | `AlazabDev/alazab-nexus`         |
| Project name      | `alazab-nexus`                   |
| Framework preset  | Vite / TanStack Start compatible |
| Build command     | `pnpm build`                     |
| Output directory  | `dist`                           |
| Production domain | `products.alazab.com`            |

Configure the same environment variables listed above.

## Public product pages

The public product surface includes:

```txt
/products
/products/$azCode
/catalog
/catalog/$azCode
```

`/products` is the new public product index. `/products/$azCode` is the new dynamic product template route. `/catalog` remains the advanced catalog experience.

## Product agent endpoint

The Azure Foundry product agent is exposed server-side through:

```txt
POST /api/agent/v1/product-agent
```

The endpoint requires `x-api-key` and forwards requests to `az-agent-prod` without exposing `AZURE_FOUNDRY_API_KEY` to the browser.

## Post-deployment verification

Verify:

```bash
curl -I https://products.alazab.com
curl -I https://products.alazab.com/products
curl -I https://products.alazab.com/api/public/v1/products
```

Also verify:

- Supabase connection works.
- Auth redirects work.
- API CORS returns `Access-Control-Allow-Origin` for `https://products.alazab.com`.
- Public product/pricing endpoints do not expose purchase cost fields.
- Server logs contain no missing environment variable errors.
- `AZURE_FOUNDRY_API_KEY` exists in development, preview, and production environments.

## Rollback

Use a known-good branch or commit:

```bash
sudo DEPLOY_BRANCH=main bash scripts/deploy-production.sh
```

For emergency rollback to a specific tag or branch, set `DEPLOY_BRANCH` to that ref if it exists on the remote.

## Notes

- `scripts/deploy-production.sh` is the canonical server deployment script.
- Older names such as `AzProud`, `az-product`, `azproud.alazab.com`, and `uberfiix/...` must not be used for new production deployment.
- `pnpm test` currently maps to typecheck until a real test suite is added.
