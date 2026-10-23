/**
 * Local persistence records: favourites and recent searches
 * (plan.md section 3.5, Phase 5). Stored on-device only (AsyncStorage);
 * no account, no server sync in the current scope (DEC-003).
 *
 * Records are re-validated on read (Zod in Phase 4/5, DEC-007): local
 * storage is also untrusted input — it may hold data written by an older
 * app version or be edited on a rooted device.
 *
 * Privacy (plan.md section 12): recent searches reveal travel intent.
 * They stay on-device, are user-deletable, and are cleared with
 * "clear saved items" (with confirmation — plan.md section 8).
 */

import type { EntityId, ISODateTime } from './common';
import type { JourneySearch } from './journey';

/** A saved station (plan.md section 3.5). */
export interface FavouriteStation {
  id: EntityId;
  stationId: string;
  /** User label; optional — display falls back to the station's official name. */
  label?: string;
  createdAt: ISODateTime;
  sortOrder: number;
}

/** A saved origin→destination pair. */
export interface FavouriteRoute {
  id: EntityId;
  fromStationId: string;
  toStationId: string;
  label?: string;
  createdAt: ISODateTime;
  sortOrder: number;
}

/** A record of a past search (plan.md section 3.5). */
export interface RecentSearchRecord {
  id: EntityId;
  search: JourneySearch;
  searchedAt: ISODateTime;
  /** Number of results shown at the time, for the "recent" list subtitle. */
  resultCount?: number;
}

/**
 * Retention/size policy for local stores. Defaults are SPEC values for the
 * implementers (Phase 5) and may be adjusted by the product owner:
 * - `maxRecentSearches`: 20
 * - `maxFavourites`: 100
 * - Recent searches expire after 90 days unless the user clears them earlier.
 */
export interface LocalStorePolicy {
  maxRecentSearches: number;
  maxFavourites: number;
  recentSearchTtlDays: number;
}

export const DEFAULT_LOCAL_STORE_POLICY: LocalStorePolicy = {
  maxRecentSearches: 20,
  maxFavourites: 100,
  recentSearchTtlDays: 90,
};

/** Persisted root record; versioned so future migrations are explicit. */
export interface LocalStoreSnapshot {
  schemaVersion: 1;
  favouriteStations: readonly FavouriteStation[];
  favouriteRoutes: readonly FavouriteRoute[];
  recentSearches: readonly RecentSearchRecord[];
  policy: LocalStorePolicy;
}
