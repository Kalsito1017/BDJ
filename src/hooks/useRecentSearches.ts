/**
 * useRecentSearches — past journey searches (plan.md §3.5, §9 Phase 5) over
 * the injectable `LocalStore` (DEC-006).
 *
 * SEMANTICS (the contract mobile-ui codes against; additive fields may be
 * added, names will not change):
 *  - `recents` — persisted `RecentSearchRecord[]`, newest first (by
 *    `searchedAt`). Empty until hydration settles. EXPIRY: records older than
 *    90 days (`LocalStorePolicy.recentSearchTtlDays`) are dropped — enforced
 *    on write and re-applied on read. CAP: 20 records (`maxRecentSearches`).
 *  - `isLoading` — true until the local snapshot is hydrated.
 *  - `recordSearch(input)` — records a completed search. DEDUPE: the same
 *    from/to/date replaces its older record ("newest wins") — repeating a
 *    search never creates duplicates. Invalid input is a caller bug and
 *    throws `LocalStoreInputError` (screens pass DEC-022 validated searches).
 *    No return value (contract); the store returns the record for tests.
 *  - `removeRecent(id)` — removes one record (no-op when unknown).
 *  - `clearAll()` — clears ALL RECENT SEARCHES ONLY. It never touches
 *    favourites (they have their own removals). The destructive-action
 *    confirmation around it is a screen concern (plan.md §8).
 *  - `notices` (ADDITIVE) — local-store corruption/write notices
 *    (Appendix B.4); empty in normal use. See `useFavouriteRoutes`.
 *
 * PRIVACY (plan.md §12): recent searches reveal travel intent. They stay
 * on-device only, are user-deletable here, and store nothing beyond the
 * documented `JourneySearch` echo (ids + date/time/limit), `searchedAt` and
 * an optional `resultCount` — enforced by a key-path allowlist test.
 *
 * Reactivity: `useSyncExternalStore` over the store — every mounted hook sees
 * record/remove/clear immediately.
 */

import { useSyncExternalStore } from 'react';

import type { EntityId } from '../types/common';
import type { RecentSearchRecord } from '../types/favourites';
import type { JourneySearch } from '../types/journey';
import type { LocalStoreNotice } from '../services/storage/localStore';
import { useLocalStore } from './localStoreContext';

export interface RecentSearchesState {
  recents: readonly RecentSearchRecord[];
  isLoading: boolean;
  recordSearch: (input: JourneySearch) => void;
  removeRecent: (id: EntityId) => void;
  /** Clears ALL recent searches (never favourites). */
  clearAll: () => void;
  /** ADDITIVE: local-store corruption/write notices (empty in normal use).
   *  Always returned by the default implementation — optional in the type so
   *  consumer mocks may omit it. */
  notices?: readonly LocalStoreNotice[];
}

export function useRecentSearches(): RecentSearchesState {
  const store = useLocalStore();
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return {
    recents: state.snapshot.recentSearches,
    isLoading: !state.hydrated,
    recordSearch: (input) => {
      store.recordSearch(input);
    },
    removeRecent: (id) => store.removeRecent(id),
    clearAll: () => store.clearRecentSearches(),
    notices: state.notices,
  };
}
