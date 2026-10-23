/**
 * Information-provenance contract tests (rule 6; plan.md §8; addbeforerelease.txt
 * §7; docs/decisions.md DEC-006).
 *
 * Intended behaviour: exactly four provenance kinds exist — demo / scheduled /
 * cached-stale / real-time — and every kind carries the payload the spec
 * requires. `real-time` is reserved and must stay unproducible until DEC-002
 * is superseded (verified by the mock-provider tests in Phase 4; here we pin
 * the vocabulary itself).
 *
 * Type-level assertions are enforced by `npm run typecheck` (tsc --noEmit
 * covers tests/); runtime assertions run under Jest.
 */

import {
  PROVENANCE_KINDS,
  type InformationProvenance,
  type ProvenanceKind,
} from '../../src/types/provenance';

/* ------------------------------------------------------------------ */
/* Type-level helpers (compile-time only)                              */
/* ------------------------------------------------------------------ */

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * Exported so the checks are "used" for lint purposes; each member must
 * resolve to `true` or `npm run typecheck` fails.
 */
export type ProvenanceTypeChecks = [
  // The union accepts ONLY the four documented kinds.
  Expect<Equal<ProvenanceKind, 'demo' | 'scheduled' | 'cached-stale' | 'real-time'>>,
  // The runtime constant and the type union agree.
  Expect<Equal<(typeof PROVENANCE_KINDS)[number], ProvenanceKind>>,
];

/* Each kind demands its documented payload fields (positive samples). */
const demo: InformationProvenance = { kind: 'demo', fetchedAt: '2026-10-22T09:00:00Z' };
const scheduled: InformationProvenance = {
  kind: 'scheduled',
  fetchedAt: '2026-10-22T09:00:00Z',
  sourceUpdatedAt: '2026-10-22T06:00:00Z',
};
const cachedStale: InformationProvenance = {
  kind: 'cached-stale',
  fetchedAt: '2026-10-22T09:00:00Z',
  cachedAt: '2026-10-21T09:00:00Z',
  expiresAt: '2026-10-22T08:00:00Z',
  staleReason: 'expired-ttl',
};
const realTime: InformationProvenance = {
  kind: 'real-time',
  fetchedAt: '2026-10-22T09:00:00Z',
  observedAt: '2026-10-22T08:59:30Z',
  sourceId: 'example-live-feed-id',
};

/*
 * Negative samples: `@ts-expect-error` covers only the line that follows it,
 * so each case is kept on one short line that Prettier will not wrap. If any
 * of these ever STOPS being a type error (e.g. the union widens), `npm run
 * typecheck` fails on the "unused '@ts-expect-error' directive".
 */
const now = '2026-10-22T09:00:00Z';

function mustNotCompile(provenance: InformationProvenance): void {
  void provenance;
}

// @ts-expect-error — 'live' is not a provenance kind; only the four documented ones are.
mustNotCompile({ kind: 'live', fetchedAt: now });
// @ts-expect-error — 'realtime' (no hyphen) is not a provenance kind either.
mustNotCompile({ kind: 'realtime', fetchedAt: now });
// @ts-expect-error — cached-stale without cachedAt/expiresAt/staleReason is invalid.
mustNotCompile({ kind: 'cached-stale', fetchedAt: now });
// @ts-expect-error — real-time without observedAt/sourceId is invalid.
mustNotCompile({ kind: 'real-time', fetchedAt: now });
// @ts-expect-error — every provenance must record when it was fetched.
mustNotCompile({ kind: 'demo' });

/* ------------------------------------------------------------------ */
/* Runtime assertions                                                  */
/* ------------------------------------------------------------------ */

describe('information provenance vocabulary (DEC-006, rule 6)', () => {
  it('admits exactly the four documented kinds', () => {
    expect([...PROVENANCE_KINDS].sort()).toEqual(
      ['cached-stale', 'demo', 'real-time', 'scheduled'].sort(),
    );
    expect(PROVENANCE_KINDS).toHaveLength(4);
  });

  it('rejects common near-miss spellings of the vocabulary', () => {
    const nearMisses = [
      'live',
      'realtime',
      'real_time',
      'cached',
      'stale',
      'mock',
      'official',
    ];
    for (const kind of nearMisses) {
      expect(PROVENANCE_KINDS).not.toContain(kind);
    }
  });

  it('keeps demo, scheduled, cached-stale and real-time as distinguishable values', () => {
    // The kinds are the discriminants the UI renders labels from; they must not
    // collapse into one another (e.g. 'demo' must never equal 'scheduled').
    const kinds: ProvenanceKind[] = [
      demo.kind,
      scheduled.kind,
      cachedStale.kind,
      realTime.kind,
    ];
    expect(new Set(kinds).size).toBe(4);
  });

  it('matches the type-level samples so the compile-time and run-time views agree', () => {
    expect([demo.kind, scheduled.kind, cachedStale.kind, realTime.kind].sort()).toEqual(
      [...PROVENANCE_KINDS].sort(),
    );
  });

  it('keeps the compile-time negative samples exercised (guarantees live in typecheck)', () => {
    // Nothing is asserted about the VALUES here: the `mustNotCompile` calls
    // above exist so `npm run typecheck` fails if the provenance union ever
    // widens. This test only proves the module still evaluates.
    expect(typeof mustNotCompile).toBe('function');
  });
});
