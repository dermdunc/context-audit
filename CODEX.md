# CODEX.md — Context Audit

## Project Classification

- **Type:** factory-output
- **Name:** context-audit
- **Local repo:** /Users/hekton/Development/hekton/factory-output/context-audit
- **Vault control plane:** /Users/hekton/vaults/hekton-mind-palace/20-projects/factory-output/context-audit
- **Lifecycle stage:** active
- **Promotion target:** none
- **Privacy boundary:** public
- **Owner:** dermdunc

## Codex Rules

Follow all rules in `~/hekton/CODEX.md` — including the **Hekton Repository Taxonomy**, **Hekton Documentation Contract**, and **Ongoing Hekton Project Operating Rules** sections.

Before coding:
1. Work on a short-lived `agent/<agent-name>/<task-slug>` branch and never commit directly to `main`/`master` — see `~/hekton/.rules/git-contract.md`
2. Read `.hekton/project.yaml` to confirm classification and paths
3. Read `docs/project-walkthrough.md` for plain-English project context
4. Read `docs/session-log.md` for recent session history
5. Read `docs/decisions.md` for prior decisions that constrain this work
6. Read `docs/next-actions.md` for the current work queue
7. Do not add a `hekton-` prefix to files unless this is a platform repo
8. Do not commit vault paths or local filesystem paths to git

At end of session, output: changed files, decisions, assumptions, risks, next actions, validation status, vault updated (yes/no) — then run `bash ~/hekton/scripts/end-session.sh` (works from anywhere inside this repo) to log the session and capture Blog Radar / Gremlin Radar signals.
