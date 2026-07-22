# CLAUDE.md — Context Audit

## Project Classification

- **Type:** factory-output
- **Name:** context-audit
- **Title:** Context Audit
- **Local repo:** /Users/hekton/Development/hekton/factory-output/context-audit
- **Vault control plane:** /Users/hekton/vaults/hekton-mind-palace/20-projects/factory-output/context-audit
- **Lifecycle stage:** active
- **Promotion target:** none
- **Privacy boundary:** public
- **Owner:** dermdunc
- **Vault mutation allowed:** see `vault_mutation_allowed` in `.hekton/project.yaml` (authoritative)

## Agent Rules

Follow all rules in `~/hekton/CLAUDE.md` — including the **Hekton Repository Taxonomy**, **Hekton Documentation Contract**, and **Ongoing Hekton Project Operating Rules** sections.

Specific to this project:
- Work on a short-lived branch `agent/<agent-name>/<task-slug>` — never commit directly to `main`/`master`; open a PR for review. See `~/hekton/.rules/git-contract.md`.
- Classification is **factory-output** — respect the corresponding naming and path conventions
- Inspect `.hekton/project.yaml` before making structural changes
- Do not create files outside `/Users/hekton/Development/hekton/factory-output/context-audit` without confirmation
- Do not write to the vault without explicit authorisation — check `vault_mutation_allowed` in `.hekton/project.yaml` first (authoritative; do not trust a restated value elsewhere)
- Record all design decisions in `docs/decisions.md`
- Keep risks current in `docs/risks.md` and `.hekton/risk-register.yaml`
- Append to `docs/session-log.md` at end of every session

## Hekton Documentation Contract

Agents must:
- Inspect `.hekton/project.yaml` before structural changes
- Update `docs/session-log.md` for material changes
- Record meaningful decisions in `docs/decisions.md`
- Update `docs/next-actions.md`
- Avoid mutating the Obsidian vault unless explicitly authorised
- Summarise changed files, decisions, assumptions, risks, and next actions before finishing

## Plain-English Walkthrough Contract

After material sessions, create or update:
- `docs/session-log.md` for technical traceability
- `docs/walkthroughs/YYYY-MM-DD-session-title.md` for non-technical understanding
- `docs/project-walkthrough.md` for the rolling project explainer
- `mind-palace/` equivalents where available

## Ongoing Hekton Project Operating Rules

Before making changes, read: `.hekton/project.yaml`, `README.md`, `docs/project-walkthrough.md`, `docs/session-log.md`, `docs/decisions.md`, `docs/next-actions.md`, and `AGENTS.md`.

End every session with: changed files, what changed, why, decisions, assumptions, risks, next actions, validation status, mind-palace updated (yes/no/proposed).

## Session Closeout & Radar

Close every session by running the factory closeout script from anywhere inside this repo:

```bash
bash ~/hekton/scripts/end-session.sh
```

It writes the session log and captures **Blog Radar** (`--blog-worthy "story angle"`) and **Gremlin Radar** (`--gremlin-radar "automation idea"`) signals into the central ledgers under `~/hekton/state/`. If this session produced anything worth writing about publicly, capture the angle — signals feed The Hekton Field Journal backlog.

If this project ever grows its own `scripts/end-session.sh`, it must keep capturing Blog Radar signals via `~/hekton/scripts/capture-blog-signal.sh` — a local closeout script must never silently drop the radar hook.
