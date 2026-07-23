# Context Audit — Plain-English Project Walkthrough

## What this project is in one paragraph

A CLI that audits a docs/context folder for approximate token cost, redundancy between files, and staleness, stating its own limits plainly rather than overclaiming precision.

## The simple analogy

Like a home energy audit: it doesn't rebuild your house, it points a few honest, imperfect
instruments at it and tells you where the waste and drift actually is - the room that's too big
for what's in it, the two rooms that turned into copies of each other, the corner nobody's
touched in a year.

## What problem we are solving

Docs and context folders grow the way code never gets to: nobody reviews them for bloat,
duplication, or staleness the way a PR review checks code. This tool makes that kind of drift
visible and measurable, cheaply, without pretending the measurements are more precise than they
are.

## What we have built so far

- Scaffolded 2026-07-22 — repo and vault control plane created.
- Same day: three real measurements (token cost, redundancy, staleness) plus the CLI that reports
  them, built entirely from scratch since `half-life` (the closest prior art) turned out to have
  no reusable measurement code, only workshop content describing what a measurement should look
  like.
- Two review passes found and fixed 19 real issues, the most consequential being a staleness
  design that would have reintroduced the exact "fresh clone resets mtime" bug it was built to
  avoid - caught by actually reasoning through what happens on a clean checkout, not just by
  reading the code.
- Verified live and repeatedly against this site's own real `docs/` folder during development,
  which correctly found its two biggest files and a genuine 17% overlap between two others.

## How the pieces fit together

`lib/scan.mjs` walks a directory and reads matching files, skipping noise and handling bad
files/permissions per-entry rather than aborting. `lib/tokens.mjs` and `lib/shingles.mjs` are the
two independent measurements (a chars/4 token estimate; word-shingle Jaccard similarity for
redundancy). `lib/staleness.mjs` is the most involved piece: it prefers git history over
filesystem mtime, but checks `git diff` directly to detect real uncommitted edits rather than
comparing timestamps, which would have broken on every fresh checkout. `lib/audit.mjs`
orchestrates all three into one report; `bin/context-audit.mjs` is the CLI.

## What is deliberately not automated yet

Rename-tracking (`git log --follow`) isn't used, so a renamed-but-unchanged file's date can look
newer than its content actually is - disclosed as a known limitation rather than built, since it's
a deeper git feature than this tool's core claim needs. Hardlinked files also aren't
deduplicated - rare enough in a real docs tree that the added complexity wasn't worth it yet.

## How this could connect to the wider Hekton factory

The same shape as Vulnerability Gremlin's periodic dependency-audit sweep, but for a project's own
steering docs instead of its dependencies - genuinely dogfoodable across every Hekton project's
own `docs/`/`CLAUDE.md`/Skills directories, not just this one repo.

## Current confidence level

Medium-high — built fresh, verified repeatedly against real data (this site's own docs folder),
and put through two independent review passes that found real, structural bugs, not just style
issues. Not higher because the redundancy and token measurements are both explicitly heuristic,
and the tool has only ever been run against a handful of real docs trees so far, not a wide
variety of project shapes.

## Open questions

- Would a wider real-world test (very large trees, non-English content, deeply nested Skills
  directories) change confidence in the current thresholds and heuristics?
- Is disclosing the rename-tracking and hardlink limitations in the README sufficient, or should
  either actually be built before this tool is used somewhere with real consequences riding on
  the staleness numbers?

## Next recommended session

Draft the Agentic Tekton essay this tool is the companion artefact for
(`content-packages/context-is-the-architecture/brief.md` in the sibling `agentic-tekton` repo), or
run the tool against a genuinely large, unfamiliar docs tree to stress-test the heuristics beyond
this repo's own development-time checks.
