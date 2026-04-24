#!/bin/bash

PROJECT_DIR="/Users/isin/dev/isin/isin_nest"
LOG_FILE="$HOME/Library/Logs/isin-nest-docker.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Waiting for OrbStack / Docker to be ready..."

# Wait until docker daemon is responsive (OrbStack must be running first)
RETRIES=0
until /usr/local/bin/docker info >/dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge 60 ]; then
        log "ERROR: Docker not available after 120 seconds, aborting."
        exit 1
    fi
    sleep 2
done

log "Docker is ready. Starting docker compose in $PROJECT_DIR..."

cd "$PROJECT_DIR" || { log "ERROR: Cannot cd to $PROJECT_DIR"; exit 1; }

/usr/local/bin/docker compose up -d 2>&1 | tee -a "$LOG_FILE"

log "docker compose up finished."
