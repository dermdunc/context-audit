# Context Audit

**Classification:** factory-output
**Lifecycle:** active
**Owner:** dermdunc
**Promotion target:** `none`

> A CLI that audits a docs/context folder for approximate token cost, redundancy between files, and staleness, stating its own limits plainly rather than overclaiming precision.

## Implementation Status

- Scaffolded 2026-07-22 — initial setup in progress.

## Documentation Contract

Agents working here must inspect `.hekton/project.yaml` before structural changes, keep `docs/session-log.md` current, record meaningful design decisions in `docs/decisions.md`, and update `docs/next-actions.md` when the work queue changes.

Vault mutation policy: see `vault_mutation_allowed` in `.hekton/project.yaml` (authoritative; defaults to false at scaffold time). The repo-local `mind-palace/` folder is only a mirror draft; do not write to the live vault unless `.hekton/project.yaml` says mutation is allowed and it is explicitly authorised in-session.

## Quick Start

```bash
# Add project-specific commands here
```

## Key Docs

- [Session Log](docs/session-log.md)
- [Decisions](docs/decisions.md)
- [Risks](docs/risks.md)
- [Project Walkthrough](docs/project-walkthrough.md)
- [Next Actions](docs/next-actions.md)
- [Operating Model](docs/operating-model.md)
- [Human Understanding Check](docs/human-understanding-check.md)
- [Depth Decision](docs/depth-decision.md)
- [Retire / Promote Review](docs/retire-promote-review.md)
