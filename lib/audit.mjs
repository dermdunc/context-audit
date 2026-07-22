import { scanDirectory } from './scan.mjs';
import { estimateTokens } from './tokens.mjs';
import { wordShingles, jaccardSimilarity } from './shingles.mjs';
import { lastModified, daysSince } from './staleness.mjs';

// Redundancy check is O(n^2) pairwise comparisons. Fine for a real docs/
// context tree (tens of files); above this, still runs but warns that it
// may be slow. The warning fires via onWarning as soon as file count is
// known - BEFORE the slow loop starts, not only in the final report - so a
// caller printing warnings live doesn't experience the entire slow part
// first with no explanation.
const LARGE_TREE_WARNING_THRESHOLD = 300;

export function runAudit(rootDir, options = {}) {
  const {
    extensions = ['md'],
    staleDays = 90,
    redundancyThreshold = 0.15,
    shingleSize = 5,
    now = new Date(),
    onWarning = () => {},
  } = options;

  // NaN fails every `<`/`>` comparison, so checking those alone would let
  // NaN silently pass validation (and then silently misbehave downstream:
  // every similarity >= NaN is false, so redundancy detection would go
  // silently quiet; every days-since >= NaN is also false, so staleness
  // detection would too) - Number.isFinite rejects it explicitly first.
  // This guards direct library callers, not just the CLI, which validates
  // separately before ever calling here.
  if (!Number.isFinite(redundancyThreshold) || redundancyThreshold < 0 || redundancyThreshold > 1) {
    throw new RangeError(`redundancyThreshold must be a number between 0 and 1 (got ${redundancyThreshold})`);
  }
  if (!Number.isFinite(staleDays) || staleDays < 0) {
    throw new RangeError(`staleDays must be a non-negative number (got ${staleDays})`);
  }

  const warnings = [];
  const warn = (msg) => {
    warnings.push(msg);
    onWarning(msg);
  };

  const { files: scanned, warnings: scanWarnings } = scanDirectory(rootDir, { extensions });
  for (const w of scanWarnings) warn(w);

  if (scanned.length === 0) {
    warn(`no files matched extensions [${extensions.join(', ')}] under ${rootDir}`);
    return { rootDir, fileCount: 0, totalApproxTokens: 0, files: [], redundantPairs: [], warnings };
  }

  if (scanned.length > LARGE_TREE_WARNING_THRESHOLD) {
    warn(`${scanned.length} files matched; redundancy comparison is O(n^2) and may be slow at this size`);
  }

  const files = scanned.map((f) => {
    const { date, source, reason } = lastModified(f.path);
    return {
      relativePath: f.relativePath,
      approxTokens: estimateTokens(f.content),
      lastModified: date.toISOString(),
      lastModifiedSource: source,
      lastModifiedReason: reason,
      daysSinceModified: daysSince(date, now),
      stale: daysSince(date, now) >= staleDays,
      shingles: wordShingles(f.content, shingleSize),
    };
  });

  const redundantPairs = [];
  for (let i = 0; i < files.length; i += 1) {
    for (let j = i + 1; j < files.length; j += 1) {
      const similarity = jaccardSimilarity(files[i].shingles, files[j].shingles);
      if (similarity >= redundancyThreshold) {
        redundantPairs.push({
          a: files[i].relativePath,
          b: files[j].relativePath,
          similarity,
        });
      }
    }
  }
  redundantPairs.sort((a, b) => b.similarity - a.similarity);

  // Shingle sets were only needed to compute pairwise similarity above -
  // drop them from what's returned so callers (and --json output) don't
  // carry a potentially large, redundant internal structure.
  const publicFiles = files.map(({ shingles, ...rest }) => rest);

  return {
    rootDir,
    fileCount: publicFiles.length,
    totalApproxTokens: publicFiles.reduce((sum, f) => sum + f.approxTokens, 0),
    files: publicFiles,
    redundantPairs,
    warnings,
  };
}
