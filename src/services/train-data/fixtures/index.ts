/**
 * Demo fixtures loader for MockTrainDataProvider (Appendix A.3).
 *
 * The raw fixture payloads are parsed through the Zod boundary schemas and
 * mapped into domain types ONCE at load time — a permanent self-check: if a
 * fixture ever drifts from the schema or violates the DEC-006 journey
 * invariant, `loadDemoFixtures()` rejects with `invalid_response` and the
 * tests fail loudly instead of shipping broken demo data.
 *
 * Re-exported here: the raw payloads themselves (the provider re-parses them
 * per call to exercise the real boundary path) and the deliberately malformed
 * payloads used by scenario 'malformed'.
 */

import type { Journey } from '../../../types/journey';
import type { Station } from '../../../types/station';
import { parseExternalPayload } from '../../api/parsePayload';
import { mapJourney, mapStation } from '../mapping';
import { JourneySchema, StationSchema } from '../schemas';
import {
  DEMO_PAYLOAD_FETCHED_AT,
  DEMO_STATION_DIRECTORY_PAYLOAD,
  DEMO_STATION_PAYLOADS,
} from './demoStationPayloads';
import { DEMO_JOURNEY_PAYLOADS_BY_ROUTE } from './demoJourneyPayloads';
import type { RawPayload } from './rawPayload';

export type { RawPayload } from './rawPayload';
export {
  DEMO_PAYLOAD_FETCHED_AT,
  DEMO_STATION_DIRECTORY_PAYLOAD,
  DEMO_STATION_PAYLOADS,
  MALFORMED_STATION_DIRECTORY_PAYLOAD,
  MALFORMED_STATION_PAYLOAD,
} from './demoStationPayloads';
export {
  DEMO_EMPTY_ROUTE,
  DEMO_JOURNEY_PAYLOADS_BY_ROUTE,
  MALFORMED_JOURNEY_INVARIANT_PAYLOAD,
  MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD,
  demoRouteKey,
} from './demoJourneyPayloads';

export interface DemoFixtures {
  /** Parsed + mapped demo stations (lookup view), in fixture order. */
  readonly stations: readonly Station[];
  /** Raw station payloads keyed by id (the "wire" form). `Map` on purpose:
   *  prototype-less id lookups (DEC-019 W3-L3) — an id like 'constructor'
   *  can never resolve to `Object.prototype` members. */
  readonly stationPayloads: ReadonlyMap<string, RawPayload>;
  /** Raw full-directory payload (the "wire" form). */
  readonly directoryPayload: RawPayload;
  /** Parsed + mapped demo journeys, deterministic order (route order, then list). */
  readonly journeys: readonly Journey[];
  /** Raw journey payloads in the same order as `journeys`. */
  readonly journeyPayloads: readonly RawPayload[];
  /** Raw journey payloads keyed by journey id (prototype-less — W3-L3). */
  readonly journeyPayloadsById: ReadonlyMap<string, RawPayload>;
}

function fixtureClock(): () => Date {
  return () => new Date(DEMO_PAYLOAD_FETCHED_AT);
}

/**
 * Parse + map every fixture payload. Throws `ProviderError
 * { code: 'invalid_response' }` when a fixture violates its schema or the
 * journey invariant — a bug in this repository's data, never a user condition.
 */
export function loadDemoFixtures(): DemoFixtures {
  const clock = fixtureClock();
  const fetchedAt = DEMO_PAYLOAD_FETCHED_AT;

  const stations = DEMO_STATION_PAYLOADS.map((payload) =>
    mapStation(
      parseExternalPayload(StationSchema, payload, 'Demo station fixture', clock),
      fetchedAt,
    ),
  );

  const stationPayloads = new Map<string, RawPayload>();
  for (const payload of DEMO_STATION_PAYLOADS) {
    const id = parseExternalPayload(
      StationSchema,
      payload,
      'Demo station fixture',
      clock,
    ).id;
    stationPayloads.set(id, payload);
  }

  const journeys: Journey[] = [];
  const journeyPayloads: RawPayload[] = [];
  const journeyPayloadsById = new Map<string, RawPayload>();
  for (const payloads of Object.values(DEMO_JOURNEY_PAYLOADS_BY_ROUTE)) {
    for (const payload of payloads) {
      const journey = mapJourney(
        parseExternalPayload(JourneySchema, payload, 'Demo journey fixture', clock),
        fetchedAt,
      );
      journeys.push(journey);
      journeyPayloads.push(payload);
      journeyPayloadsById.set(journey.id, payload);
    }
  }

  return {
    stations,
    stationPayloads,
    directoryPayload: DEMO_STATION_DIRECTORY_PAYLOAD,
    journeys,
    journeyPayloads,
    journeyPayloadsById,
  };
}
