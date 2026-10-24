/**
 * Feature-local types for the stations feature (plan.md 17.5).
 *
 * Domain types live in `src/types/` (DEC-006) and are imported, never
 * duplicated. Types here describe ONLY the presentation of this feature:
 * view modes, directory/network states, the location permission port and
 * the translation contract.
 *
 * Rules encoded here:
 * - rule 6 / DEC-006: every rendered station carries provenance and a
 *   visible label.
 * - plan.md 17.5: foreground location permission is requested ONLY from a
 *   user-initiated "nearby stations" action; manual selection works without
 *   any permission; no location history is stored (the raw position never
 *   enters application state — see model/nearby.ts).
 * - addbeforerelease.txt 8: all user-visible strings come from the
 *   `stations.*` / `map.*` i18n keys via the `Translate` contract.
 */

import type { GeoPoint, Station } from '../../types';

/** Translation contract: i18n keys under `stations.*` / `map.*`. */
export type Translate = (
  key: string,
  params?: Readonly<Record<string, string | number>>,
) => string;

/** List is the accessible default; map is the optional extra (checklist 9). */
export type StationsViewMode = 'list' | 'map';

/** Directory load state. Demo fixtures are bundled, so this is instant in practice. */
export type DirectoryStatus = 'loading' | 'ready';

/** Connectivity as surfaced to the user (offline still shows bundled demo data). */
export type NetworkStatus = 'online' | 'offline';

/**
 * Outcome of a foreground location permission request. 'unavailable' covers
 * builds/modules where no location implementation is wired yet.
 */
export type LocationPermissionOutcome = 'granted' | 'denied' | 'unavailable';

/**
 * The ONLY door to device location in this feature. Implemented by the
 * screen via a platform location module (follow-up: `expo-location`, NOT
 * installed in this wave). Injected in tests.
 *
 * Contract:
 * - `requestForegroundPermission` MUST be called only after a user tap on
 *   the "nearby stations" action (never at mount, never on search).
 * - `getCurrentPosition` is called at most once per user action and only
 *   after `granted`. The returned point is used ephemerally and discarded.
 */
export interface LocationPort {
  requestForegroundPermission(): Promise<LocationPermissionOutcome>;
  getCurrentPosition(): Promise<GeoPoint | null>;
}

/** A station with its straight-line distance from the user (derived, in-memory only). */
export interface NearbyStation {
  station: Station;
  distanceMeters: number;
}
