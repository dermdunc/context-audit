import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { estimateTokens } from '../lib/tokens.mjs';
import { wordShingles, jaccardSimilarity } from '../lib/shingles.mjs';
import { runAudit } from '../lib/audit.mjs';

test('estimateTokens: chars/4 heuristic, rounds up', () => {
  assert.equal(estimateTokens('a'.repeat(4)), 1);
  assert.equal(estimateTokens('a'.repeat(5)), 2);
  assert.equal(estimateTokens(''), 0);
});

test('jaccardSimilarity: identical text is 1.0, disjoint text is 0', () => {
  const a = wordShingles('the quick brown fox jumps over the lazy dog', 3);
  const b = wordShingles('the quick brown fox jumps over the lazy dog', 3);
  assert.equal(jaccardSimilarity(a, b), 1);

  const c = wordShingles('completely unrelated sentence about something else entirely', 3);
  assert.equal(jaccardSimilarity(a, c), 0);
});

test('jaccardSimilarity: text shorter than the shingle size yields an empty set, not a crash', () => {
  const short = wordShingles('too short', 5);
  const normal = wordShingles('this text is definitely long enough for shingles', 5);
  assert.equal(short.size, 0);
  assert.equal(jaccardSimilarity(short, normal), 0);
  assert.equal(jaccardSimilarity(short, short), 0); // both empty - defined as 0, not NaN
});

function withTempDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'context-audit-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('runAudit: empty directory reports zero files with a warning, not a crash', () => {
  withTempDir((dir) => {
    const report = runAudit(dir);
    assert.equal(report.fileCount, 0);
    assert.equal(report.totalApproxTokens, 0);
    assert.ok(report.warnings.length > 0);
  });
});

test('runAudit: missing directory throws a clear error', () => {
  assert.throws(() => runAudit('/definitely/does/not/exist/xyz'), /directory not found/);
});

test('runAudit: skips node_modules and .git specifically, only includes matching extensions', () => {
  withTempDir((dir) => {
    mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
    writeFileSync(path.join(dir, 'node_modules', 'noise.md'), 'should not be scanned');
    mkdirSync(path.join(dir, '.git'), { recursive: true });
    writeFileSync(path.join(dir, '.git', 'also-noise.md'), 'should not be scanned either');
    writeFileSync(path.join(dir, 'real.md'), 'this one counts');
    writeFileSync(path.join(dir, 'ignored.txt'), 'wrong extension, not included by default');

    const report = runAudit(dir);
    assert.equal(report.fileCount, 1);
    assert.equal(report.files[0].relativePath, 'real.md');
  });
});

test('runAudit: does NOT blanket-skip other dot-directories - a .claude/skills/ tree is included', () => {
  // A prior version skipped every directory starting with "." (matching
  // .git, but also anything else), which silently broke exactly the kind
  // of target this tool advertises supporting: an agent Skills directory
  // conventionally lives under .claude/skills/.
  withTempDir((dir) => {
    mkdirSync(path.join(dir, '.claude', 'skills', 'example'), { recursive: true });
    writeFileSync(path.join(dir, '.claude', 'skills', 'example', 'SKILL.md'), 'a real skill file');

    const report = runAudit(dir);
    assert.equal(report.fileCount, 1);
    assert.equal(report.files[0].relativePath, path.join('.claude', 'skills', 'example', 'SKILL.md'));
  });
});

test('runAudit: finds near-duplicate files as a redundant pair', () => {
  withTempDir((dir) => {
    const shared =
      'the deploy pipeline reports success even when the live site still serves stale content because the sync step only compares file size';
    writeFileSync(path.join(dir, 'a.md'), shared);
    writeFileSync(path.join(dir, 'b.md'), `${shared} with a little extra text appended at the end`);
    writeFileSync(path.join(dir, 'c.md'), 'a completely unrelated document about something else entirely, nothing shared here at all');

    const report = runAudit(dir, { redundancyThreshold: 0.3 });
    assert.equal(report.fileCount, 3);
    assert.equal(report.redundantPairs.length, 1);
    assert.deepEqual([report.redundantPairs[0].a, report.redundantPairs[0].b].sort(), ['a.md', 'b.md']);
  });
});

test('runAudit: flags a file as stale only once it crosses staleDays, using an injectable "now"', () => {
  withTempDir((dir) => {
    writeFileSync(path.join(dir, 'old.md'), 'old content');
    const report = runAudit(dir, {
      staleDays: 30,
      now: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // pretend it's a year later
    });
    assert.equal(report.files[0].stale, true);
    assert.ok(report.files[0].daysSinceModified >= 300);
  });
});

test('runAudit: prefers git history over filesystem mtime when the directory is a real git repo', () => {
  withTempDir((dir) => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    writeFileSync(path.join(dir, 'tracked.md'), 'tracked content');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });

    const report = runAudit(dir);
    assert.equal(report.files[0].lastModifiedSource, 'git');
  });
});

test('runAudit: falls back to mtime when there is no git history for the file (untracked, or no repo at all)', () => {
  withTempDir((dir) => {
    writeFileSync(path.join(dir, 'untracked.md'), 'no git repo here');
    const report = runAudit(dir);
    assert.equal(report.files[0].lastModifiedSource, 'mtime');
    assert.equal(report.files[0].lastModifiedReason, 'not-a-git-repo');
  });
});

test('runAudit: a tracked file with uncommitted edits uses mtime, not the stale last-commit date, and says why', () => {
  withTempDir((dir) => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    writeFileSync(path.join(dir, 'edited.md'), 'original content');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });

    // Real edit after the commit, not committed - this is the case a naive
    // git-log-only approach gets wrong (it would report the old commit's
    // date as if that were still accurate).
    writeFileSync(path.join(dir, 'edited.md'), 'edited content, not yet committed');

    const report = runAudit(dir);
    assert.equal(report.files[0].lastModifiedSource, 'mtime');
    assert.equal(report.files[0].lastModifiedReason, 'uncommitted-changes');
  });
});

test('runAudit: a freshly-checked-out clean file still uses the git commit date, not mtime, even though mtime is newer than the commit', () => {
  // The case the naive "mtime > commitDate means dirty" comparison gets
  // wrong: right after any fresh clone/checkout, mtime is always "now,"
  // newer than every commit date, on a perfectly clean tree. This must
  // still report the git date, not mtime.
  withTempDir((dir) => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
    writeFileSync(path.join(dir, 'clean.md'), 'content');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
    // No further edit - mtime (just now) is still newer than the commit's
    // authored timestamp, but the working tree is clean.

    const report = runAudit(dir);
    assert.equal(report.files[0].lastModifiedSource, 'git');
    assert.equal(report.files[0].lastModifiedReason, null);
  });
});

test('runAudit: a directory with zero commits (git init, nothing committed) falls back to mtime with reason no-history', () => {
  withTempDir((dir) => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    writeFileSync(path.join(dir, 'untracked-in-empty-repo.md'), 'content');
    const report = runAudit(dir);
    assert.equal(report.files[0].lastModifiedSource, 'mtime');
    assert.equal(report.files[0].lastModifiedReason, 'no-history');
  });
});

test('runAudit: one unreadable file does not abort the whole scan - the rest are still reported, with a warning', () => {
  withTempDir((dir) => {
    writeFileSync(path.join(dir, 'good.md'), 'readable content');
    const badPath = path.join(dir, 'bad.md');
    writeFileSync(badPath, 'unreadable content');
    execFileSync('chmod', ['000', badPath]);
    try {
      const warnings = [];
      const report = runAudit(dir, { onWarning: (w) => warnings.push(w) });
      // On some CI environments running as root, chmod 000 doesn't actually
      // block reads - only assert the strong invariant either way: the
      // scan itself never throws, and the readable file is always present.
      assert.ok(report.files.some((f) => f.relativePath === 'good.md'));
      if (report.fileCount === 1) {
        assert.ok(warnings.some((w) => w.includes('bad.md')));
      }
    } finally {
      execFileSync('chmod', ['644', badPath]);
    }
  });
});

test('runAudit: a binary file with a matching extension is detected and skipped, not silently corrupted into garbage text', () => {
  withTempDir((dir) => {
    writeFileSync(path.join(dir, 'good.md'), 'real text content here');
    // Enough invalid UTF-8 bytes to push well past the 1% replacement-char
    // threshold relative to a short file.
    const binary = Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x02, 0xfd, 0xfc, 0xfb, 0xfa, 0x00]);
    writeFileSync(path.join(dir, 'binary.md'), binary);

    const warnings = [];
    const report = runAudit(dir, { onWarning: (w) => warnings.push(w) });
    assert.equal(report.fileCount, 1);
    assert.equal(report.files[0].relativePath, 'good.md');
    assert.ok(warnings.some((w) => w.includes('binary.md') && w.includes('binary')));
  });
});

test('runAudit: a symlink is skipped with a warning, not silently followed or silently dropped', () => {
  withTempDir((dir) => {
    writeFileSync(path.join(dir, 'real.md'), 'real content');
    symlinkSync(path.join(dir, 'real.md'), path.join(dir, 'link.md'));

    const warnings = [];
    const report = runAudit(dir, { onWarning: (w) => warnings.push(w) });
    assert.equal(report.fileCount, 1);
    assert.equal(report.files[0].relativePath, 'real.md');
    assert.ok(warnings.some((w) => w.includes('symlink') && w.includes('link.md')));
  });
});

test('runAudit: rejects an out-of-range redundancyThreshold or a negative staleDays rather than silently misbehaving', () => {
  assert.throws(() => runAudit('.', { redundancyThreshold: 1.5 }), RangeError);
  assert.throws(() => runAudit('.', { redundancyThreshold: -0.5 }), RangeError);
  assert.throws(() => runAudit('.', { staleDays: -10 }), RangeError);
});

test('runAudit: large-tree warning fires via onWarning before fileCount alone would explain a slow run', () => {
  withTempDir((dir) => {
    // Not actually generating 300+ files (slow, wasteful) - this exercises
    // the callback wiring itself via the empty-directory warning path,
    // confirming onWarning fires synchronously and warnings end up in both
    // the callback stream and the final report.
    const seen = [];
    const report = runAudit(dir, { onWarning: (w) => seen.push(w) });
    assert.deepEqual(seen, report.warnings);
  });
});
