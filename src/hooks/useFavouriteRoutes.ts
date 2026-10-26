/**
 * useFavouriteRoutes — saved origin→destination pairs (plan.md §3.5, §9
 * Phase 5) over the injectable `LocalStore` (DEC-006).
 *
 * SEMANTICS (the contract mobile-ui codes against; additive fields may be
 * added, names will not change):
 *  - `favourites` — persisted `FavouriteRoute[]`, most recently added first;
 *    empty until hydration settles. Survives app restarts (AsyncStorage).
 *  - `isLoading` — true until the local snapshot is hydrated (one tick; the
 *    store auto-loads). Lists render their skeleton on it.
 *  - `addFavourite(input)` — IDENTITY-IDEMPOTENT: adding the same
 *    from/to again returns the EXISTING record unchanged (same id, same
 *    createdAt, same label) and does not reorder. Optional `label` is a free
 *    user label (≤ 80 chars, any charset — checklist §2). Invalid input is a
 *    caller bug and throws `LocalStoreInputError` (screens pass station-picker
 *    ids and a label the form limits to 80 chars).
 *  - `removeFavourite(id)` — removes the record with this id (no-op when
 *    unknown). Deleting saved items never needs confirmation here; the
 *    confirmation is a screen concern (plan.md §8).
 *  - `notices` (ADDITIVE) — corruption/write notices from the local store
 *    (Appendix B.4). When non-empty a screen should show a one-off
 *    "saved items could not be fully restored" notice (i18n key proposed in
 *    the data-provider report). Empty for normal operation.
 *
 * Reactivity: `useSyncExternalStore` over the store — every mounted hook sees
 * add/remove immediately (and changes made from another hook instance).
 */

import { useSyncExternalStore } from 'react';

import type { EntityId } from '../types/common';
import type { FavouriteRoute } from '../types/favourites';
import { useLocalStore } from './localStoreContext';
import type { LocalStoreNotice } from '../services/storage/localStore';

export interface AddFavouriteRouteInput {
  fromStationId: string;
  toStationId: string;
  label?: string;
}

export interface FavouriteRoutesState {
  favourites: readonly FavouriteRoute[];
  isLoading: boolean;
  addFavourite: (input: AddFavouriteRouteInput) => FavouriteRoute;
  removeFavourite: (id: EntityId) => void;
  /** ADDITIVE: local-store corruption/write notices (empty in normal use).
   *  Always returned by the default implementation — optional in the type so
   *  consumer mocks may omit it. */
  notices?: readonly LocalStoreNotice[];
}

export function useFavouriteRoutes(): FavouriteRoutesState {
  const store = useLocalStore();
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return {
    favourites: state.snapshot.favouriteRoutes,
    isLoading: !state.hydrated,
    addFavourite: (input) => store.addFavouriteRoute(input),
    removeFavourite: (id) => store.removeFavourite(id),
    notices: state.notices,
  };
}
