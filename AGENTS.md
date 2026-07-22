# AGENTS.md — Context Audit

## Project Classification

- **Type:** factory-output
- **Local repo:** /Users/hekton/Development/hekton/factory-output/context-audit
- **Vault:** /Users/hekton/vaults/hekton-mind-palace/20-projects/factory-output/context-audit
- **Vault mutation allowed:** see `vault_mutation_allowed` in `.hekton/project.yaml` (authoritative)
- **Owner:** dermdunc

## Shared Agent Rules

Follow all rules in `~/hekton/AGENTS.md` — including the **Hekton Documentation Contract**, **Ongoing Hekton Project Operating Rules**, and traceability requirements.

This project is classified as **factory-output**. All agents must:
1. Work on a short-lived `agent/<agent-name>/<task-slug>` branch and never commit directly to `main`/`master` — see `~/hekton/.rules/git-contract.md`
2. Read `.hekton/project.yaml` before making structural changes
3. Read `docs/project-walkthrough.md` before structural changes
4. Stay within `/Users/hekton/Development/hekton/factory-output/context-audit` for code changes
5. Update `docs/decisions.md` for any significant design decisions
6. Append to `docs/session-log.md` at end of every session
7. Update `docs/next-actions.md` when the work queue changes
8. Not promote this project to a new lifecycle stage without user confirmation

## Traceability Artefacts

All of the following must be kept current:

| Artefact | Location |
|---|---|
| `.hekton/project.yaml` | repo root |
| `docs/session-log.md` | repo docs/ |
| `docs/decisions.md` | repo docs/ |
| `docs/risks.md` | repo docs/ |
| `docs/operating-model.md` | repo docs/ |
| `docs/project-walkthrough.md` | repo docs/ |
| `docs/next-actions.md` | repo docs/ |
| `index.md` (project card) | vault control plane |
| `session-log.md` (brain learning layer) | vault control plane |

## Session Closeout & Radar

End every session by running `bash ~/hekton/scripts/end-session.sh` from anywhere inside this repo. It writes the session log and captures Blog Radar (`--blog-worthy`) and Gremlin Radar (`--gremlin-radar`) signals into the central ledgers under `~/hekton/state/`. A project-local `scripts/end-session.sh`, if one is ever added, must keep capturing Blog Radar signals via `~/hekton/scripts/capture-blog-signal.sh`.
