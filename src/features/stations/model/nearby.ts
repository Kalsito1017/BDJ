/**
 * Nearby-stations flow (plan.md 17.5: "request foreground location
 * permission only for a user-initiated nearby-station feature"; "manual
 * station selection that works without granting location permission";
 * addbeforerelease.txt 9 "list/map toggle… works without location
 * permission"; checklist 14 "no unnecessary location history in logs").
 *
 * Privacy design (deliberate, and asserted by tests):
 * - Permission is requested ONLY when `runNearbyStationsFlow` is invoked,
 *   which the UI does exclusively from a tap on the "nearby stations"
 *   action. Nothing at mount time touches the LocationPort.
 * - The raw position NEVER enters application state: it is read once,
 *   converted to derived distances, and dropped. `NearbyViewState` has no
 *   position field and no history array — repeated runs replace state.
 * - No persistence module is imported anywhere in this file; nothing is
 *   written to disk or storage.
 */

import type { GeoPoint, Station } from '../../../types';
import type { LocationPermissionOutcome, NearbyStation } from '../types';

export type NearbyStatus =
  | 'idle'
  | 'requesting-permission'
  | 'locating'
  | 'ready'
  | 'empty'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface NearbyViewState {
  status: NearbyStatus;
  /** Derived results only — replaced (never accumulated) on each run. */
  stations: readonly NearbyStation[];
}

export type NearbyAction =
  | { type: 'request-started' }
  | { type: 'permission-denied' }
  | { type: 'permission-unavailable' }
  | { type: 'locating' }
  | { type: 'result'; stations: readonly NearbyStation[] }
  | { type: 'error' }
  | { type: 'reset' };

export const INITIAL_NEARBY_STATE: NearbyViewState = { status: 'idle', stations: [] };

export function nearbyReducer(
  state: NearbyViewState,
  action: NearbyAction,
): NearbyViewState {
  switch (action.type) {
    case 'request-started':
      // Ignore re-entrant starts while a request is in flight (double taps).
      if (state.status === 'requesting-permission' || state.status === 'locating') {
        return state;
      }
      return { status: 'requesting-permission', stations: [] };
    case 'permission-denied':
      return { status: 'denied', stations: [] };
    case 'permission-unavailable':
      return { status: 'unavailable', stations: [] };
    case 'locating':
      return { status: 'locating', stations: [] };
    case 'result':
      return {
        status: action.stations.length > 0 ? 'ready' : 'empty',
        stations: action.stations,
      };
    case 'error':
      return { status: 'error', stations: [] };
    case 'reset':
      return INITIAL_NEARBY_STATE;
    default:
      return state;
  }
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Stations with coordinates, nearest first. Stations WITHOUT coordinates
 * are excluded here (never given an invented position); they remain fully
 * available to manual search/selection.
 */
export function findNearbyStations(
  stations: readonly Station[],
  origin: GeoPoint,
  limit?: number,
): NearbyStation[] {
  const withDistance: NearbyStation[] = [];
  for (const station of stations) {
    if (!station.location) continue;
    withDistance.push({
      station,
      distanceMeters: distanceMeters(origin, station.location),
    });
  }
  withDistance.sort((a, b) => {
    if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;
    return a.station.id < b.station.id ? -1 : 1;
  });
  return limit !== undefined && limit >= 0 ? withDistance.slice(0, limit) : withDistance;
}

export interface NearbyFlowOptions {
  port: {
    requestForegroundPermission(): Promise<LocationPermissionOutcome>;
    getCurrentPosition(): Promise<GeoPoint | null>;
  };
  stations: readonly Station[];
  dispatch: (action: NearbyAction) => void;
  limit?: number;
}

/**
 * The full nearby flow, called ONLY from the user's tap on "nearby
 * stations". Awaits permission -> one-shot position -> derived results.
 * The position is local to this function and is never stored or logged.
 */
export async function runNearbyStationsFlow(options: NearbyFlowOptions): Promise<void> {
  const { port, stations, dispatch, limit } = options;
  dispatch({ type: 'request-started' });

  let outcome: LocationPermissionOutcome;
  try {
    outcome = await port.requestForegroundPermission();
  } catch {
    dispatch({ type: 'permission-unavailable' });
    return;
  }

  if (outcome === 'denied') {
    dispatch({ type: 'permission-denied' });
    return;
  }
  if (outcome === 'unavailable') {
    dispatch({ type: 'permission-unavailable' });
    return;
  }

  dispatch({ type: 'locating' });
  let position: GeoPoint | null;
  try {
    position = await port.getCurrentPosition();
  } catch {
    dispatch({ type: 'error' });
    return;
  }
  if (position === null) {
    dispatch({ type: 'permission-unavailable' });
    return;
  }

  dispatch({ type: 'result', stations: findNearbyStations(stations, position, limit) });
}
