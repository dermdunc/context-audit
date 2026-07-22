#!/usr/bin/env bash
# sync-mirror-to-vault.sh: thin wrapper around Mirror Gremlin.
#
# The guarded sync itself lives in Mirror Gremlin
# (~/Development/hekton/platform/tools/mirror-gremlin), which gates every live-vault
# write behind a staged safety loop: preflight (vault-is-git-repo, mirror_path clean,
# drift check, vault_mutation_allowed present) -> grant (flip the flag true, scoped to
# this run) -> sync -> restore (flip back to false) -> confirm non-breaking -> remedy
# (revert) if confirmation fails. This script only resolves this project's id and
# calls it, so every scaffolded project keeps the same
# `scripts/sync-mirror-to-vault.sh` entry point it always has.
#
# The Gremlin is copy-only — it never commits the vault. Review and commit deliberately:
#   just commit-vault
#
# Usage:
#   scripts/sync-mirror-to-vault.sh            # dry-run preview (default, no writes)
#   scripts/sync-mirror-to-vault.sh --apply    # guarded sync + write
set -uo pipefail

MODE="--dry-run"
case "${1:-}" in
  --apply) MODE="--apply" ;;
  --dry-run|"") MODE="--dry-run" ;;
  *) echo "Unknown option: $1" >&2; echo "Usage: $0 [--dry-run|--apply]" >&2; exit 1 ;;
esac

ROOT=""
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [[ "$dir" != "/" ]]; do
  if [[ -f "$dir/.hekton/project.yaml" ]]; then ROOT="$dir"; break; fi
  dir="$(dirname "$dir")"
done
if [[ -z "$ROOT" ]]; then
  echo "ERROR: no .hekton/project.yaml found above this script." >&2
  exit 1
fi

PROJECT="$(grep '^project_name:' "$ROOT/.hekton/project.yaml" | sed 's/project_name: *//' | tr -d '"')"
if [[ -z "$PROJECT" ]]; then
  echo "ERROR: project_name not found in $ROOT/.hekton/project.yaml" >&2
  exit 1
fi

MIRROR_GREMLIN="${HEKTON_MIRROR_GREMLIN:-$HOME/Development/hekton/platform/tools/mirror-gremlin/run.sh}"
if [[ ! -x "$MIRROR_GREMLIN" ]]; then
  echo "ERROR: Mirror Gremlin runner not found or not executable: $MIRROR_GREMLIN" >&2
  exit 1
fi

echo "=== Mirror -> live vault sync (via Mirror Gremlin): $PROJECT ==="
echo ""

exec "$MIRROR_GREMLIN" sync --project "$PROJECT" "$MODE"
