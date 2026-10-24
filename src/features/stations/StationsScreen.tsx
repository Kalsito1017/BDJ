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
 */

import { useMemo, useState } from 'react';

import type { GeoPoint, Station } from '../../types';
import { DEMO_STATIONS } from './data/demoStations';
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
}

export function StationsScreen({
  translate,
  locationPort = UNAVAILABLE_LOCATION_PORT,
  networkStatus = 'online',
  initialViewMode = 'list',
  initialQuery = '',
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
    />
  );
}

export default StationsScreen;
