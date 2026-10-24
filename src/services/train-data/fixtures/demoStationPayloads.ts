/**
 * DEMO station payloads — fixture data for MockTrainDataProvider
 * (Appendix A.3; DEC-002: mock-only).
 *
 * EVERY value here is synthetic and invented for development/tests. These are
 * NOT real BDZ stations, names, codes or coordinates, and they must never be
 * presented as real data (rule 1; checklist §1: "Mock provider clearly labelled
 * 'demo data' everywhere it is shown"). No personal data of any kind.
 *
 * Coverage required by Appendix A.3:
 * - long Bulgarian station name (layout stress)          -> demo-station-long-name
 * - Cyrillic name                                        -> demo-station-sofia-central
 * - Latin name                                           -> demo-station-latin
 * - mixed Cyrillic + Latin name                          -> demo-station-mixed
 * - station without coordinates                          -> demo-station-no-coords
 * - deliberately schema-violating payloads (scenario)    -> MALFORMED_* below
 */

import type { RawPayload } from './rawPayload';

/** Placeholder "obtained at" stamp for fixture payloads; the provider re-stamps
 *  real `fetchedAt` values from its injected clock at call time (Appendix A.6). */
export const DEMO_PAYLOAD_FETCHED_AT = '2026-01-01T00:00:00.000Z';

const demoProvenance = { kind: 'demo', fetchedAt: DEMO_PAYLOAD_FETCHED_AT } as const;

/** Synthetic coordinates — invented, deliberately not verified map data. */
export const DEMO_STATION_PAYLOADS: readonly RawPayload[] = [
  {
    id: 'demo-station-sofia-central',
    name: 'Демо Централна гара София',
    alternateName: 'Demo Sofia Central Station',
    aliases: ['Демо София Централна', 'Demo Sofia Central'],
    countryCode: 'BG',
    location: { latitude: 42.7, longitude: 23.33 },
    kind: 'demo-station',
    provenance: demoProvenance,
  },
  {
    id: 'demo-station-plovdiv',
    name: 'Демо гара Пловдив',
    alternateName: 'Demo Plovdiv Station',
    countryCode: 'BG',
    location: { latitude: 42.14, longitude: 24.75 },
    kind: 'demo-station',
    provenance: demoProvenance,
  },
  {
    id: 'demo-station-varna',
    name: 'Демо гара Варна',
    alternateName: 'Demo Varna Station',
    countryCode: 'BG',
    location: { latitude: 43.21, longitude: 27.92 },
    kind: 'demo-station',
    provenance: demoProvenance,
  },
  {
    // Long Bulgarian name — layout stress for every screen that renders it.
    id: 'demo-station-long-name',
    name: 'Демо измислена гара с изключително дълго име за стрес тестване на оформлението',
    countryCode: 'BG',
    location: { latitude: 42.55, longitude: 25.11 },
    kind: 'demo-station',
    provenance: demoProvenance,
  },
  {
    // Latin-script name only.
    id: 'demo-station-latin',
    name: 'Demo North Junction Halt',
    aliases: ['DNJ'],
    countryCode: 'BG',
    location: { latitude: 43.01, longitude: 25.55 },
    kind: 'demo-station',
    provenance: demoProvenance,
  },
  {
    // Mixed Cyrillic + Latin in one name.
    id: 'demo-station-mixed',
    name: 'Демо Mixed-Name Халт',
    alternateName: 'Demo Смесен Mixed Halt',
    countryCode: 'BG',
    location: { latitude: 42.87, longitude: 24.02 },
    kind: 'demo-station',
    provenance: demoProvenance,
  },
  {
    // No coordinates at all — the map/list UI must cope without them.
    id: 'demo-station-no-coords',
    name: 'Демо гара без координати',
    alternateName: 'Demo Station Without Coordinates',
    countryCode: 'BG',
    kind: 'demo-station',
    provenance: demoProvenance,
  },
];

/** Full raw directory payload (station-directory boundary). */
export const DEMO_STATION_DIRECTORY_PAYLOAD: RawPayload = {
  version: 'demo-directory-1',
  stations: DEMO_STATION_PAYLOADS,
  fetchedAt: DEMO_PAYLOAD_FETCHED_AT,
  expiresAt: '2026-01-02T00:00:00.000Z',
  attribution: 'Demo fixture data (synthetic) — not real BDZ information.',
};

/* ------------------------------------------------------------------ */
/* Deliberately schema-violating payloads (scenario 'malformed').       */
/* Used to prove the boundary rejects garbage WITHOUT crashing.         */
/* ------------------------------------------------------------------ */

export const MALFORMED_STATION_PAYLOAD: RawPayload = {
  id: 42, // wrong type: must be a non-empty string
  name: null, // wrong type: must be a non-empty string
  countryCode: 'Bulgaria', // not ISO 3166-1 alpha-2
  location: { latitude: 900, longitude: 'east' }, // out of range + wrong type
  provenance: { kind: 'live' }, // unknown discriminant + missing fields
};

export const MALFORMED_STATION_DIRECTORY_PAYLOAD: RawPayload = {
  version: '', // empty
  stations: [MALFORMED_STATION_PAYLOAD, 'not-an-object'],
  fetchedAt: 'yesterday', // not ISO 8601
  expiresAt: 12345, // wrong type
};
