/**
 * Public data-access hook surface (Phase 3/4) — screens and features import
 * from HERE only. Everything below is mock-data-backed (DEC-002): results
 * carry `demo` provenance and no hook may be used to imply live or official
 * BDZ information (rules 1 and 6).
 *
 * Contract summary (see the individual modules for full semantics):
 *   AppDataProvider   — QueryClient + TrainDataProvider context (defaults:
 *                      MockTrainDataProvider + createAppQueryClient());
 *                      also provides the LocalStore + NetworkStatusPort
 *                      contexts (Phase 5) — both injectable for tests.
 *   useStationSearch  — debounced station search; empty query = full directory.
 *   useJourneySearch  — journey search envelope; enabled only with a complete
 *                       from/to/date input; exposes refetch/isFetching/
 *                       dataUpdatedAt/isStale for honest freshness labelling.
 *   useJourney        — journey details by id.
 *   useFavouriteRoutes / useRecentSearches — persisted local store (DEC-006),
 *                       reactive via useSyncExternalStore.
 *   useStoreNotices   — local-store corruption/write notices (DEC-007 App. B.4
 *                       "reset per-field with a visible notice"), newest first.
 *   useNetworkStatus  — NetworkStatusPort-backed connectivity hint + manual
 *                       override (tests/demos); no real source in this build.
 *
 * Errors are typed `ProviderError` — map `error.code` through
 * `src/i18n/keys.ts` (`ERROR_MESSAGE_KEYS`) to `errors.*` i18n keys.
 */

export {
  APP_CACHE_POLICY,
  AppDataProvider,
  createAppQueryClient,
  useTrainDataProvider,
  type AppDataProviderProps,
} from './AppDataProvider';
export {
  STATION_SEARCH_DEBOUNCE_MS,
  useStationSearch,
  type StationSearchState,
} from './useStationSearch';
export { useJourneySearch, type JourneySearchState } from './useJourneySearch';
export { useJourney, type JourneyState } from './useJourney';
export {
  LocalStoreProvider,
  useLocalStore,
  type LocalStoreProviderProps,
} from './localStoreContext';
export {
  useFavouriteRoutes,
  type AddFavouriteRouteInput,
  type FavouriteRoutesState,
} from './useFavouriteRoutes';
export { useRecentSearches, type RecentSearchesState } from './useRecentSearches';
export {
  useStoreNotices,
  type LocalStoreNotice,
  type LocalStoreNoticeReason,
  type StoreNoticesState,
} from './useStoreNotices';
export {
  NetworkStatusProvider,
  useNetworkStatus,
  useNetworkStatusPort,
  wireNetworkStatusToReactQuery,
  type NetworkStatusProviderProps,
  type NetworkStatusState,
} from './useNetworkStatus';
export {
  journeyQueryKeys,
  normalizeJourneySearch,
  normalizeSearchText,
  stationQueryKeys,
  type NormalizedJourneySearch,
} from './queryKeys';
