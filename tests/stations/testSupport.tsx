/**
 * Shared test support for tests/stations/** (not a test file — testMatch
 * only picks up *.test.{ts,tsx}).
 *
 * All fixtures here are synthetic. Tests NEVER import the i18n bridge
 * (useStationsTranslate); model/view tests inject `t` and inject the
 * MapLibre module (there is no native map in this environment — the map
 * draws zero pixels here and no test may claim otherwise).
 *
 * `makeMapLibreMock()` is THE mock for `@maplibre/maplibre-react-native`
 * (v11 `Map`/`Camera`/`Marker` surface). Suites either inject it through
 * the `mapLibre` prop or `jest.mock` the package with it (see
 * map-libre-available.test.tsx); the map itself must be a dev build
 * (`npx expo prebuild` / EAS) and that build is NOT run here.
 */

import { isValidElement, Children, type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { MapLibreModule } from '../../src/features/stations/map/loadMapLibre';
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
import type { Station } from '../../src/types';

/**
 * English test strings for the i18n keys used by the feature (keys follow
 * the consolidated vocabulary — DEC-022 §5; values are synthetic and safe
 * to assert on). Placeholders use the catalog `{name}` style (DEC-019 L4).
 */
export const TEST_STRINGS: Readonly<Record<string, string>> = {
  'stations.title': 'Stations',
  'stations.search_label': 'Search stations',
  'stations.search_placeholder': 'Search by name',
  'stations.list_title': 'Station list',
  'stations.list.loading': 'Loading stations',
  'stations.empty': 'No stations found',
  'stations.list.empty.body': 'Try a different spelling',
  'stations.result_count': '{count} stations',
  'map.view_list': 'List',
  'map.view_map': 'Map',
  'map.list_map_toggle_label': 'Switch list or map',
  'map.title': 'Map',
  'stations.detail_title': 'Station details',
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
  'provenance.demo': 'Demo data',
  'provenance.scheduled': 'Scheduled',
  'provenance.cached_stale': 'Cached',
  'provenance.real_time': 'Real-time',
  'a11y.provenance_badge': 'Information source: {label}',
  'a11y.provenance_badge_hint': 'About the data source',
  'stations.nearby.button': 'Nearby stations',
  'stations.nearby_title': 'Nearby stations',
  'stations.nearby.intro': 'Find stations near you',
  'stations.nearby.locating': 'Locating',
  'stations.nearby.requesting': 'Requesting permission',
  'map.nearby_empty': 'No nearby stations',
  'map.permission_denied': 'Location permission denied',
  'map.permission_denied_body': 'You can still pick a station manually',
  'stations.nearby.unavailable': 'Location is not available',
  'stations.nearby.error': 'Could not determine your location',
  'stations.nearby.privacy_note': 'Your location is used once and never stored',
  'stations.nearby.manual_note': 'Manual selection works without permission',
  'stations.nearby.distance_meters': '{meters} m',
  // Fallback copy (map unavailable in this build) — the wording pinned here
  // is the wording proposed to the catalog owner in the map-wave report.
  'map.pending.title': 'Map unavailable in this build',
  'map.pending.body':
    'The interactive map needs a native development build and cannot render here. Station search works in list view.',
  'map.placeholder.label': 'Map placeholder',
  'map.disclaimer':
    'Station markers show demo data only. A marker does not mean a train is running.',
  'map.attribution_label': 'Map attribution',
  'map.attribution.note': 'Map attribution will be shown here',
};

export const fakeTranslate: Translate = (key, params) => {
  let text = TEST_STRINGS[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
};

/**
 * Mock for `@maplibre/maplibre-react-native` (v11 surface). The mock
 * records what the feature asks the map to draw so tests can assert on it:
 * the style URL, the camera stops, the marker ids and — crucially — the
 * KINDS of map children (any line/source layer would appear as 'other';
 * the feature must draw markers only, never routes).
 */
export interface MapLibreMock {
  module: MapLibreModule;
  calls: {
    mapStyle: (string | undefined)[];
    cameraStops: (Record<string, unknown> | undefined)[];
    markerIds: string[];
    childKinds: string[][];
  };
}

export function makeMapLibreMock(): MapLibreMock {
  const calls: MapLibreMock['calls'] = {
    mapStyle: [],
    cameraStops: [],
    markerIds: [],
    childKinds: [],
  };

  function MockCamera(props: { testID?: string; initialViewState?: unknown }) {
    calls.cameraStops.push(props.initialViewState as Record<string, unknown> | undefined);
    return <View testID={props.testID ?? 'maplibre-camera-mock'} />;
  }

  function MockMarker(props: {
    testID?: string;
    id?: string;
    onPress?: () => void;
    children?: ReactNode;
  }) {
    if (props.id !== undefined) calls.markerIds.push(props.id);
    return (
      <Pressable
        testID={props.testID ?? `maplibre-marker-mock-${props.id ?? 'anonymous'}`}
        onPress={props.onPress}
      >
        {props.children}
      </Pressable>
    );
  }

  function MockMap(props: { testID?: string; mapStyle?: string; children?: ReactNode }) {
    calls.mapStyle.push(props.mapStyle);
    calls.childKinds.push(
      Children.map(props.children, (child) => {
        if (!isValidElement(child)) return 'unknown';
        if (child.type === MockCamera) return 'camera';
        if (child.type === MockMarker) return 'marker';
        return 'other';
      }) ?? [],
    );
    return <View testID={props.testID ?? 'maplibre-map-mock'}>{props.children}</View>;
  }

  return {
    module: {
      Map: MockMap as unknown as MapLibreModule['Map'],
      Camera: MockCamera as unknown as MapLibreModule['Camera'],
      Marker: MockMarker as unknown as MapLibreModule['Marker'],
    },
    calls,
  };
}

export interface StationsViewHarnessProps {
  t?: Translate;
  stations?: readonly Station[];
  initialQuery?: string;
  initialViewMode?: StationsViewMode;
  status?: DirectoryStatus;
  networkStatus?: NetworkStatus;
  locationPort?: LocationPort;
  mapEnabled?: boolean;
  /**
   * `undefined` (default) = let the view lazy-require the package (the
   * loader path); `null` = force the labelled placeholder; a mock module =
   * draw the map through it.
   */
  mapLibre?: MapLibreModule | null;
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
  mapEnabled = true,
  mapLibre,
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
      mapEnabled={mapEnabled}
      mapLibre={mapLibre}
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
