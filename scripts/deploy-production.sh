#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-alazab-nexus}"
DOMAIN="${DOMAIN:-products.alazab.com}"
APP_DIR="${APP_DIR:-/opt/alazab-nexus}"
REPO_URL="${REPO_URL:-https://github.com/AlazabDev/alazab-nexus.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_PORT="${APP_PORT:-3000}"
SERVICE_NAME="${SERVICE_NAME:-alazab-nexus}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd git
require_cmd node
require_cmd npm
require_cmd nginx
require_cmd systemctl

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@11.6.0 --activate
fi

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$DEPLOY_BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

if [ ! -f "$APP_DIR/.env.production" ]; then
  cat >&2 <<EOF
Missing $APP_DIR/.env.production
Required production variables:
  VITE_SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ALLOWED_ORIGINS=https://$DOMAIN
  API_RATE_LIMIT_PER_MINUTE=120
  NODE_ENV=production
Optional AI variables:
  AZURE_OPENAI_ENDPOINT
  AZURE_OPENAI_API_KEY
  AZURE_OPENAI_API_VERSION
  AZURE_OPENAI_DEPLOYMENT
EOF
  exit 1
fi

pnpm install --frozen-lockfile
pnpm run ci

cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Alazab Nexus production app
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env.production
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=HOST=0.0.0.0
ExecStart=$(command -v pnpm) run preview -- --host 0.0.0.0 --port $APP_PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/nginx/sites-available/${DOMAIN} <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;

  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
EOF

ln -sfn "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
nginx -t
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl reload nginx

echo "Deployment completed for $APP_NAME on $DOMAIN from branch $DEPLOY_BRANCH"
