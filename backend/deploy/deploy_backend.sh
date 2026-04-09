#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/Board2Hack/backend"
SERVICE_NAME="tiki-topple-backend"
HEALTH_URL="http://127.0.0.1:3000/health"
SKIP_TESTS="false"

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
  --skip-tests            Skip npm test step
  --help                  Show this help

Example:
  sudo bash deploy/deploy_backend.sh
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

log "Applying database migrations"
npx prisma migrate deploy

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

log "Deployment successful"
