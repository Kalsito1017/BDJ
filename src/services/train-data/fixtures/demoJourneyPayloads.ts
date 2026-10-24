/**
 * DEMO journey payloads — fixture data for MockTrainDataProvider
 * (Appendix A.3; DEC-002: mock-only).
 *
 * EVERY schedule-like value here is synthetic and obviously fake (repeated-digit
 * `HH:mm` times, 'ДЕМО-'/'DEMO-' train numbers, demo status text). These are
 * NOT real BDZ times and must never be presented as real data (rule 1). No
 * personal data of any kind (checklist §14).
 *
 * `segments` and `legs` are authored explicitly (not derived) so the fixtures
 * themselves are checked against the DEC-006 invariant
 * `segments === legs.filter(l => l.kind === 'train')` by the schema refinement
 * and by tests/data-provider/fixtures.test.ts.
 *
 * Coverage required by Appendix A.3:
 * - multi-transfer journey                -> demo-journey-multi-transfer
 * - midnight-crossing journey (day offs.) -> demo-journey-midnight
 * - journey with null times               -> demo-journey-null-times
 * - long Bulgarian station names          -> demo-journey-long-names / multi-transfer
 * - empty result                          -> DEMO_EMPTY_ROUTE (no journeys) + scenario 'empty'
 * - schema-violating payloads (scenario)  -> MALFORMED_* below
 */

import type { RawPayload } from './rawPayload';
import { DEMO_PAYLOAD_FETCHED_AT } from './demoStationPayloads';

const demoProvenance = { kind: 'demo', fetchedAt: DEMO_PAYLOAD_FETCHED_AT } as const;

/** Demo status text carried verbatim by fixture legs — itself a demo label. */
const DEMO_STATUS = 'DEMO: синтетични данни — не са реални разписания';

/** Deterministic route key for the fixture journey index. */
export function demoRouteKey(fromStationId: string, toStationId: string): string {
  return `${fromStationId}|${toStationId}`;
}

const trainSofiaToPlovdivDirect: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  departureTime: '08:08',
  arrivalTime: '10:10',
  trainNumber: 'ДЕМО-0001',
  trainCategory: 'DEMO',
  trainName: 'Демо Експрес 1',
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

const trainSofiaToPlovdiv: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  departureTime: '07:07',
  arrivalTime: '09:09',
  trainNumber: 'ДЕМО-0002',
  trainCategory: 'DEMO',
  trainName: 'Демо Експрес 2',
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

const transferAtPlovdiv: RawPayload = {
  kind: 'transfer',
  fromStationId: 'demo-station-plovdiv',
  toStationId: 'demo-station-plovdiv',
  plannedMinutes: 25,
  stationChangeRequired: false,
  provenance: demoProvenance,
};

const trainPlovdivToLongName: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-plovdiv',
  toStationId: 'demo-station-long-name',
  departureTime: '09:34',
  arrivalTime: '12:12',
  trainNumber: 'ДЕМО-0003',
  trainCategory: 'DEMO',
  trainName: 'Демо Пътнически 3',
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

/** Walking transfer: the two legs use different demo stations. */
const transferLongNameToMixed: RawPayload = {
  kind: 'transfer',
  fromStationId: 'demo-station-long-name',
  toStationId: 'demo-station-mixed',
  plannedMinutes: 12,
  stationChangeRequired: true,
  provenance: demoProvenance,
};

const trainMixedToVarna: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-mixed',
  toStationId: 'demo-station-varna',
  departureTime: '13:13',
  arrivalTime: '17:17',
  trainNumber: 'ДЕМО-0004',
  trainCategory: 'DEMO',
  trainName: 'Демо Експрес 4',
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

const trainSofiaToPlovdivNight: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  departureTime: '23:23',
  arrivalTime: '02:02',
  trainNumber: 'ДЕМО-0005',
  trainCategory: 'DEMO',
  trainName: 'Демо Нощен 5',
  departureDayOffset: 0,
  arrivalDayOffset: 1,
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

const transferAtPlovdivNight: RawPayload = {
  kind: 'transfer',
  fromStationId: 'demo-station-plovdiv',
  toStationId: 'demo-station-plovdiv',
  plannedMinutes: 18,
  stationChangeRequired: false,
  provenance: demoProvenance,
};

const trainPlovdivToVarnaNight: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-plovdiv',
  toStationId: 'demo-station-varna',
  departureTime: '02:20',
  arrivalTime: '05:05',
  trainNumber: 'ДЕМО-0006',
  trainCategory: 'DEMO',
  trainName: 'Демо Нощен 6',
  departureDayOffset: 1,
  arrivalDayOffset: 1,
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

/** Latin-script train number, both times unknown ("unknown", never estimated). */
const trainLatinToMixedNullTimes: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-latin',
  toStationId: 'demo-station-mixed',
  departureTime: null,
  arrivalTime: null,
  trainNumber: 'DEMO-0007',
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

const trainSofiaToLongName: RawPayload = {
  kind: 'train',
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-long-name',
  departureTime: '11:11',
  arrivalTime: '14:14',
  trainNumber: 'ДЕМО-0008',
  trainCategory: 'DEMO',
  trainName: 'Демо Пътнически 8',
  providerStatus: DEMO_STATUS,
  provenance: demoProvenance,
};

export const DEMO_JOURNEY_PAYLOADS_BY_ROUTE: Readonly<
  Record<string, readonly RawPayload[]>
> = {
  [demoRouteKey('demo-station-sofia-central', 'demo-station-plovdiv')]: [
    {
      id: 'demo-journey-direct',
      segments: [trainSofiaToPlovdivDirect],
      legs: [trainSofiaToPlovdivDirect],
      durationMinutes: 122,
      provenance: demoProvenance,
    },
  ],
  [demoRouteKey('demo-station-sofia-central', 'demo-station-varna')]: [
    {
      id: 'demo-journey-multi-transfer',
      segments: [trainSofiaToPlovdiv, trainPlovdivToLongName, trainMixedToVarna],
      legs: [
        trainSofiaToPlovdiv,
        transferAtPlovdiv,
        trainPlovdivToLongName,
        transferLongNameToMixed,
        trainMixedToVarna,
      ],
      durationMinutes: 610,
      provenance: demoProvenance,
    },
    {
      id: 'demo-journey-midnight',
      segments: [trainSofiaToPlovdivNight, trainPlovdivToVarnaNight],
      legs: [trainSofiaToPlovdivNight, transferAtPlovdivNight, trainPlovdivToVarnaNight],
      durationMinutes: 342,
      provenance: demoProvenance,
    },
  ],
  [demoRouteKey('demo-station-sofia-central', 'demo-station-long-name')]: [
    {
      id: 'demo-journey-long-names',
      segments: [trainSofiaToLongName],
      legs: [trainSofiaToLongName],
      durationMinutes: 183,
      provenance: demoProvenance,
    },
  ],
  [demoRouteKey('demo-station-latin', 'demo-station-mixed')]: [
    {
      id: 'demo-journey-null-times',
      segments: [trainLatinToMixedNullTimes],
      legs: [trainLatinToMixedNullTimes],
      provenance: demoProvenance,
    },
  ],
};

/**
 * A route between two known demo stations that deliberately has NO journeys —
 * the "empty result" fixture (Appendix A.3). `searchJourneys` on it resolves
 * with `journeys: []` (envelope, never a rejection).
 */
export const DEMO_EMPTY_ROUTE = {
  fromStationId: 'demo-station-plovdiv',
  toStationId: 'demo-station-latin',
} as const;

/* ------------------------------------------------------------------ */
/* Deliberately schema-violating payloads (scenario 'malformed').       */
/* Never shown to anyone; they exist to prove the boundary rejects      */
/* garbage with 'invalid_response' instead of crashing the app.         */
/* ------------------------------------------------------------------ */

export const MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD: RawPayload = {
  search: { fromStationId: 123, toStationId: null, date: 'not-a-date' },
  journeys: [
    {
      id: '', // empty identifier
      segments: 'not-an-array', // wrong type
      legs: [{ kind: 'teleport', fromStationId: 1 }], // unknown leg discriminant
      durationMinutes: -5.5, // negative, non-integer
      provenance: { kind: 'mock' }, // unknown provenance discriminant
    },
  ],
  fetchedAt: 999, // wrong type
  provenance: { kind: 'live' }, // unknown provenance discriminant
};

/**
 * Schema-VALID except for the DEC-006 journey invariant: `segments` silently
 * drops the second train leg. The refinement must reject it — segments are
 * never re-derived from legs (inventing data).
 */
export const MALFORMED_JOURNEY_INVARIANT_PAYLOAD: RawPayload = {
  id: 'demo-journey-broken-invariant',
  segments: [trainSofiaToPlovdivNight],
  legs: [trainSofiaToPlovdivNight, transferAtPlovdivNight, trainPlovdivToVarnaNight],
  durationMinutes: 342,
  provenance: demoProvenance,
};
