#!/usr/bin/env node
import { runAudit } from '../lib/audit.mjs';

const KNOWN_FLAGS = new Set([
  '--ext',
  '--stale-days',
  '--redundancy-threshold',
  '--top',
  '--json',
  '--help',
  '-h',
]);

function printHelp() {
  console.log(`context-audit [directory]

Audits a docs/context folder for approximate token cost, redundancy between
files, and staleness. Every number here is a stated approximation, not an
exact measurement - see README.md for what each one actually means and
where it can be wrong.

Usage:
  context-audit [directory] [options]
  context-audit -- <directory>   (use -- before a directory name starting with -)

Arguments:
  directory              Directory to scan (default: .)

Options:
  --ext <list>            Comma-separated extensions to include (default: md)
  --stale-days <n>        Days since last change before a file is flagged stale (default: 90, whole number >= 0)
  --redundancy-threshold <0-1>  Minimum Jaccard similarity to report a pair (default: 0.15)
  --top <n>               How many files/pairs to show per section (default: 5, whole number >= 0)
  --json                  Print the full report as JSON instead of text
  --help                  Show this message

Also accepts --flag=value for any option above.
`);
}

function parseArgs(argv) {
  const args = {
    directory: '.',
    ext: 'md',
    staleDays: 90,
    redundancyThreshold: 0.15,
    top: 5,
    json: false,
    help: false,
  };
  const positionals = [];
  let onlyPositionals = false;

  for (let i = 0; i < argv.length; i += 1) {
    let token = argv[i];

    if (onlyPositionals) {
      positionals.push(token);
      continue;
    }
    if (token === '--') {
      onlyPositionals = true;
      continue;
    }

    let inlineValue = null;
    const eq = token.indexOf('=');
    if (token.startsWith('--') && eq !== -1) {
      inlineValue = token.slice(eq + 1);
      token = token.slice(0, eq);
    }

    const needsValue = ['--ext', '--stale-days', '--redundancy-threshold', '--top'];
    if (needsValue.includes(token)) {
      let value = inlineValue;
      if (value === null) {
        const next = argv[i + 1];
        // Only treat the next token as "missing, that's another flag" when
        // it's actually one of this CLI's recognized option names - NOT
        // merely "starts with a dash," which would wrongly reject a
        // legitimate negative number like `--stale-days -1` before it ever
        // reaches range validation (range validation is what should reject
        // it, with a real error message, not the parser guessing wrong).
        const looksLikeKnownFlag = next !== undefined && KNOWN_FLAGS.has(next);
        if (next === undefined || looksLikeKnownFlag) {
          console.error(`${token} requires a value`);
          process.exit(1);
        }
        value = next;
        i += 1;
      }
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = value;
    } else if (token === '--json') {
      args.json = true;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token.startsWith('-') && token !== '-') {
      console.error(`Unknown option: ${token}\nRun with --help for usage. Use -- before a directory name that starts with -.`);
      process.exit(1);
    } else {
      positionals.push(token);
    }
  }

  if (positionals.length > 1) {
    console.error(`Too many arguments: ${positionals.join(', ')} (expected at most one directory)`);
    process.exit(1);
  }
  if (positionals.length === 1) {
    args.directory = positionals[0];
  }

  args.staleDays = Number(args.staleDays);
  args.redundancyThreshold = Number(args.redundancyThreshold);
  args.top = Number(args.top);

  if (!Number.isFinite(args.redundancyThreshold)) {
    console.error('--redundancy-threshold must be a number');
    process.exit(1);
  }
  // top and stale-days are counts/day-counts - integer, non-negative.
  // redundancy-threshold is checked separately (fractional 0-1 is valid,
  // enforced by runAudit itself) rather than forced to be an integer here.
  for (const [key, value] of Object.entries({ 'stale-days': args.staleDays, top: args.top })) {
    if (!Number.isInteger(value) || value < 0) {
      console.error(`--${key} must be a non-negative whole number`);
      process.exit(1);
    }
  }

  return args;
}

function formatTokens(n) {
  return `~${n.toLocaleString()} tokens`;
}

function formatSource(f) {
  return f.lastModifiedReason ? `${f.lastModifiedSource}, ${f.lastModifiedReason}` : f.lastModifiedSource;
}

function printReport(report, top) {
  console.log(`Scanned ${report.rootDir}`);
  console.log(`${report.fileCount} file(s), ${formatTokens(report.totalApproxTokens)} total (approx, chars/4 heuristic)\n`);

  if (report.fileCount === 0) {
    return;
  }

  const biggest = [...report.files].sort((a, b) => b.approxTokens - a.approxTokens).slice(0, top);
  console.log(`Biggest (top ${Math.min(top, biggest.length)}):`);
  for (const f of biggest) {
    console.log(`  ${formatTokens(f.approxTokens).padEnd(16)} ${f.relativePath}`);
  }

  const stalest = [...report.files]
    .sort((a, b) => b.daysSinceModified - a.daysSinceModified)
    .slice(0, top);
  console.log(`\nStalest (top ${Math.min(top, stalest.length)}):`);
  for (const f of stalest) {
    const flag = f.stale ? ' [stale]' : '';
    console.log(`  ${String(f.daysSinceModified).padStart(4)} days ago (${formatSource(f)})${flag}  ${f.relativePath}`);
  }

  console.log(`\nMost redundant pairs (top ${Math.min(top, report.redundantPairs.length)}, word-shingle heuristic, not semantic):`);
  if (report.redundantPairs.length === 0) {
    console.log('  none above the threshold');
  } else {
    for (const p of report.redundantPairs.slice(0, top)) {
      console.log(`  ${(p.similarity * 100).toFixed(0)}%  ${p.a}  <->  ${p.b}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  // Warnings print to stderr the moment they're detected (not just at the
  // end of the run) - if a large tree makes the redundancy pass slow, the
  // user sees why before waiting, not after.
  const seen = new Set();
  const onWarning = (msg) => {
    if (seen.has(msg)) return;
    seen.add(msg);
    console.error(`Warning: ${msg}`);
  };

  let report;
  try {
    report = runAudit(args.directory, {
      extensions: args.ext.split(',').map((s) => s.trim()).filter(Boolean),
      staleDays: args.staleDays,
      redundancyThreshold: args.redundancyThreshold,
      onWarning,
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printReport(report, args.top);
}

main();
