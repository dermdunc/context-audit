# Context Audit

**Classification:** factory-output · **Owner:** dermdunc · **Status:** experimental, v0

[![CI](https://github.com/dermdunc/context-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/dermdunc/context-audit/actions/workflows/ci.yml)

> A CLI that audits a docs/context folder for approximate token cost, redundancy between files, and staleness, stating its own limits plainly rather than overclaiming precision.

## What it does

Points at a directory (a `docs/`, a `CLAUDE.md`/context folder, a Skills directory) and reports,
per file:

- **Approximate token cost** (a chars/4 heuristic, not a real tokenizer)
- **Staleness** (days since the file's real last change, preferring git history over filesystem
  mtime, which a fresh clone resets to clone time)
- **Redundancy** against every other file (word-shingle Jaccard similarity: how much two files
  overlap in runs of 5 consecutive words)

```bash
context-audit docs/
```
```
Scanned docs/
23 file(s), ~33,272 tokens total (approx, chars/4 heuristic)

Biggest (top 5):
  ~8,433 tokens    session-log.md
  ...

Stalest (top 5):
    32 days ago (git)  architecture.md
  ...

Most redundant pairs (top 1, word-shingle heuristic, not semantic):
  17%  reproducibility.md  <->  setup.md
```

## What it deliberately does not claim

Every number here is disclosed as an approximation, on purpose, borrowing a lesson from
`half-life` (a workshop on context rot) whose own review panels repeatedly caught overclaimed
measurement precision before it shipped:

- **Token count is not exact.** chars/4 is a rough, model-agnostic estimate. Real tokenizers are
  model-specific; this tool works against any project without a model dependency, at the cost of
  precision it's honest about not having.
- **Redundancy is not semantic.** Two files can mean the same thing in different words and score
  low here, or share boilerplate structure (like two scaffold templates) and score higher than
  their actual content overlap warrants. It catches copy-paste and near-duplication, not meaning.
- **Staleness prefers git history, but falls back to filesystem mtime** when a file has no git
  history (untracked, run outside a repo entirely, or a fresh `git init` with zero commits), or
  when a tracked file has real uncommitted edits (the last commit's date would be stale for
  "when did this content last change" - checked via `git diff`, not by comparing mtime against
  the commit date, since mtime is always newer than the commit date right after a plain clone or
  checkout too, on a perfectly clean tree). Every file's `lastModifiedSource` and, when it fell
  back, `lastModifiedReason` (`git-not-found` / `not-a-git-repo` / `no-history` /
  `uncommitted-changes` / `git-error`) are in the JSON output for every file, and in the text
  output for whichever files land in the "Stalest" top-N list.

## Known limitations, disclosed rather than silently wrong

- **Git history lookup doesn't follow renames.** `git log` is run without `--follow`, so a
  renamed-but-otherwise-unchanged file's git-sourced date reflects when it was last modified at
  its *current* path, not its full rename history - it can look newer than its content actually
  is. A staged rename with no other change falls into `no-history` for the new path rather than
  being recognized as a continuation of the old file's history.
- **Hardlinked files double-count.** Two directory entries pointing at the same inode are scanned
  as two independent files, so they'll always show up as a near-100% "redundant pair," and total
  token count double-counts their shared content. Rare in a real docs tree; not worth the added
  complexity of inode-deduplication for this tool's actual use case.
- **Symlinks are never followed.** Skipped with a warning (visible in `warnings`, and printed live
  to stderr as soon as one is found), not silently dropped and not silently resolved.
- **Unreadable files or directories are skipped with a warning**, not treated as a fatal error -
  one bad permission anywhere in a large tree shouldn't abort the whole audit.
- **Binary content with a matching extension** (a `.md` file that isn't actually text) is detected
  by a replacement-character heuristic after a UTF-8 decode and skipped with a warning, rather than
  silently scored as garbage-but-plausible text.

## Use it

```bash
git clone https://github.com/dermdunc/context-audit.git
cd context-audit
node bin/context-audit.mjs /path/to/docs
```

```
Usage:
  context-audit [directory] [options]

Options:
  --ext <list>                   Comma-separated extensions to include (default: md)
  --stale-days <n>                Days since last change before a file is flagged stale (default: 90)
  --redundancy-threshold <0-1>    Minimum Jaccard similarity to report a pair (default: 0.15)
  --top <n>                       How many files/pairs to show per section (default: 5)
  --json                          Print the full report as JSON instead of text
  --help                          Show this message
```

Zero dependencies: plain Node (>=18) plus `git` on `PATH` (optional - falls back to mtime if
missing). `npm test` runs the suite (`node --test`, Node's own built-in test runner).

## Layout

```
lib/tokens.mjs      the chars/4 token estimate
lib/shingles.mjs     word-shingle sets + Jaccard similarity
lib/staleness.mjs    git-history-preferred last-modified date
lib/scan.mjs         recursive directory walk, skips node_modules/.git/dist/etc
lib/audit.mjs        orchestrates the three above into one report
bin/context-audit.mjs   the CLI
```

## Implementation Status

- Scaffolded and built 2026-07-22, all four measurements and the CLI live same day.

## Documentation Contract

Agents working here must inspect `.hekton/project.yaml` before structural changes, keep `docs/session-log.md` current, record meaningful design decisions in `docs/decisions.md`, and update `docs/next-actions.md` when the work queue changes.

Vault mutation policy: see `vault_mutation_allowed` in `.hekton/project.yaml` (authoritative; defaults to false at scaffold time). The repo-local `mind-palace/` folder is only a mirror draft; do not write to the live vault unless `.hekton/project.yaml` says mutation is allowed and it is explicitly authorised in-session.

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
