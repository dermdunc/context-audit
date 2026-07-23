import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Directories that are never real "context" content, worth skipping
// unconditionally rather than making every user pass an ignore list.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

// If reading a file as UTF-8 produces this many replacement characters
// relative to its length, treat it as binary/undecodable rather than text -
// Node's utf8 decoder never throws on bad bytes, it silently substitutes
// U+FFFD, so a .md-extensioned binary file would otherwise be scanned as
// garbage-but-plausible text with no indication anything was wrong.
const REPLACEMENT_CHAR = '�';
const BINARY_REPLACEMENT_RATIO = 0.01;

function looksBinary(content) {
  if (content.includes('\0')) return true;
  if (content.length === 0) return false;
  let replacementCount = 0;
  for (const ch of content) {
    if (ch === REPLACEMENT_CHAR) replacementCount += 1;
  }
  return replacementCount / content.length >= BINARY_REPLACEMENT_RATIO;
}

// Manual recursion (not fs.readdirSync's recursive option, which needs
// Node 20+) to keep this working on Node 18 per package.json's engines
// field, and to skip SKIP_DIRS during the walk rather than filtering
// afterward. Per-entry failures (permission denied, broken symlink,
// disappeared mid-walk) are collected as warnings and skipped, not thrown -
// one bad file or directory anywhere in a large tree should not abort the
// whole scan.
function walk(dir, extensions, warnings) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    warnings.push(`could not read directory, skipped: ${dir} (${err.message})`);
    return results;
  }
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      warnings.push(`symlink not followed, skipped: ${entryPath}`);
      continue;
    }
    if (entry.isDirectory()) {
      // Only the explicit SKIP_DIRS list, not "any dot-directory" - a
      // blanket dot-directory skip would silently break exactly the kind
      // of target this tool is meant for, like an agent Skills directory
      // that lives under `.claude/skills/`.
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...walk(entryPath, extensions, warnings));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (extensions.has(ext)) {
        results.push(entryPath);
      }
    }
  }
  return results;
}

export function scanDirectory(rootDir, { extensions = ['md'] } = {}) {
  const stat = statSync(rootDir, { throwIfNoEntry: false });
  if (!stat) {
    throw new Error(`directory not found: ${rootDir}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`not a directory: ${rootDir}`);
  }
  const extSet = new Set(extensions.map((e) => e.replace(/^\./, '').toLowerCase()));
  const warnings = [];
  const paths = walk(rootDir, extSet, warnings);

  const files = [];
  for (const p of paths) {
    let content;
    try {
      content = readFileSync(p, 'utf8');
    } catch (err) {
      warnings.push(`could not read file, skipped: ${p} (${err.message})`);
      continue;
    }
    if (looksBinary(content)) {
      warnings.push(`looks binary/non-UTF-8, skipped: ${p}`);
      continue;
    }
    files.push({ path: p, relativePath: path.relative(rootDir, p), content });
  }

  return { files, warnings };
}
