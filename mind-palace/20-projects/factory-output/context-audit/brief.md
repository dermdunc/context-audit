# Brief: Context Audit

> A CLI that audits a docs/context folder for approximate token cost, redundancy between files, and staleness, stating its own limits plainly rather than overclaiming precision.

## Problem

A project's context system (decision logs, session logs, a Skills directory) grows without any
equivalent of the code review that keeps the codebase itself honest. Nobody notices when a docs
folder gets too large to load cheaply, when two files drift into near-duplicates, or when a file
hasn't been touched in months and quietly went stale - until an agent or a human wastes real
tokens or real trust on it.

## Outcome

A zero-dependency CLI that reports, per file in any docs/context folder: an approximate token
cost, a redundancy signal against every other file, and staleness (preferring real git history
over filesystem mtime, which a fresh clone resets). Every measurement is explicitly disclosed as
an approximation, not presented as exact - matching `half-life`'s own review-panel discipline
(never claim more precision than the method actually has). Ships as the runnable companion
artefact for Agentic Tekton's "Context Is the Architecture" essay.

## Constraints

- No source to extract from (confirmed `half-life` has no measurement script, only workshop
  content) - built fresh, borrowing methodology discipline only, not code.
- Zero real dependencies: plain Node plus `git` on PATH (optional, falls back to mtime).
- Must not silently overclaim precision anywhere - every heuristic (token estimate, redundancy
  score) states its own limits in the tool's own output and README.
- Public from day one (`dermdunc` account) - no employer detail, secrets, or private names.
