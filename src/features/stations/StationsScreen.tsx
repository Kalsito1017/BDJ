/**
 * StationsScreen — the self-contained screen component for the stations
 * feature (plan.md 17.5). The lead wires it into the tab shell at
 * integration; nothing here imports from `src/app/` (mobile-ui owns routes).
 *
 * Responsibilities:
 * - state: search query, list/map toggle, detail selection;
 * - data: the DEMO station dataset (no licensed dataset exists yet —
 *   docs/station-dataset-licensing.md). Every render path carries the demo
 *   label (rule 6 / DEC-006 provenance is on every fixture record).
 * - translations: `useStationsTranslate()` -> src/i18n (contract; keys in
 *   translationKeys.ts). A `translate` prop can override it (tests).
 * - location: an injected `LocationPort`. The default reports
 *   'unavailable' — no location module is wired in this wave and none is
 *   faked. Foreground permission is requested ONLY from the nearby button
 *   (NearbyStationsSection), never at mount.
 *
 * Follow-up (other wave, after dependencies are approved): implement
 * `LocationPort` on top of a location module (e.g. `expo-location`:
 * `requestForegroundPermissionsAsync()` then `getCurrentPositionAsync()`),
 * keeping this screen unchanged. `expo-location` is NOT a dependency today.
 *
 * MAP (DEC-012, decided 2026-10-24): the map area renders MapLibre React
 * Native against the OpenFreeMap "liberty" style — NO map API key exists.
 * The native map needs an Expo dev build (`npx expo prebuild` / EAS Build);
 * that build was NOT run in this workstream (Linux host, rules 5/8) and the
 * map draws zero pixels in unit tests. Everywhere the map cannot render,
 * the clearly-labelled MapPlaceholder shows instead (StationsMapSurface).
 */

import { useMemo, useState } from 'react';

import type { GeoPoint, Station } from '../../types';
import { FEATURE_FLAG_DEFINITIONS } from '../../types/feature-flags';
import { DEMO_STATIONS } from './data/demoStations';
import type { MapLibreModule } from './map/loadMapLibre';
import { searchStations } from './model/stationSearch';
import { StationsView } from './StationsView';
import { useStationsTranslate } from './useStationsTranslate';
import type {
  LocationPermissionOutcome,
  LocationPort,
  NetworkStatus,
  StationsViewMode,
  Translate,
} from './types';

/** Default port for builds without a wired location module: honest 'unavailable'. */
export const UNAVAILABLE_LOCATION_PORT: LocationPort = {
  async requestForegroundPermission(): Promise<LocationPermissionOutcome> {
    return 'unavailable';
  },
  async getCurrentPosition(): Promise<GeoPoint | null> {
    return null;
  },
};

export interface StationsScreenProps {
  /** Test seam. Defaults to the shared i18n bridge (`src/i18n`). */
  translate?: Translate;
  /** Location implementation (follow-up: real module). Default: 'unavailable'. */
  locationPort?: LocationPort;
  /** Connectivity indicator (Phase 5 wires a real one). Default: 'online'. */
  networkStatus?: NetworkStatus;
  initialViewMode?: StationsViewMode;
  initialQuery?: string;
  /**
   * `mapStationDiscovery` gate: no flag runtime exists yet
   * (src/types/feature-flags.ts is spec-only), so the committed default is
   * used unless a caller overrides it. Flag ON is NOT a ship approval —
   * DEC-012 + a licensed station dataset are still required (DEC-019 L8).
   */
  mapEnabled?: boolean;
  /** Test seam for the MapLibre module (see map/loadMapLibre.ts). */
  mapLibre?: MapLibreModule | null;
}

export function StationsScreen({
  translate,
  locationPort = UNAVAILABLE_LOCATION_PORT,
  networkStatus = 'online',
  initialViewMode = 'list',
  initialQuery = '',
  mapEnabled = FEATURE_FLAG_DEFINITIONS.mapStationDiscovery.defaultEnabled,
  mapLibre,
}: StationsScreenProps) {
  const i18nTranslate = useStationsTranslate();
  const t = translate ?? i18nTranslate;

  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<StationsViewMode>(initialViewMode);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Demo directory only (bundled fixtures). When a licensed directory lands
  // (DEC-012 / docs/station-dataset-licensing.md), it replaces DEMO_STATIONS
  // here via the services layer — this screen's shape stays.
  const stations: Station[] = useMemo(
    () => searchStations(DEMO_STATIONS, query),
    [query],
  );

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) ?? null,
    [stations, selectedStationId],
  );

  return (
    <StationsView
      t={t}
      stations={stations}
      query={query}
      onQueryChange={setQuery}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      status="ready"
      networkStatus={networkStatus}
      selectedStation={selectedStation}
      onSelectStation={(station) => setSelectedStationId(station.id)}
      onCloseDetail={() => setSelectedStationId(null)}
      locationPort={locationPort}
      mapEnabled={mapEnabled}
      mapLibre={mapLibre}
    />
  );
}

export default StationsScreen;
