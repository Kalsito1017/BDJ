/**
 * Stations feature public surface.
 *
 * `StationsScreen` is the single self-contained screen component the lead
 * wires into the tab shell (it imports `src/i18n` via the translation
 * bridge — see useStationsTranslate.ts). Everything else is exported for
 * reuse/testing; nothing here imports `src/app/`.
 */

export { StationsScreen, default } from './StationsScreen';
export type { StationsScreenProps } from './StationsScreen';
export { StationsView, SEARCH_QUERY_MAX_LENGTH } from './StationsView';
export type { StationsViewProps } from './StationsView';
export { DEMO_STATIONS, DEMO_STATION_DIRECTORY } from './data/demoStations';
export { searchStations } from './model/stationSearch';
export {
  findNearbyStations,
  distanceMeters,
  nearbyReducer,
  runNearbyStationsFlow,
  INITIAL_NEARBY_STATE,
} from './model/nearby';
export type { NearbyViewState, NearbyStatus, NearbyAction } from './model/nearby';
export { StationsMapSurface } from './map/StationsMapSurface';
export type { StationsMapSurfaceProps } from './map/StationsMapSurface';
export {
  StationsMap,
  MAP_STYLE_URL,
  BULGARIA_CENTER,
  BULGARIA_ZOOM,
} from './map/StationsMap';
export type { StationsMapProps } from './map/StationsMap';
export {
  MapAttribution,
  ATTRIBUTION_OPENFREEMAP,
  ATTRIBUTION_OSM_ODBL,
} from './map/MapAttribution';
export { loadMapLibre } from './map/loadMapLibre';
export type { MapLibreModule } from './map/loadMapLibre';
export { STATIONS_KEYS, MAP_KEYS } from './translationKeys';
export type {
  Translate,
  StationsViewMode,
  DirectoryStatus,
  NetworkStatus,
  LocationPort,
  LocationPermissionOutcome,
  NearbyStation,
} from './types';
