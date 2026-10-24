/**
 * DEMO station dataset — SYNTHETIC DATA, NOT REAL BDZ STATIONS.
 *
 * WHY: DEC-002 keeps the app mock-only and Appendix C records that no
 * licensed station dataset exists (docs/station-dataset-licensing.md).
 * plan.md 4.5 explicitly allows shipping "clearly labelled demo data" when
 * no lawful source exists. Therefore:
 *
 * - every name is invented and carries the "Демо"/"Demo" marker;
 * - every coordinate is an invented grid point, not a real station;
 * - one station has NO coordinates (missing data must render as
 *   "unknown", never invented — plan.md 17.5);
 * - every record carries `demo` provenance (DEC-006) and the UI must show
 *   the demo label wherever these records are rendered (rule 6);
 * - nothing here may ever be presented as official BDZ data.
 *
 * A regression test (tests/stations/demo-stations.test.ts) enforces the
 * marker, the demo provenance on every fixture, uniqueness of ids, and the
 * presence of long / Latin / mixed-script / missing-field cases.
 */

import type { InformationProvenance, Station, StationDirectory } from '../../../types';

/** Fixed timestamp so fixtures and snapshots are deterministic. */
export const DEMO_FETCHED_AT = '2026-10-23T00:00:00.000Z';

export function demoProvenance(): InformationProvenance {
  return { kind: 'demo', fetchedAt: DEMO_FETCHED_AT };
}

export const DEMO_STATIONS: readonly Station[] = [
  {
    id: 'demo-001',
    name: 'Демо гара Алфа',
    alternateName: 'Demo Station Alpha',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.7, longitude: 23.3 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-002',
    name: 'Демо гара Бета',
    alternateName: 'Demo Station Beta',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.75, longitude: 25.5 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-003',
    name: 'Демо гара Гама',
    countryCode: 'BG',
    kind: 'demo-halt',
    location: { latitude: 43.2, longitude: 27.9 },
    provenance: demoProvenance(),
  },
  {
    // No coordinates on purpose: the detail card must show "unknown".
    id: 'demo-004',
    name: 'Демо гара Делта',
    countryCode: 'BG',
    kind: 'demo-halt',
    provenance: demoProvenance(),
  },
  {
    id: 'demo-005',
    name: 'Демо гара Епсилон',
    alternateName: 'Demo Station Epsilon',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.15, longitude: 24.75 },
    provenance: demoProvenance(),
  },
  {
    // Very long name (layout stress: wrapping, text scaling).
    id: 'demo-006',
    name: 'Демо гара с изключително дълго име за проверка на пречупването на текста и мащабирането на шрифта при големи размери',
    alternateName:
      'Demo Station With Extremely Long Name For Text Wrapping And Font Scaling Layout Stress Testing',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 43.6, longitude: 26.85 },
    provenance: demoProvenance(),
  },
  {
    // Mixed-script display name.
    id: 'demo-007',
    name: 'Демо St. Zeta',
    alternateName: 'Demo St. Zeta',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.9, longitude: 27.45 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-008',
    name: 'Демо-гара Ета-Прим',
    alternateName: 'Demo Eta Prim',
    countryCode: 'BG',
    kind: 'demo-halt',
    location: { latitude: 43.35, longitude: 24.6 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-009',
    name: 'Демо гара Тета',
    aliases: ['Демо Тета Център', 'Demo Theta Central'],
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.5, longitude: 27.25 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-010',
    name: 'Демо гара Йота',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 43.05, longitude: 25.65 },
    provenance: demoProvenance(),
  },
  {
    // Latin alternate name with diacritics (diacritic-insensitive search).
    id: 'demo-011',
    name: 'Демо гара Капа',
    alternateName: 'Démo Kappá',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.35, longitude: 26.15 },
    provenance: demoProvenance(),
  },
  {
    // No coordinates on purpose (second missing-geometry case).
    id: 'demo-012',
    name: 'Демо Ламбда Север',
    countryCode: 'BG',
    provenance: demoProvenance(),
  },
  {
    id: 'demo-013',
    name: 'Демо Мю-Юг',
    alternateName: 'Demo Mu South',
    countryCode: 'BG',
    kind: 'demo-halt',
    location: { latitude: 42.05, longitude: 25.25 },
    provenance: demoProvenance(),
  },
  {
    // Mixed Cyrillic/Latin name.
    id: 'demo-014',
    name: 'Демо Ksi / Кси',
    alternateName: 'Demo Ksi',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 43.8, longitude: 24.25 },
    provenance: demoProvenance(),
  },
  {
    // Latin-script display name (name field itself is Latin).
    id: 'demo-015',
    name: 'Demo Omikron',
    alternateName: 'Демо гара Омикрон',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.6, longitude: 25.95 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-016',
    name: 'Демо гара Пи-Разпределителна',
    alternateName: 'Demo Pi Marshalling',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 43.45, longitude: 27.05 },
    provenance: demoProvenance(),
  },
  {
    // Diacritics in the alternate name (normalize tests).
    id: 'demo-017',
    name: 'Демо гара Ро',
    alternateName: 'Dëmö Rhô',
    countryCode: 'BG',
    kind: 'demo-halt',
    location: { latitude: 42.25, longitude: 23.85 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-018',
    name: 'Демо гара Сигма Междинна',
    aliases: ['Демо Сигма спирка'],
    countryCode: 'BG',
    kind: 'demo-halt',
    location: { latitude: 43.15, longitude: 26.45 },
    provenance: demoProvenance(),
  },
  {
    // Mixed-script name.
    id: 'demo-019',
    name: 'Демо Tau Terminal',
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.85, longitude: 24.05 },
    provenance: demoProvenance(),
  },
  {
    id: 'demo-020',
    name: 'Демо гара Омега',
    alternateName: 'Demo Station Omega',
    aliases: ['Демо Омега край'],
    countryCode: 'BG',
    kind: 'demo-station',
    location: { latitude: 42.95, longitude: 23.15 },
    provenance: demoProvenance(),
  },
];

/**
 * Versioned demo directory (src/types/station.ts shape). The attribution
 * text is the demo disclaimer itself: this data derives from no third-party
 * source (docs/station-dataset-licensing.md Option E).
 */
export const DEMO_STATION_DIRECTORY: StationDirectory = {
  version: 'demo-stations-2026-10-23',
  stations: DEMO_STATIONS,
  fetchedAt: DEMO_FETCHED_AT,
  expiresAt: '2099-01-01T00:00:00.000Z',
  attribution: 'Demo dataset — synthetic stations, not real BDZ data.',
};
