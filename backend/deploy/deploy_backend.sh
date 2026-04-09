#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/Board2Hack/backend"
SERVICE_NAME="tiki-topple-backend"
HEALTH_URL="http://127.0.0.1:3000/health"
SKIP_TESTS="false"
DOMAIN=""
SETUP_NGINX="false"
SETUP_SSL="false"
LETSENCRYPT_EMAIL=""

NGINX_SITE_PATH=""

log() {
  printf "[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*"
}

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --app-dir <path>        Backend directory (default: $APP_DIR)
  --service <name>        systemd service name (default: $SERVICE_NAME)
  --health-url <url>      Health endpoint URL (default: $HEALTH_URL)
  --domain <fqdn>         Domain for Nginx/HTTPS setup (example: api.example.com)
  --setup-nginx           Configure Nginx reverse proxy for --domain
  --setup-ssl             Configure HTTPS certificate via Certbot for --domain
  --email <email>         Email for Let's Encrypt (required with --setup-ssl)
  --skip-tests            Skip npm test step
  --help                  Show this help

Example:
  sudo bash deploy/deploy_backend.sh
  sudo bash deploy/deploy_backend.sh --domain api.example.com --setup-nginx --setup-ssl --email you@example.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --service)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --health-url)
      HEALTH_URL="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --setup-nginx)
      SETUP_NGINX="true"
      shift
      ;;
    --setup-ssl)
      SETUP_SSL="true"
      shift
      ;;
    --email)
      LETSENCRYPT_EMAIL="$2"
      shift 2
      ;;
    --skip-tests)
      SKIP_TESTS="true"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory not found: $APP_DIR"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed."
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl is required but not installed."
  exit 1
fi

if [[ "$SETUP_NGINX" == "true" || "$SETUP_SSL" == "true" ]]; then
  if [[ -z "$DOMAIN" ]]; then
    echo "--domain is required when using --setup-nginx or --setup-ssl"
    exit 1
  fi
  NGINX_SITE_PATH="/etc/nginx/sites-available/$SERVICE_NAME"
fi

if [[ "$SETUP_SSL" == "true" && -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "--email is required when using --setup-ssl"
  exit 1
fi

log "Starting deployment"
log "App directory: $APP_DIR"
log "Service: $SERVICE_NAME"

cd "$APP_DIR"

log "Fetching latest code"
git fetch --all --prune
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git pull origin "$CURRENT_BRANCH"

log "Installing dependencies"
npm ci

log "Generating Prisma client"
npm run prisma:generate

if [[ -d "prisma/migrations" ]] && find "prisma/migrations" -mindepth 1 -maxdepth 1 -type d | read -r _; then
  log "Applying database migrations"
  npx prisma migrate deploy
else
  log "No Prisma migrations found. Syncing schema with prisma db push"
  npx prisma db push
fi

log "Building application"
npm run build

if [[ "$SKIP_TESTS" != "true" ]]; then
  log "Running tests"
  npm run test
else
  log "Skipping tests"
fi

log "Restarting service"
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager

log "Waiting for service warm-up"
sleep 2

log "Checking health endpoint: $HEALTH_URL"
if ! curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null; then
  echo "Health check failed: $HEALTH_URL"
  echo "Recent service logs:"
  sudo journalctl -u "$SERVICE_NAME" -n 80 --no-pager || true
  exit 1
fi

if [[ "$SETUP_NGINX" == "true" ]]; then
  log "Configuring Nginx for domain: $DOMAIN"
  sudo tee "$NGINX_SITE_PATH" >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  sudo ln -sf "$NGINX_SITE_PATH" "/etc/nginx/sites-enabled/$SERVICE_NAME"
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl reload nginx
fi

if [[ "$SETUP_SSL" == "true" ]]; then
  log "Installing Certbot packages"
  sudo apt-get update
  sudo apt-get install -y certbot python3-certbot-nginx

  log "Requesting HTTPS certificate for $DOMAIN"
  sudo certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$LETSENCRYPT_EMAIL" \
    -d "$DOMAIN" \
    --redirect

  log "Checking HTTPS health endpoint"
  if ! curl -fsS --max-time 15 "https://$DOMAIN/health" >/dev/null; then
    echo "HTTPS health check failed: https://$DOMAIN/health"
    echo "Nginx errors:"
    sudo tail -n 80 /var/log/nginx/error.log || true
    exit 1
  fi
fi

log "Deployment successful"
