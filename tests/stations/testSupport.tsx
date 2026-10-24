/**
 * Shared test support for tests/stations/** (not a test file — testMatch
 * only picks up *.test.{ts,tsx}).
 *
 * All fixtures here are synthetic. Tests NEVER import the i18n bridge
 * (useStationsTranslate) or StationsScreen — those resolve `src/i18n`,
 * which is owned by the i18n-a11y agent; model/view tests inject `t`.
 */

import { useState } from 'react';

import type { Station } from '../../src/types';
import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import { searchStations } from '../../src/features/stations/model/stationSearch';
import { StationsView } from '../../src/features/stations/StationsView';
import type {
  DirectoryStatus,
  LocationPort,
  NetworkStatus,
  StationsViewMode,
  Translate,
} from '../../src/features/stations/types';

/** English test strings for the i18n keys used by the feature. */
export const TEST_STRINGS: Readonly<Record<string, string>> = {
  'stations.screen.title': 'Stations',
  'stations.search.label': 'Search stations',
  'stations.search.placeholder': 'Search by name',
  'stations.list.label': 'Station list',
  'stations.list.loading': 'Loading stations',
  'stations.list.empty.title': 'No stations found',
  'stations.list.empty.body': 'Try a different spelling',
  'stations.list.result_count': '{{count}} stations',
  'stations.view.list': 'List',
  'stations.view.map': 'Map',
  'stations.view.toggle_label': 'Switch list or map',
  'stations.detail.card_label': 'Station details',
  'stations.detail.name': 'Name',
  'stations.detail.alternate_name': 'Alternate name',
  'stations.detail.aliases': 'Aliases',
  'stations.detail.kind': 'Kind',
  'stations.detail.country': 'Country',
  'stations.detail.location': 'Location',
  'stations.detail.unknown': 'unknown',
  'stations.detail.close': 'Close',
  'stations.demo.badge': 'Demo data',
  'stations.demo.notice': 'Synthetic demo dataset, not real BDZ stations',
  'stations.offline.banner': 'Offline, showing bundled demo data',
  'stations.provenance.demo': 'Demo data',
  'stations.provenance.scheduled': 'Scheduled',
  'stations.provenance.cached_stale': 'Cached',
  'stations.provenance.real_time': 'Real-time',
  'stations.nearby.button': 'Nearby stations',
  'stations.nearby.title': 'Nearby stations',
  'stations.nearby.intro': 'Find stations near you',
  'stations.nearby.locating': 'Locating',
  'stations.nearby.requesting': 'Requesting permission',
  'stations.nearby.empty': 'No nearby stations',
  'stations.nearby.denied.title': 'Location permission denied',
  'stations.nearby.denied.body': 'You can still pick a station manually',
  'stations.nearby.unavailable': 'Location is not available',
  'stations.nearby.error': 'Could not determine your location',
  'stations.nearby.privacy_note': 'Your location is used once and never stored',
  'stations.nearby.manual_note': 'Manual selection works without permission',
  'stations.nearby.distance_meters': '{{meters}} m',
  'map.pending.title': 'map SDK pending DEC-012 — human decision',
  'map.pending.body': 'No map SDK is installed yet',
  'map.placeholder.label': 'Map placeholder',
  'map.disclaimer': 'A map line never implies an operational route or real-time service',
  'map.attribution.note': 'Map attribution will be shown here',
};

export const fakeTranslate: Translate = (key, params) => {
  let text = TEST_STRINGS[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(`{{${name}}}`, String(value));
    }
  }
  return text;
};

export interface StationsViewHarnessProps {
  t?: Translate;
  stations?: readonly Station[];
  initialQuery?: string;
  initialViewMode?: StationsViewMode;
  status?: DirectoryStatus;
  networkStatus?: NetworkStatus;
  locationPort?: LocationPort;
}

/**
 * Minimal state owner around StationsView (the same responsibilities as
 * StationsScreen, without the i18n bridge import).
 */
export function StationsViewHarness({
  t = fakeTranslate,
  stations = DEMO_STATIONS,
  initialQuery = '',
  initialViewMode = 'list',
  status = 'ready',
  networkStatus = 'online',
  locationPort = {
    async requestForegroundPermission() {
      return 'unavailable';
    },
    async getCurrentPosition() {
      return null;
    },
  },
}: StationsViewHarnessProps) {
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<StationsViewMode>(initialViewMode);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const filtered = searchStations(stations, query);

  return (
    <StationsView
      t={t}
      stations={filtered}
      query={query}
      onQueryChange={setQuery}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      status={status}
      networkStatus={networkStatus}
      selectedStation={selectedStation}
      onSelectStation={setSelectedStation}
      onCloseDetail={() => setSelectedStation(null)}
      locationPort={locationPort}
    />
  );
}

/** A synthetic in-test station (clearly synthetic name, demo provenance). */
export function makeTestStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 'test-demo-000',
    name: 'Демо гара Тест',
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-23T00:00:00.000Z' },
    ...overrides,
  };
}
