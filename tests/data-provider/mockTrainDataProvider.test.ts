/**
 * MockTrainDataProvider contract tests (docs/decisions.md Appendix A.1;
 * plan.md §9 Phase 4 acceptance criteria; addbeforerelease.txt §14).
 *
 * Required cases (lead brief): success, empty results, malformed payload,
 * timeout, server error (upstream_error), offline, rate_limited, cancellation
 * via AbortSignal, unknown station id, long station names, Bulgarian/Cyrillic
 * text, midnight-crossing day offsets, null times — plus "every fixture
 * carries demo provenance only" (fixtures.test.ts) and "nothing rejects with
 * anything but ProviderError".
 *
 * All timing-sensitive tests use small budgets and `NO_AUTO_RETRY_POLICY` or
 * fast retry policies so the suite stays quick and deterministic.
 */

import { NO_AUTO_RETRY_POLICY } from '../../src/services/common/RequestOptions';
import { isProviderError } from '../../src/services/api/providerErrors';
import {
  MOCK_SCENARIOS,
  MOCK_TIMEOUT_SCENARIO_LATENCY_MS,
  MockTrainDataProvider,
  type MockScenario,
} from '../../src/services/train-data/MockTrainDataProvider';
import type { Journey, JourneySearchResult, TrainSegment } from '../../src/types/journey';
import type { Station } from '../../src/types/station';
import { DEMO_EMPTY_ROUTE, demoRouteKey } from '../../src/services/train-data/fixtures';

const FIXED_CLOCK = () => new Date('2026-03-03T03:03:03.000Z');
const FETCHED_AT = '2026-03-03T03:03:03.000Z';
const TRAVEL_DATE = '2026-03-03';

function makeProvider(
  scenario: MockScenario = 'success',
  extra: Record<string, unknown> = {},
) {
  return new MockTrainDataProvider({ scenario, clock: FIXED_CLOCK, ...extra });
}

const fastOptions = { retry: NO_AUTO_RETRY_POLICY, timeoutMs: 500 };

async function rejectionOf(promise: Promise<unknown>): Promise<{ code: string }> {
  try {
    await promise;
  } catch (error: unknown) {
    expect(isProviderError(error)).toBe(true);
    return error as { code: string };
  }
  throw new Error('expected the call to reject');
}

function trainSegmentsOf(journey: Journey): TrainSegment[] {
  return journey.legs.filter((leg): leg is TrainSegment => leg.kind === 'train');
}

describe('MockTrainDataProvider — identity and labelling (Appendix A.1/A.2)', () => {
  it('is clearly labelled as mock demo data', () => {
    const provider = makeProvider();
    expect(provider.id).toBe('mock');
    expect(provider.displayName).toBe('Mock (demo data)');
    expect(provider.capabilities.provenanceKinds).toEqual(['demo']);
  });

  it('implements the TrainDataProvider seam', () => {
    const provider = makeProvider();
    expect(typeof provider.searchJourneys).toBe('function');
    expect(typeof provider.searchStations).toBe('function');
    expect(typeof provider.getStation).toBe('function');
    expect(typeof provider.getJourney).toBe('function');
    expect(typeof provider.getStationDirectory).toBe('function');
    expect(typeof provider.healthCheck).toBe('function');
  });
});

describe('MockTrainDataProvider — scenario success', () => {
  it('returns fixture journeys with demo provenance and injected fetch time', async () => {
    const provider = makeProvider();
    const result = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-plovdiv',
        date: TRAVEL_DATE,
      },
      fastOptions,
    );
    expect(result.journeys.map((journey) => journey.id)).toEqual(['demo-journey-direct']);
    expect(result.fetchedAt).toBe(FETCHED_AT);
    expect(result.provenance.kind).toBe('demo');
    const journey = result.journeys[0];
    expect(journey.provenance.kind).toBe('demo');
    expect(journey.segments[0].departureTime).toBe('08:08');
    expect(journey.segments[0].arrivalTime).toBe('10:10');
    expect(journey.segments[0].provenance?.kind).toBe('demo');
  });

  it('echoes the search input back in the envelope', async () => {
    const provider = makeProvider();
    const result = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-plovdiv',
        date: TRAVEL_DATE,
        time: '08:00',
        limit: 5,
      },
      fastOptions,
    );
    expect(result.search).toEqual({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-plovdiv',
      date: TRAVEL_DATE,
      time: '08:00',
      limit: 5,
    });
  });

  it('is deterministic: identical results across calls and instances', async () => {
    const input = {
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      date: TRAVEL_DATE,
    };
    const first = await makeProvider().searchJourneys(input, fastOptions);
    const second = await makeProvider().searchJourneys(input, fastOptions);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('honours limit and time filters without inventing journeys', async () => {
    const provider = makeProvider();
    const route = {
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      date: TRAVEL_DATE,
    };
    const all = await provider.searchJourneys(route, fastOptions);
    expect(all.journeys).toHaveLength(2);
    const limited = await provider.searchJourneys({ ...route, limit: 1 }, fastOptions);
    expect(limited.journeys).toHaveLength(1);
    // 07:07 journey is filtered out by time=09:00; the 23:23 one remains.
    const afternoon = await provider.searchJourneys(
      { ...route, time: '09:00' },
      fastOptions,
    );
    expect(afternoon.journeys.map((journey) => journey.id)).toEqual([
      'demo-journey-midnight',
    ]);
  });

  it('resolves journeys by id and rejects unknown ids with not_found', async () => {
    const provider = makeProvider();
    const journey = await provider.getJourney('demo-journey-multi-transfer', fastOptions);
    expect(journey.id).toBe('demo-journey-multi-transfer');
    expect(trainSegmentsOf(journey)).toHaveLength(3);
    const rejection = await rejectionOf(
      provider.getJourney('demo-journey-nope', fastOptions),
    );
    expect(rejection.code).toBe('not_found');
  });
});

describe('MockTrainDataProvider — empty results (envelope, never a rejection)', () => {
  it('resolves an empty envelope for a route with no fixture journeys', async () => {
    const provider = makeProvider();
    const result = await provider.searchJourneys(
      { ...DEMO_EMPTY_ROUTE, date: TRAVEL_DATE },
      fastOptions,
    );
    expect(result).toEqual(
      expect.objectContaining({ journeys: [], fetchedAt: FETCHED_AT }),
    );
    expect(result.provenance.kind).toBe('demo');
  });

  it("resolves empty searches under scenario 'empty'", async () => {
    const provider = makeProvider('empty');
    const result: JourneySearchResult = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-plovdiv',
        date: TRAVEL_DATE,
      },
      fastOptions,
    );
    expect(result.journeys).toEqual([]);
    await expect(
      provider.searchStations({ text: 'софия' }, fastOptions),
    ).resolves.toEqual([]);
    await expect(
      provider.getStation('demo-station-sofia-central', fastOptions),
    ).rejects.toMatchObject({ code: 'not_found' });
    const directory = await provider.getStationDirectory(fastOptions);
    expect(directory.stations).toEqual([]);
  });
});

describe('MockTrainDataProvider — failure scenarios', () => {
  it("scenario 'malformed' rejects with invalid_response and schema diagnostics", async () => {
    const provider = makeProvider('malformed');
    const rejection = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        fastOptions,
      ),
    );
    expect(rejection.code).toBe('invalid_response');
    const withDiagnostics = rejection as { diagnostics?: readonly string[] };
    expect(withDiagnostics.diagnostics?.length).toBeGreaterThan(0);
  });

  it("scenario 'malformed' also rejects getJourney via the invariant refinement", async () => {
    const provider = makeProvider('malformed');
    const rejection = await rejectionOf(
      provider.getJourney('demo-journey-direct', fastOptions),
    );
    expect(rejection.code).toBe('invalid_response');
  });

  it("scenario 'timeout' produces a timeout from the budget", async () => {
    const provider = makeProvider('timeout');
    const rejection = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        { retry: NO_AUTO_RETRY_POLICY, timeoutMs: 20 },
      ),
    );
    expect(rejection.code).toBe('timeout');
    expect(MOCK_TIMEOUT_SCENARIO_LATENCY_MS).toBeGreaterThan(20);
  });

  it("scenario 'upstream_error' rejects with a simulated server error", async () => {
    const provider = makeProvider('upstream_error');
    const rejection = (await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        fastOptions,
      ),
    )) as { code: string; httpStatus?: number };
    expect(rejection.code).toBe('upstream_error');
    expect(rejection.httpStatus).toBe(500);
  });

  it("scenario 'offline' rejects with offline", async () => {
    const provider = makeProvider('offline');
    const rejection = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        fastOptions,
      ),
    );
    expect(rejection.code).toBe('offline');
  });

  it("scenario 'rate_limited' rejects with rate_limited (simulated 429)", async () => {
    const provider = makeProvider('rate_limited');
    const rejection = (await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        fastOptions,
      ),
    )) as { code: string; httpStatus?: number };
    expect(rejection.code).toBe('rate_limited');
    expect(rejection.httpStatus).toBe(429);
  });

  it('never rejects with anything but a ProviderError, for every scenario', async () => {
    for (const scenario of MOCK_SCENARIOS) {
      const provider = makeProvider(scenario);
      try {
        await provider.searchJourneys(
          {
            fromStationId: 'demo-station-sofia-central',
            toStationId: 'demo-station-plovdiv',
            date: TRAVEL_DATE,
          },
          { retry: NO_AUTO_RETRY_POLICY, timeoutMs: 20 },
        );
      } catch (error: unknown) {
        expect(isProviderError(error)).toBe(true);
      }
    }
  });
});

describe('MockTrainDataProvider — cancellation via AbortSignal', () => {
  it('rejects a pre-aborted request with cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = makeProvider();
    const rejection = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        { ...fastOptions, signal: controller.signal },
      ),
    );
    expect(rejection.code).toBe('cancelled');
  });

  it('aborts promptly while the simulated latency is running', async () => {
    const controller = new AbortController();
    const provider = makeProvider('success', { latencyMs: 5_000 });
    const startedAt = Date.now();
    setTimeout(() => controller.abort(), 20);
    const rejection = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        { retry: NO_AUTO_RETRY_POLICY, signal: controller.signal },
      ),
    );
    expect(rejection.code).toBe('cancelled');
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });
});

describe('MockTrainDataProvider — unknown station ids', () => {
  it('rejects searches with unknown ids with not_found', async () => {
    const provider = makeProvider();
    const unknownFrom = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'not-a-station',
          toStationId: 'demo-station-plovdiv',
          date: TRAVEL_DATE,
        },
        fastOptions,
      ),
    );
    expect(unknownFrom.code).toBe('not_found');
    const unknownTo = await rejectionOf(
      provider.searchJourneys(
        {
          fromStationId: 'demo-station-sofia-central',
          toStationId: 'not-a-station',
          date: TRAVEL_DATE,
        },
        fastOptions,
      ),
    );
    expect(unknownTo.code).toBe('not_found');
  });

  it('rejects getStation for unknown ids with not_found', async () => {
    const provider = makeProvider();
    const rejection = await rejectionOf(
      provider.getStation('not-a-station', fastOptions),
    );
    expect(rejection.code).toBe('not_found');
  });
});

describe('MockTrainDataProvider — station search (Cyrillic, Latin, mixed, long names)', () => {
  it('finds stations by Bulgarian (Cyrillic) text', async () => {
    const provider = makeProvider();
    const stations = await provider.searchStations({ text: 'софия' }, fastOptions);
    expect(stations.map((station: Station) => station.id)).toContain(
      'demo-station-sofia-central',
    );
  });

  it('finds stations by Latin text via the alternate name', async () => {
    const provider = makeProvider();
    const stations = await provider.searchStations({ text: 'sofia' }, fastOptions);
    expect(stations.map((station: Station) => station.id)).toContain(
      'demo-station-sofia-central',
    );
  });

  it('finds stations with mixed Cyrillic/Latin names and aliases', async () => {
    const provider = makeProvider();
    const byLatinPart = await provider.searchStations({ text: 'Mixed' }, fastOptions);
    expect(byLatinPart.map((station: Station) => station.id)).toContain(
      'demo-station-mixed',
    );
    const byCyrillicPart = await provider.searchStations({ text: 'смесен' }, fastOptions);
    expect(byCyrillicPart.map((station: Station) => station.id)).toContain(
      'demo-station-mixed',
    );
    const byAlias = await provider.searchStations({ text: 'DNJ' }, fastOptions);
    expect(byAlias.map((station: Station) => station.id)).toContain('demo-station-latin');
  });

  it('returns long Bulgarian station names intact', async () => {
    const provider = makeProvider();
    const stations = await provider.searchStations({ text: 'дълго' }, fastOptions);
    expect(stations).toHaveLength(1);
    expect(stations[0].name.length).toBeGreaterThan(60);
    const byId = await provider.getStation('demo-station-long-name', fastOptions);
    expect(byId.name).toBe(stations[0].name);
  });

  it('handles the station without coordinates and nearby sorting', async () => {
    const provider = makeProvider();
    const withoutCoords = await provider.getStation(
      'demo-station-no-coords',
      fastOptions,
    );
    expect('location' in withoutCoords).toBe(false);
    const nearby = await provider.searchStations(
      { near: { latitude: 42.7, longitude: 23.33 } },
      fastOptions,
    );
    expect(nearby[0].id).toBe('demo-station-sofia-central');
    expect(nearby.some((station: Station) => station.location === undefined)).toBe(false);
  });

  it('returns all demo stations with no query and honours limit', async () => {
    const provider = makeProvider();
    const all = await provider.searchStations({}, fastOptions);
    expect(all).toHaveLength(7);
    const limited = await provider.searchStations({ limit: 2 }, fastOptions);
    expect(limited).toHaveLength(2);
  });
});

describe('MockTrainDataProvider — midnight crossings and null times', () => {
  it('carries day offsets on the midnight-crossing fixture', async () => {
    const provider = makeProvider();
    const journey = await provider.getJourney('demo-journey-midnight', fastOptions);
    const segments = trainSegmentsOf(journey);
    expect(segments[0].departureTime).toBe('23:23');
    expect(segments[0].departureDayOffset).toBe(0);
    expect(segments[0].arrivalDayOffset).toBe(1);
    expect(segments[1].departureDayOffset).toBe(1);
    expect(segments[1].arrivalDayOffset).toBe(1);
  });

  it('returns null times as unknown, never as estimates', async () => {
    const provider = makeProvider();
    const journey = await provider.getJourney('demo-journey-null-times', fastOptions);
    const segment = trainSegmentsOf(journey)[0];
    expect(segment.departureTime).toBeNull();
    expect(segment.arrivalTime).toBeNull();
    // "unknown" journeys are never silently hidden by a time filter:
    const result = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-latin',
        toStationId: 'demo-station-mixed',
        date: TRAVEL_DATE,
        time: '20:00',
      },
      fastOptions,
    );
    expect(result.journeys.map((journey) => journey.id)).toEqual([
      'demo-journey-null-times',
    ]);
  });
});

describe('MockTrainDataProvider — directory and health', () => {
  it('returns a versioned demo directory with deterministic expiry', async () => {
    const provider = makeProvider();
    const directory = await provider.getStationDirectory(fastOptions);
    expect(directory.version).toBe('demo-directory-1');
    expect(directory.stations).toHaveLength(7);
    expect(directory.fetchedAt).toBe(FETCHED_AT);
    expect(new Date(directory.expiresAt).toISOString()).toBe('2026-03-04T03:03:03.000Z');
  });

  it('reports health without fabricating it', async () => {
    const healthy = await makeProvider().healthCheck(fastOptions);
    expect(healthy).toEqual({ reachable: true, checkedAt: FETCHED_AT });
    const offline = await makeProvider('offline').healthCheck(fastOptions);
    expect(offline.reachable).toBe(false);
  });
});

describe('MockTrainDataProvider — provenance discipline (rule 6)', () => {
  it('returns demo provenance on every result, journey and leg', async () => {
    const provider = makeProvider();
    const result = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-varna',
        date: TRAVEL_DATE,
      },
      fastOptions,
    );
    expect(result.provenance.kind).toBe('demo');
    for (const journey of result.journeys) {
      expect(journey.provenance.kind).toBe('demo');
      for (const leg of journey.legs) {
        expect(leg.provenance?.kind).toBe('demo');
      }
    }
    const stations = await provider.searchStations({}, fastOptions);
    for (const station of stations) {
      expect(station.provenance.kind).toBe('demo');
    }
  });

  it('never returns scheduled, cached-stale or real-time provenance', async () => {
    const provider = makeProvider();
    const result = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-varna',
        date: TRAVEL_DATE,
      },
      fastOptions,
    );
    const kinds = new Set<string>([result.provenance.kind]);
    for (const journey of result.journeys) {
      kinds.add(journey.provenance.kind);
      for (const leg of journey.legs) {
        if (leg.provenance) kinds.add(leg.provenance.kind);
      }
    }
    expect([...kinds]).toEqual(['demo']);
  });
});

describe('MockTrainDataProvider — fixture route index sanity', () => {
  it('finds each fixture journey through its route key', async () => {
    const provider = makeProvider();
    const result = await provider.searchJourneys(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-varna',
        date: TRAVEL_DATE,
      },
      fastOptions,
    );
    const expectedKey = demoRouteKey('demo-station-sofia-central', 'demo-station-varna');
    expect(expectedKey).toBe('demo-station-sofia-central|demo-station-varna');
    expect(result.journeys).toHaveLength(2);
  });
});
