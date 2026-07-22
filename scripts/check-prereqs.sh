#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.project-setup/logs"
LOG_FILE="$LOG_DIR/check-prereqs.log"

usage() {
  echo "Usage: $0 [--dry-run]"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

log() {
  echo "$1"
  if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p "$LOG_DIR"
    printf "%s %s\n" "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$1" >> "$LOG_FILE"
  fi
}

log "Checking project prerequisites"

missing=0
for cmd in git bash sed date mkdir printf; do
  if command -v "$cmd" >/dev/null 2>&1; then
    log "OK: $cmd"
  else
    log "MISSING: $cmd"
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  log "Prerequisite check failed"
  exit 1
fi

log "Prerequisite check passed"
