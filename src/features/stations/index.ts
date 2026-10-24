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
export { StationsView } from './StationsView';
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
