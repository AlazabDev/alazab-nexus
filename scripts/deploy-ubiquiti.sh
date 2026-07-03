#!/usr/bin/env bash
set -euo pipefail

# Legacy compatibility wrapper.
# Canonical production deployment lives in scripts/deploy-production.sh.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export APP_NAME="${APP_NAME:-alazab-nexus}"
export DOMAIN="${DOMAIN:-products.alazab.com}"
export APP_DIR="${APP_DIR:-/opt/alazab-nexus}"
export REPO_URL="${REPO_URL:-https://github.com/AlazabDev/alazab-nexus.git}"
export DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
export APP_PORT="${APP_PORT:-3000}"
export SERVICE_NAME="${SERVICE_NAME:-alazab-nexus}"

exec bash "$SCRIPT_DIR/deploy-production.sh"
