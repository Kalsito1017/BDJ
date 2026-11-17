/**
 * The dependency-audit gate (DEC-031) is build tooling, but a regression in
 * its allowlist/expiry logic would silently weaken CI. Run its built-in
 * self-test as part of the normal Jest suite.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('dependency audit gate', () => {
  it('passes its built-in self-test', () => {
    const script = path.join(process.cwd(), 'scripts/audit-gate.mjs');
    const output = execFileSync(process.execPath, [script, '--self-test'], {
      encoding: 'utf8',
    });
    expect(output).toContain('audit-gate self-test: PASS');
  });
});
