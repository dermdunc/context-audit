#!/usr/bin/env bash
# setup-hooks.sh: Install git hooks for this project.
#
# Installs a pre-push hook that warns when the repo-local mind-palace mirror has
# drifted from repo docs. Run once after cloning or after scaffolding.
#
# Usage: scripts/setup-hooks.sh [--force]
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT/.git/hooks"
FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

if [[ ! -d "$HOOKS_DIR" ]]; then
  echo "ERROR: $HOOKS_DIR not found; is this a git repo?" >&2
  exit 1
fi

DEST="$HOOKS_DIR/pre-push"
if [[ -f "$DEST" && "$FORCE" == false ]]; then
  echo "pre-push already exists. Use --force to overwrite."
  exit 0
fi

cat > "$DEST" <<'HOOK'
#!/usr/bin/env bash
# pre-push: warn if the mind-palace mirror has drifted from repo docs.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"
if [[ -x "$ROOT/scripts/check-mirror-drift.sh" ]]; then
  if ! "$ROOT/scripts/check-mirror-drift.sh" --check; then
    echo ''
    echo 'WARN: mirror has drifted. Update mind-palace/ summaries soon.'
    echo 'Warning only; push proceeds. Refresh with: scripts/check-mirror-drift.sh'
    echo ''
  fi
fi
HOOK

chmod +x "$DEST"
echo "Installed pre-push mirror drift check in $HOOKS_DIR"
