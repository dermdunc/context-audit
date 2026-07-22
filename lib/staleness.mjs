import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';

// Prefers git history (the actual "when did the content last change" date)
// over filesystem mtime, which is unreliable: a fresh `git clone` or
// `checkout` sets every file's mtime to checkout time, not its real
// last-edit time.
//
// Falls back to mtime, and distinguishes WHY: `reason` is one of
// 'git-not-found' (no git binary on PATH), 'no-history' (git ran fine, the
// file just isn't tracked or the repo has zero commits), 'git-error' (git
// ran but failed for some other reason), or 'uncommitted-changes' (the file
// IS tracked and has history, but its working-tree content differs from
// HEAD right now, so the last commit's date is stale for "when did this
// content last change"). Collapsing all four into one silent mtime
// fallback would hide the difference between "this is genuinely untracked"
// and "something is actually wrong" and "you just haven't committed yet."
//
// Note this deliberately does NOT compare raw mtime against the commit
// date to detect "uncommitted" - mtime is always newer than the commit
// date immediately after a fresh clone/checkout too, with a perfectly
// clean working tree, so that comparison alone would reintroduce the exact
// "clone resets mtime" bug this function exists to avoid. `git diff --quiet
// HEAD -- <path>` asks git directly whether the working copy actually
// differs from HEAD, which is the real signal.
export function lastModified(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);

  let gitDate = null;
  let reason = null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%aI', '--', base], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (out) {
      gitDate = new Date(out);
    } else {
      reason = 'no-history';
    }
  } catch (err) {
    const stderrText = err.stderr ?? '';
    if (err.code === 'ENOENT') {
      reason = 'git-not-found';
    } else if (/not a git repository/.test(stderrText)) {
      reason = 'not-a-git-repo';
    } else if (/does not have any commits yet/.test(stderrText)) {
      // A freshly `git init`'d repo with zero commits: git log exits
      // non-zero here (unlike an untracked file in a repo WITH commits,
      // which exits 0 with empty stdout) - semantically this is still
      // "no history for this file," not a broken git, so it gets the same
      // reason rather than the generic 'git-error'.
      reason = 'no-history';
    } else {
      reason = 'git-error';
    }
  }

  if (gitDate !== null) {
    const dirty = isDirty(dir, base);
    if (!dirty) {
      return { date: gitDate, source: 'git', reason: null };
    }
    reason = 'uncommitted-changes';
  }

  const stat = statSync(filePath);
  return { date: stat.mtime, source: 'mtime', reason };
}

// Returns true if the file's working-tree content differs from HEAD.
// `git diff --quiet` exits 1 on a real difference and 0 when clean;
// execFileSync throws on any non-zero exit, so status 1 is the expected
// "dirty" signal, not an error - anything else (git missing, not a repo,
// etc.) is treated as "can't tell, assume clean" since lastModified()
// already established git is usable by the time this is called.
function isDirty(dir, base) {
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', base], {
      cwd: dir,
      stdio: 'ignore',
    });
    return false;
  } catch (err) {
    return err.status === 1;
  }
}

export function daysSince(date, now = new Date()) {
  const ms = now.getTime() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
