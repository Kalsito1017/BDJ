/**
 * Public data-access hook surface (Phase 3/4) — screens and features import
 * from HERE only. Everything below is mock-data-backed (DEC-002): results
 * carry `demo` provenance and no hook may be used to imply live or official
 * BDZ information (rules 1 and 6).
 *
 * Contract summary (see the individual modules for full semantics):
 *   AppDataProvider   — QueryClient + TrainDataProvider context (defaults:
 *                      MockTrainDataProvider + createAppQueryClient()).
 *   useStationSearch  — debounced station search; empty query = full directory.
 *   useJourneySearch  — journey search envelope; enabled only with a complete
 *                       from/to/date input; exposes refetch/isFetching/
 *                       dataUpdatedAt for honest freshness labelling.
 *   useJourney        — journey details by id.
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
  journeyQueryKeys,
  normalizeJourneySearch,
  normalizeSearchText,
  stationQueryKeys,
  type NormalizedJourneySearch,
} from './queryKeys';
