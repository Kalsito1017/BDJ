/**
 * MockTrainDataProvider — the ONLY train data implementation in this app
 * (DEC-002: mock-only until a lawful, documented source exists; rule 1).
 *
 * Contract (docs/decisions.md Appendix A.1):
 *  - `demo` provenance on every journey, segment and station; never
 *    'scheduled' / 'cached-stale' / 'real-time' (rule 6). Enforced by tests
 *    over every fixture.
 *  - `displayName` is "Mock (demo data)" so the UI can label it (checklist §1).
 *  - Fixtures live in `./fixtures` (multi-transfer, midnight-crossing, null
 *    times, long Bulgarian names, Cyrillic/Latin/mixed names, empty result,
 *    station without coordinates) and are obviously synthetic — never real
 *    BDZ schedules.
 *  - Deterministic scenario switching (Appendix A.4), no `Math.random()` in
 *    results, injected clock for stable `fetchedAt` (Appendix A.6).
 *  - Empty searches resolve with an empty `JourneySearchResult` envelope;
 *    unknown station/journey ids reject `not_found`; `AbortSignal` aborts
 *    promptly with `cancelled`; timeout budgets produce `timeout`; NOTHING
 *    rejects with anything but `ProviderError` (Appendix A.5).
 *  - Fixtures contain no personal data (checklist §14).
 *
 * Scenario semantics (all deterministic; simulated latency is part of the
 * scenario, not randomness):
 *  - `success`          — normal fixture behaviour for every method.
 *  - `empty`            — the simulated source has no data: searches resolve
 *                         empty, directory resolves with zero stations, and
 *                         by-id lookups reject `not_found`.
 *  - `malformed`        — every method feeds a deliberately schema-violating
 *                         fixture payload through the real Zod boundary,
 *                         which rejects `invalid_response`.
 *  - `timeout`          — simulated latency far exceeds any timeout budget, so
 *                         the request executor produces `timeout`.
 *  - `upstream_error`   — rejects `upstream_error` (simulated upstream 5xx).
 *  - `offline`          — rejects `offline` (simulated: request never sent).
 *  - `rate_limited`     — rejects `rate_limited` (simulated HTTP 429).
 *
 * This provider invents NO endpoints, no network access and no credentials.
 */

import type { RequestOptions } from '../common/RequestOptions';
import { DEFAULT_TIMEOUTS_MS } from '../common/RequestOptions';
import { executeRead } from '../api/requestExecutor';
import { parseExternalPayload } from '../api/parsePayload';
import { createProviderError } from '../api/providerErrors';
import { abortableDelay } from '../api/timing';
import type {
  TrainDataProvider,
  TrainDataProviderCapabilities,
  TrainDataProviderHealth,
} from './TrainDataProvider';
import type { Journey, JourneySearch, JourneySearchResult } from '../../types/journey';
import type { ISODateTime } from '../../types/common';
import type { Station, StationDirectory, StationQuery } from '../../types/station';
import {
  JourneySchema,
  JourneySearchResultSchema,
  StationDirectorySchema,
  StationSchema,
} from './schemas';
import { z } from 'zod';
import {
  mapJourney,
  mapJourneySearchResult,
  mapStation,
  mapStationDirectory,
} from './mapping';
import {
  DEMO_STATION_DIRECTORY_PAYLOAD,
  MALFORMED_JOURNEY_INVARIANT_PAYLOAD,
  MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD,
  MALFORMED_STATION_DIRECTORY_PAYLOAD,
  MALFORMED_STATION_PAYLOAD,
  loadDemoFixtures,
  type DemoFixtures,
  type RawPayload,
} from './fixtures';

export type MockScenario =
  | 'success'
  | 'empty'
  | 'malformed'
  | 'timeout'
  | 'upstream_error'
  | 'offline'
  | 'rate_limited';

export const MOCK_SCENARIOS: readonly MockScenario[] = [
  'success',
  'empty',
  'malformed',
  'timeout',
  'upstream_error',
  'offline',
  'rate_limited',
];

export interface MockTrainDataProviderConfig {
  /** Deterministic behaviour switch (Appendix A.4). Default: 'success'. */
  scenario?: MockScenario;
  /** Simulated latency for every call, in ms. Default: 0. */
  latencyMs?: number;
  /** Injected clock (Appendix A.6): `fetchedAt`/`occurredAt` come from here. */
  clock?: () => Date;
}

/** Latency used by scenario 'timeout': exceeds any sane timeout budget. */
export const MOCK_TIMEOUT_SCENARIO_LATENCY_MS = 2 ** 30;

/** Freshness window the demo directory claims (mock policy, not a BDZ policy). */
export const MOCK_DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000;

/** Default cap for station searches when `StationQuery.limit` is omitted. */
export const MOCK_STATION_SEARCH_DEFAULT_LIMIT = 25;

/**
 * Length + charset bounds for id inputs at the provider boundary
 * (DEC-023 W3B-M1). The mock's ids are short ASCII slugs
 * (`demo-station-sofia-central`, `demo-journey-direct`); an input outside
 * this alphabet cannot name anything in this provider, so it is rejected the
 * same way as an unknown id: `not_found` with a STATIC message (the raw value
 * is never echoed — DEC-019 W3-L1, "no payload values in errors"). The bound
 * also keeps unbounded strings from reaching lookups, logs and query keys.
 * A future live provider sets ITS boundary from ITS id format (DEC-002).
 */
export const MOCK_ID_INPUT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function isBoundedIdInput(value: string): boolean {
  return MOCK_ID_INPUT_PATTERN.test(value);
}

export class MockTrainDataProvider implements TrainDataProvider {
  readonly id = 'mock';
  readonly displayName = 'Mock (demo data)';
  readonly capabilities: TrainDataProviderCapabilities = {
    provenanceKinds: ['demo'],
    supportsStationAliases: true,
    supportsJourneyDetails: true,
    supportsStationCoordinates: true,
    // The fixtures are this repository's own synthetic data (no upstream
    // licence involved), so offline caching of them is permitted.
    licensedForOfflineCaching: true,
    attribution: 'Demo fixture data (synthetic) — not real BDZ information.',
  };

  private readonly scenario: MockScenario;
  private readonly latencyMs: number;
  private readonly clock: () => Date;
  private readonly fixtures: DemoFixtures;

  constructor(config: MockTrainDataProviderConfig = {}) {
    this.scenario = config.scenario ?? 'success';
    this.latencyMs = config.latencyMs ?? 0;
    this.clock = config.clock ?? (() => new Date());
    // Self-check: fixtures are parsed through the boundary schemas now, so a
    // drift in fixture data fails fast with `invalid_response`, not at runtime.
    this.fixtures = loadDemoFixtures();
  }

  /* ---------------------------------------------------------------- */
  /* TrainDataProvider                                                */
  /* ---------------------------------------------------------------- */

  searchJourneys(
    input: JourneySearch,
    options?: RequestOptions,
  ): Promise<JourneySearchResult> {
    return this.run(options, DEFAULT_TIMEOUTS_MS.search, () =>
      this.buildSearchResult(input),
    );
  }

  getJourney(journeyId: string, options?: RequestOptions): Promise<Journey> {
    return this.run(options, DEFAULT_TIMEOUTS_MS.read, () => {
      if (this.scenario === 'empty') {
        throw this.notFound('journey');
      }
      if (this.scenario === 'malformed') {
        // Schema-valid except for the DEC-006 invariant — rejected anyway.
        return mapJourney(
          parseExternalPayload(
            JourneySchema,
            MALFORMED_JOURNEY_INVARIANT_PAYLOAD,
            'Mock journey payload',
            this.clock,
          ),
          this.nowIso(),
        );
      }
      const raw = this.lookupJourneyPayload(journeyId);
      if (raw === undefined) throw this.notFound('journey');
      return mapJourney(
        parseExternalPayload(JourneySchema, raw, 'Mock journey payload', this.clock),
        this.nowIso(),
      );
    });
  }

  searchStations(
    query: StationQuery,
    options?: RequestOptions,
  ): Promise<readonly Station[]> {
    return this.run(options, DEFAULT_TIMEOUTS_MS.read, () => {
      if (this.scenario === 'malformed') {
        parseExternalPayload(
          z.array(StationSchema),
          [MALFORMED_STATION_PAYLOAD],
          'Mock station list payload',
          this.clock,
        );
        return [];
      }
      if (this.scenario === 'empty') return [];

      const matched = this.filterStations(query);
      const limit = query.limit ?? MOCK_STATION_SEARCH_DEFAULT_LIMIT;
      return matched
        .slice(0, limit)
        .map((station) =>
          mapStation(
            parseExternalPayload(
              StationSchema,
              this.lookupStationPayload(station.id) ?? {},
              'Mock station payload',
              this.clock,
            ),
            this.nowIso(),
          ),
        );
    });
  }

  getStationDirectory(options?: RequestOptions): Promise<StationDirectory> {
    return this.run(options, DEFAULT_TIMEOUTS_MS.read, () => {
      if (this.scenario === 'malformed') {
        return mapStationDirectory(
          parseExternalPayload(
            StationDirectorySchema,
            MALFORMED_STATION_DIRECTORY_PAYLOAD,
            'Mock station directory payload',
            this.clock,
          ),
          this.nowIso(),
        );
      }
      const fetchedAt = this.nowIso();
      const expiresAt = new Date(
        this.clock().getTime() + MOCK_DIRECTORY_TTL_MS,
      ).toISOString();
      const raw: RawPayload = {
        ...DEMO_STATION_DIRECTORY_PAYLOAD,
        stations:
          this.scenario === 'empty' ? [] : DEMO_STATION_DIRECTORY_PAYLOAD.stations,
        fetchedAt,
        expiresAt,
      };
      return mapStationDirectory(
        parseExternalPayload(
          StationDirectorySchema,
          raw,
          'Mock station directory payload',
          this.clock,
        ),
        fetchedAt,
      );
    });
  }

  getStation(stationId: string, options?: RequestOptions): Promise<Station> {
    return this.run(options, DEFAULT_TIMEOUTS_MS.read, () => {
      if (this.scenario === 'empty') {
        throw this.notFound('station');
      }
      if (this.scenario === 'malformed') {
        return mapStation(
          parseExternalPayload(
            StationSchema,
            MALFORMED_STATION_PAYLOAD,
            'Mock station payload',
            this.clock,
          ),
          this.nowIso(),
        );
      }
      const raw = this.lookupStationPayload(stationId);
      if (raw === undefined) throw this.notFound('station');
      return mapStation(
        parseExternalPayload(StationSchema, raw, 'Mock station payload', this.clock),
        this.nowIso(),
      );
    });
  }

  /**
   * Reports what the mock can verify (Appendix A / TrainDataProvider): with
   * failure scenarios configured the simulated source is unreachable, so
   * `reachable` is false. Never fabricates health. No latency is simulated.
   */
  healthCheck(options?: RequestOptions): Promise<TrainDataProviderHealth> {
    return executeRead(
      async () => ({
        reachable: !this.isFailureScenario(),
        checkedAt: this.nowIso(),
      }),
      { ...options, timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUTS_MS.read },
      { now: this.clock },
    );
  }

  /* ---------------------------------------------------------------- */
  /* Internals                                                        */
  /* ---------------------------------------------------------------- */

  private nowIso(): ISODateTime {
    return this.clock().toISOString();
  }

  /**
   * `not_found` with a STATIC message: raw ids/payload values never appear in
   * `ProviderError.message` (DEC-019 W3-L1 / DEC-023 W3B-L2). `kind` is a
   * fixed union, never caller data.
   */
  private notFound(kind: 'station' | 'journey') {
    return createProviderError(
      'not_found',
      kind === 'station'
        ? 'Mock provider has no such station.'
        : 'Mock provider has no such journey.',
      { now: this.clock },
    );
  }

  /**
   * Bounded, prototype-less lookups (DEC-019 W3-L3 + DEC-023 W3B-M1): the
   * fixture maps are `Map`s and ids outside the bounded input pattern cannot
   * name anything here. Unknown/out-of-bounds ids are simply "not found"
   * (`not_found`, static message) — 'constructor' no longer resolves to
   * `Object.prototype` and turns into a nonsense `invalid_response`.
   */
  private lookupStationPayload(stationId: string): RawPayload | undefined {
    if (!isBoundedIdInput(stationId)) return undefined;
    return this.fixtures.stationPayloads.get(stationId);
  }

  private lookupJourneyPayload(journeyId: string): RawPayload | undefined {
    if (!isBoundedIdInput(journeyId)) return undefined;
    return this.fixtures.journeyPayloadsById.get(journeyId);
  }

  private isFailureScenario(): boolean {
    return (
      this.scenario === 'timeout' ||
      this.scenario === 'upstream_error' ||
      this.scenario === 'offline' ||
      this.scenario === 'rate_limited'
    );
  }

  /** Shared call pipeline: latency -> scenario failure -> produce. */
  private run<T>(
    options: RequestOptions | undefined,
    defaultTimeoutMs: number,
    produce: () => T,
  ): Promise<T> {
    return executeRead(
      async (attemptSignal) => {
        const latency =
          this.scenario === 'timeout' ? MOCK_TIMEOUT_SCENARIO_LATENCY_MS : this.latencyMs;
        await abortableDelay(latency, attemptSignal);
        this.rejectForScenario();
        return produce();
      },
      { ...options, timeoutMs: options?.timeoutMs ?? defaultTimeoutMs },
      { now: this.clock },
    );
  }

  /** Simulated upstream failures — never real network conditions (DEC-002). */
  private rejectForScenario(): void {
    switch (this.scenario) {
      case 'offline':
        throw createProviderError(
          'offline',
          'Mock scenario "offline": the simulated device is offline.',
          { now: this.clock },
        );
      case 'upstream_error':
        throw createProviderError(
          'upstream_error',
          'Mock scenario "upstream_error": the simulated upstream answered 5xx.',
          {
            httpStatus: 500,
            upstreamCode: 'MOCK_SCENARIO_UPSTREAM_ERROR',
            now: this.clock,
          },
        );
      case 'rate_limited':
        throw createProviderError(
          'rate_limited',
          'Mock scenario "rate_limited": the simulated upstream answered 429.',
          {
            httpStatus: 429,
            upstreamCode: 'MOCK_SCENARIO_RATE_LIMITED',
            now: this.clock,
          },
        );
      default:
        return;
    }
  }

  private buildSearchResult(input: JourneySearch): JourneySearchResult {
    // Input validation first (Appendix A.5): unknown or out-of-bounds ids are
    // `not_found` regardless of the result-shaping scenario.
    for (const stationId of [input.fromStationId, input.toStationId]) {
      if (this.lookupStationPayload(stationId) === undefined) {
        throw this.notFound('station');
      }
    }

    const fetchedAt = this.nowIso();
    const selected = this.scenario === 'empty' ? [] : this.selectJourneys(input);
    const raw: RawPayload = {
      search: {
        fromStationId: input.fromStationId,
        toStationId: input.toStationId,
        date: input.date,
        ...(input.time !== undefined ? { time: input.time } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      },
      // Unreachable in practice: `selected` comes from the loaded fixtures,
      // whose payloads are all in the map (kept strict, never invented).
      journeys: selected.map((journey) => this.lookupJourneyPayload(journey.id) ?? {}),
      fetchedAt,
      provenance: { kind: 'demo', fetchedAt },
    };

    if (this.scenario === 'malformed') {
      return mapJourneySearchResult(
        parseExternalPayload(
          JourneySearchResultSchema,
          MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD,
          'Mock journey search result',
          this.clock,
        ),
        fetchedAt,
      );
    }

    return mapJourneySearchResult(
      parseExternalPayload(
        JourneySearchResultSchema,
        raw,
        'Mock journey search result',
        this.clock,
      ),
      fetchedAt,
    );
  }

  /**
   * Deterministic fixture selection: journeys whose first train leg departs
   * `fromStationId` and whose last train leg arrives at `toStationId`, in
   * fixture order. The date is echoed but not filtered — the mock has one
   * synthetic schedule for all dates (clearly demo data). With `time` set,
   * only journeys departing at/after it are kept; journeys with an UNKNOWN
   * departure time are kept (never silently hidden — they render "unknown").
   */
  private selectJourneys(input: JourneySearch): Journey[] {
    const selected = this.fixtures.journeys.filter((journey) => {
      const first = journey.segments[0];
      const last = journey.segments[journey.segments.length - 1];
      if (first === undefined || last === undefined) return false;
      if (first.fromStationId !== input.fromStationId) return false;
      if (last.toStationId !== input.toStationId) return false;
      if (input.time !== undefined && first.departureTime !== null) {
        const departure = minutesSinceTravelDate(
          first.departureTime,
          first.departureDayOffset ?? 0,
        );
        const wanted = minutesSinceTravelDate(input.time, 0);
        if (departure < wanted) return false;
      }
      return true;
    });
    return input.limit !== undefined ? selected.slice(0, input.limit) : selected;
  }

  /**
   * Mock matching rules (documented, deterministic): case-insensitive
   * substring match over `name`, `alternateName` and `aliases` (Cyrillic,
   * Latin and mixed all work); with `near`, only stations that HAVE
   * coordinates are returned, sorted by squared distance (ties by id).
   * Fixture order is preserved otherwise.
   */
  private filterStations(query: StationQuery): Station[] {
    let matched = [...this.fixtures.stations];
    const needle = query.text?.trim().toLowerCase();
    if (needle !== undefined && needle !== '') {
      matched = matched.filter((station) =>
        [station.name, station.alternateName, ...(station.aliases ?? [])].some((value) =>
          value?.toLowerCase().includes(needle),
        ),
      );
    }
    if (query.near !== undefined) {
      const near = query.near;
      matched = matched
        .filter((station) => station.location !== undefined)
        .sort((a, b) => {
          const distanceA = squaredDistance(a.location, near);
          const distanceB = squaredDistance(b.location, near);
          if (distanceA !== distanceB) return distanceA - distanceB;
          return a.id < b.id ? -1 : 1;
        });
    }
    return matched;
  }
}

function minutesSinceTravelDate(time: string, dayOffset: number): number {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  return dayOffset * 24 * 60 + (hours ?? 0) * 60 + (minutes ?? 0);
}

function squaredDistance(
  point: { latitude: number; longitude: number } | undefined,
  near: { latitude: number; longitude: number },
): number {
  if (point === undefined) return Number.POSITIVE_INFINITY;
  const lat = point.latitude - near.latitude;
  const lon = point.longitude - near.longitude;
  return lat * lat + lon * lon;
}
