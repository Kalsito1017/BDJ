/**
 * Fixture-contract tests (docs/decisions.md Appendix A.1/A.3; rule 6;
 * addbeforerelease.txt §14 "test data that looks real but contains no
 * production personal data").
 *
 * Covered: EVERY fixture carries `demo` provenance only (never scheduled /
 * cached-stale / real-time); the journey invariant validator passes for every
 * fixture (and fails for a deliberately broken one); fixture schedules are
 * obviously synthetic (ДЕМО-/DEMO- train numbers, demo status text); fixtures
 * contain no personal data; the route index is consistent with journey
 * endpoints; required edge-case fixtures exist (long names, Cyrillic/Latin/
 * mixed names, no coordinates, empty route).
 */

import type { Journey, TrainSegment } from '../../src/types/journey';
import {
  DEMO_EMPTY_ROUTE,
  DEMO_JOURNEY_PAYLOADS_BY_ROUTE,
  DEMO_STATION_PAYLOADS,
  demoRouteKey,
  loadDemoFixtures,
} from '../../src/services/train-data/fixtures';
import { validateJourneyInvariant } from '../../src/services/train-data/journeyInvariant';

/** Recursively collect every `provenance` object in a raw fixture payload. */
function collectProvenance(value: unknown, out: unknown[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectProvenance(item, out);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if ('provenance' in record) out.push(record.provenance);
    for (const nested of Object.values(record)) collectProvenance(nested, out);
  }
}

function trainSegmentsOf(journey: Journey): TrainSegment[] {
  return journey.legs.filter((leg): leg is TrainSegment => leg.kind === 'train');
}

const fixtures = loadDemoFixtures();

describe('fixtures — demo provenance only (rule 6, Appendix A.1)', () => {
  it('every raw fixture payload carries demo provenance, never anything else', () => {
    const found: unknown[] = [];
    collectProvenance(DEMO_STATION_PAYLOADS, found);
    collectProvenance(Object.values(DEMO_JOURNEY_PAYLOADS_BY_ROUTE), found);
    expect(found.length).toBeGreaterThan(0);
    for (const provenance of found) {
      expect(provenance).toEqual(
        expect.objectContaining({ kind: 'demo', fetchedAt: expect.any(String) }),
      );
    }
  });

  it('every parsed station and journey (and its legs) carries demo provenance', () => {
    for (const station of fixtures.stations) {
      expect(station.provenance.kind).toBe('demo');
    }
    for (const journey of fixtures.journeys) {
      expect(journey.provenance.kind).toBe('demo');
      for (const leg of journey.legs) {
        expect(leg.provenance?.kind).toBe('demo');
      }
    }
  });

  it('no fixture ever produces the reserved real-time / scheduled / cached-stale kinds', () => {
    const kinds = new Set<string>();
    const found: unknown[] = [];
    collectProvenance(DEMO_STATION_PAYLOADS, found);
    collectProvenance(Object.values(DEMO_JOURNEY_PAYLOADS_BY_ROUTE), found);
    for (const provenance of found) {
      kinds.add((provenance as { kind: string }).kind);
    }
    expect([...kinds]).toEqual(['demo']);
  });
});

describe('fixtures — journey invariant over every fixture (DEC-006)', () => {
  it('passes the invariant validator for every fixture journey', () => {
    expect(fixtures.journeys.length).toBeGreaterThan(0);
    for (const journey of fixtures.journeys) {
      expect(validateJourneyInvariant(journey)).toEqual([]);
    }
  });

  it('passes the equivalent runtime check from tests/types/journey-invariant.test.ts', () => {
    // Same semantics as the reviewer's contract test: segments must equal the
    // train legs of `legs`, in order (deep equality).
    for (const journey of fixtures.journeys) {
      expect(journey.segments).toEqual(trainSegmentsOf(journey));
      journey.segments.forEach((segment) => expect(segment.kind).toBe('train'));
    }
  });

  it('fails for a deliberately broken journey (negative control)', () => {
    const source = fixtures.journeys[0];
    const broken: Journey = {
      ...source,
      // Drop a train leg from `segments` — the invariant must catch it.
      segments: source.segments.slice(0, Math.max(0, source.segments.length - 1)),
    };
    expect(validateJourneyInvariant(broken).length).toBeGreaterThan(0);
  });
});

describe('fixtures — obviously synthetic schedules, no personal data', () => {
  it('uses demo-prefixed train numbers and demo status text on every train leg', () => {
    for (const journey of fixtures.journeys) {
      for (const segment of trainSegmentsOf(journey)) {
        expect(segment.trainNumber).toMatch(/^(ДЕМО|DEMO)-\d{4}$/);
        expect(segment.providerStatus).toContain('DEMO');
      }
    }
  });

  it('contains no personal data (no e-mail-like strings, no long digit runs)', () => {
    const serialized = JSON.stringify([
      DEMO_STATION_PAYLOADS,
      DEMO_JOURNEY_PAYLOADS_BY_ROUTE,
    ]);
    expect(serialized).not.toMatch(/@/); // no e-mail addresses at all
    expect(serialized).not.toMatch(/\d{6,}/); // no phone/ID-like digit runs
    expect(serialized.toLowerCase()).not.toContain('passenger');
    expect(serialized.toLowerCase()).not.toContain('customer');
  });

  it('keeps the route index consistent with journey endpoints', () => {
    for (const [key, payloads] of Object.entries(DEMO_JOURNEY_PAYLOADS_BY_ROUTE)) {
      for (const payload of payloads) {
        const segments = (payload as { segments: TrainSegment[] }).segments;
        const first = segments[0];
        const last = segments[segments.length - 1];
        expect(key).toBe(demoRouteKey(first.fromStationId, last.toStationId));
      }
    }
  });
});

describe('fixtures — required edge-case coverage (Appendix A.3)', () => {
  it('has a very long Bulgarian station name for layout stress', () => {
    const longest = fixtures.stations.reduce((a, b) =>
      a.name.length >= b.name.length ? a : b,
    );
    expect(longest.name.length).toBeGreaterThan(60);
    expect(longest.name).toMatch(/[А-Яа-я]/);
  });

  it('has Cyrillic, Latin and mixed-script station names', () => {
    const names = fixtures.stations.map((station) => station.name);
    expect(names.some((name) => /^[А-Яа-я\s-]+$/.test(name))).toBe(true); // Cyrillic only
    expect(names.some((name) => /^[A-Za-z\s-]+$/.test(name))).toBe(true); // Latin only
    expect(names.some((name) => /[А-Яа-я]/.test(name) && /[A-Za-z]/.test(name))).toBe(
      true,
    ); // mixed
  });

  it('has a station without coordinates', () => {
    expect(fixtures.stations.some((station) => station.location === undefined)).toBe(
      true,
    );
  });

  it('has a multi-transfer journey and a midnight-crossing journey', () => {
    const multiTransfer = fixtures.journeys.find(
      (journey) => journey.legs.filter((leg) => leg.kind === 'transfer').length >= 2,
    );
    expect(multiTransfer).toBeDefined();
    const midnight = fixtures.journeys.find((journey) =>
      trainSegmentsOf(journey).some(
        (segment) =>
          (segment.arrivalDayOffset ?? 0) > 0 || (segment.departureDayOffset ?? 0) > 0,
      ),
    );
    expect(midnight).toBeDefined();
  });

  it('has a journey with null times and an empty-result route', () => {
    const nullTimes = fixtures.journeys.find((journey) =>
      trainSegmentsOf(journey).some(
        (segment) => segment.departureTime === null && segment.arrivalTime === null,
      ),
    );
    expect(nullTimes).toBeDefined();
    expect(
      DEMO_JOURNEY_PAYLOADS_BY_ROUTE[
        demoRouteKey(DEMO_EMPTY_ROUTE.fromStationId, DEMO_EMPTY_ROUTE.toStationId)
      ],
    ).toBeUndefined();
  });

  it('loads a station directory fixture with demo attribution', () => {
    expect(fixtures.directoryPayload.attribution).toContain('Demo');
    expect(fixtures.stations).toHaveLength(DEMO_STATION_PAYLOADS.length);
  });
});
