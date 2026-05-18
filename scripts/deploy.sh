#!/bin/bash
# Deploy script: build images and start services (no git operations)
# Migrations run automatically via DB_MIGRATIONS_RUN=true in docker-compose

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/isin-nest-deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $*"
    exit 1
}

cd "$PROJECT_DIR" || error "Cannot cd to $PROJECT_DIR"

# Step 1: Check .env exists and required vars are set
log "Checking .env configuration..."
[[ -f .env ]] || error ".env file not found. Copy .env.example and fill in required values."

check_var() {
    grep -q "^${1}=" .env && grep -v "^${1}=$" .env | grep -q "^${1}=" \
        || { log "WARNING: $1 is missing or empty in .env"; }
}
check_var DB_USER
check_var DB_PASS
check_var JWT_SECRET

# Step 2: Confirm Docker is running
log "Checking Docker daemon..."
docker info >/dev/null 2>&1 || error "Docker is not running. Start OrbStack / Docker Desktop first."

# Step 3: Build backend image
log "Building backend image..."
docker compose build backend 2>&1 | tee -a "$LOG_FILE"
log "Backend image built."

# Step 4: Build frontend image
log "Building frontend image..."
docker compose build frontend 2>&1 | tee -a "$LOG_FILE"
log "Frontend image built."

# Step 5: Start / update services (migrations run inside backend on startup)
log "Starting services with docker compose up -d..."
docker compose up -d 2>&1 | tee -a "$LOG_FILE"

# Step 6: Wait for backend to become healthy and verify logs
log "Waiting for services to stabilise (15s)..."
sleep 15

log "Container status:"
docker compose ps | tee -a "$LOG_FILE"

log "Recent backend logs (last 30 lines):"
docker compose logs --tail=30 backend 2>&1 | tee -a "$LOG_FILE"

# Check for migration errors in recent logs
if docker compose logs --tail=50 backend 2>&1 | grep -qi "migration.*error\|error.*migration"; then
    error "Migration errors detected in backend logs. Check logs above."
fi

log "Deploy complete. Full log: $LOG_FILE"
