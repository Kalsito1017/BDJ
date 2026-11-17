#!/usr/bin/env node
/**
 * Dependency-audit gate (DEC-031).
 *
 * `npm audit --audit-level=high` fails on *any* high advisory, including ones
 * with no patched version and no path into the app. That makes the check
 * permanently red and trains people to ignore it. This gate keeps the signal:
 *
 *   - high/critical ROOT advisories fail the build;
 *   - known no-fix roots may be allow-listed with an owner, a reason and an
 *     EXPIRY date (`scripts/audit-allowlist.json`);
 *   - an expired entry fails the build again;
 *   - moderate/low findings are reported in the npm audit output but do not
 *     fail this gate.
 *
 * No network access of its own: it runs `npm audit --json` and parses it.
 * Fail-closed: unreadable/invalid audit output or allowlist exits non-zero.
 *
 * Usage:
 *   node scripts/audit-gate.mjs
 *   node scripts/audit-gate.mjs --self-test
 *   node scripts/audit-gate.mjs --audit-json <file> --allowlist <file>
 */

import { execFileSync } from 'node:child_process';
import { strictEqual } from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ALLOWLIST = path.join(HERE, 'audit-allowlist.json');

/** Extract a GHSA id from a GitHub advisory URL. */
function ghsaId(url) {
  if (typeof url !== 'string') return null;
  const match = url.match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i);
  return match ? match[0] : null;
}

/**
 * High/critical advisory roots from an `npm audit --json` payload.
 * `via` strings are dependency references; `via` objects are actual advisories.
 */
export function extractRootAdvisories(audit) {
  const roots = new Map();
  const vulnerabilities =
    audit !== null && typeof audit === 'object' && audit.vulnerabilities
      ? audit.vulnerabilities
      : {};

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const viaList = Array.isArray(vulnerability.via) ? vulnerability.via : [];
    for (const via of viaList) {
      if (via === null || typeof via !== 'object') continue;
      const severity = String(via.severity ?? vulnerability.severity ?? '').toLowerCase();
      if (severity !== 'high' && severity !== 'critical') continue;

      const advisoryPackage = via.name ?? packageName;
      const id = ghsaId(via.url) ?? `npm:${via.title ?? advisoryPackage}`;
      const key = `${id}|${advisoryPackage}`;
      if (!roots.has(key)) {
        roots.set(key, {
          id,
          package: advisoryPackage,
          title: via.title ?? id,
          severity,
          url: via.url ?? null,
        });
      }
    }
  }
  return [...roots.values()];
}

/** Split roots into allowed, expired and blocking. `todayIso` is YYYY-MM-DD. */
export function evaluateGate(roots, allowlist, todayIso) {
  const allowed = [];
  const expired = [];
  const blocking = [];

  for (const root of roots) {
    // Critical findings are never allow-listable: they always block.
    if (root.severity === 'critical') {
      blocking.push(root);
      continue;
    }

    const entry = allowlist.find(
      (item) =>
        item.id.toLowerCase() === root.id.toLowerCase() && item.package === root.package,
    );
    if (!entry) {
      blocking.push(root);
      continue;
    }
    if (typeof entry.expires !== 'string' || entry.expires < todayIso) {
      expired.push({ ...root, expires: entry.expires ?? 'missing' });
      continue;
    }
    allowed.push({
      ...root,
      expires: entry.expires,
      owner: entry.owner ?? 'UNASSIGNED',
    });
  }

  return { allowed, expired, blocking };
}

function loadAllowlist(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`Allowlist ${file} must contain an "entries" array.`);
  }
  for (const entry of parsed.entries) {
    for (const field of ['id', 'package', 'reason', 'owner', 'expires']) {
      if (typeof entry[field] !== 'string' || entry[field].length === 0) {
        throw new Error(`Allowlist entry missing "${field}": ${JSON.stringify(entry)}`);
      }
    }
  }
  return parsed.entries;
}

function runNpmAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    // npm exits 1 whenever any advisory exists; the JSON report is still valid.
    if (typeof error.stdout === 'string' && error.stdout.trim() !== '')
      return error.stdout;
    throw error;
  }
}

function formatRoot(root) {
  return `${root.id} ${root.package} (${root.severity}) — ${root.title}`;
}

function selfTest() {
  const advisory = (id, packageName) => ({
    name: packageName,
    severity: 'high',
    via: [
      {
        name: packageName,
        severity: 'high',
        title: `${packageName} test advisory`,
        url: `https://github.com/advisories/${id}`,
      },
    ],
  });

  const auditWith = (...vulnerabilities) => ({
    metadata: {
      vulnerabilities: { high: vulnerabilities.length, total: vulnerabilities.length },
    },
    vulnerabilities: Object.fromEntries(
      vulnerabilities.map((vulnerability) => [vulnerability.name, vulnerability]),
    ),
  });

  const entry = {
    id: 'GHSA-aaaa-bbbb-cccc',
    package: 'picomatch',
    reason: 'test',
    owner: 'test',
    expires: '2026-12-31',
  };
  const today = '2026-11-17';

  const clean = evaluateGate(extractRootAdvisories(auditWith()), [entry], today);
  strictEqual(clean.blocking.length, 0, 'clean audit must pass');

  const allowed = evaluateGate(
    extractRootAdvisories(auditWith(advisory(entry.id, entry.package))),
    [entry],
    today,
  );
  strictEqual(allowed.allowed.length, 1, 'unexpired allowlisted advisory must pass');
  strictEqual(
    allowed.blocking.length,
    0,
    'unexpired allowlisted advisory must not block',
  );

  const expired = evaluateGate(
    extractRootAdvisories(auditWith(advisory(entry.id, entry.package))),
    [{ ...entry, expires: '2026-01-01' }],
    today,
  );
  strictEqual(expired.expired.length, 1, 'expired entry must be reported');
  strictEqual(expired.blocking.length, 0, 'expired entry is separate from blocking');

  const newAdvisory = evaluateGate(
    extractRootAdvisories(auditWith(advisory('GHSA-xxxx-yyyy-zzzz', 'picomatch'))),
    [entry],
    today,
  );
  strictEqual(newAdvisory.blocking.length, 1, 'unknown advisory must block');

  const packageMismatch = evaluateGate(
    extractRootAdvisories(auditWith(advisory(entry.id, 'other-package'))),
    [entry],
    today,
  );
  strictEqual(packageMismatch.blocking.length, 1, 'allowlist must match the package too');

  const critical = evaluateGate(
    extractRootAdvisories(
      auditWith({
        ...advisory(entry.id, entry.package),
        via: [{ ...advisory(entry.id, entry.package).via[0], severity: 'critical' }],
      }),
    ),
    [entry],
    today,
  );
  strictEqual(
    critical.blocking.length,
    1,
    'critical advisories are never allow-listable',
  );

  console.log('audit-gate self-test: PASS');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    selfTest();
    return;
  }

  try {
    const auditJsonIndex = args.indexOf('--audit-json');
    const audit =
      auditJsonIndex >= 0
        ? JSON.parse(readFileSync(args[auditJsonIndex + 1], 'utf8'))
        : JSON.parse(runNpmAudit());

    const allowlistIndex = args.indexOf('--allowlist');
    const allowlist = loadAllowlist(
      allowlistIndex >= 0 ? args[allowlistIndex + 1] : DEFAULT_ALLOWLIST,
    );

    const today = new Date().toISOString().slice(0, 10);
    const roots = extractRootAdvisories(audit);
    const { allowed, expired, blocking } = evaluateGate(roots, allowlist, today);
    const totals = audit.metadata?.vulnerabilities ?? {};

    console.log(
      `npm audit: ${totals.total ?? '?'} findings (${totals.high ?? 0} high, ` +
        `${totals.moderate ?? 0} moderate, ${totals.critical ?? 0} critical)`,
    );

    if (allowed.length > 0) {
      console.log(`Allowlisted no-fix roots (${allowed.length}):`);
      for (const root of allowed) {
        console.log(`  - ${formatRoot(root)}; expires ${root.expires} (${root.owner})`);
      }
    }
    if (expired.length > 0) {
      console.log(`Expired allowlist entries (${expired.length}):`);
      for (const root of expired) {
        console.log(`  - ${formatRoot(root)}; expired ${root.expires}`);
      }
    }
    if (blocking.length > 0) {
      console.log(`Blocking advisories (${blocking.length}):`);
      for (const root of blocking) {
        console.log(`  - ${formatRoot(root)}`);
      }
    }

    const failed = expired.length + blocking.length > 0;
    console.log(failed ? 'Audit gate: FAIL' : 'Audit gate: PASS');
    process.exitCode = failed ? 1 : 0;
  } catch (error) {
    console.error(`Audit gate: FAIL (could not evaluate audit) — ${error.message}`);
    process.exitCode = 1;
  }
}

main();
