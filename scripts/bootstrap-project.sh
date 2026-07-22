#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.project-setup/logs"
LOG_FILE="$LOG_DIR/bootstrap-project.log"

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

log "Bootstrapping project"
if [ "$DRY_RUN" -eq 1 ]; then
  log "Mode: dry-run"
  "$ROOT_DIR/scripts/check-prereqs.sh" --dry-run
else
  log "Mode: apply"
  mkdir -p "$ROOT_DIR/.project-setup/logs"
  "$ROOT_DIR/scripts/check-prereqs.sh"
fi

log "TODO: add project-specific setup steps after they are documented."
