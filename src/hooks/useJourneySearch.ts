/**
 * useJourneySearch — journey search (plan.md §9 Phase 3/4) over the
 * configured `TrainDataProvider`.
 *
 * SEMANTICS (the contract mobile-ui codes against):
 *  - The query is enabled ONLY when `input` is non-null and has non-blank
 *    from/to/date (`normalizeJourneySearch`). With `null`/incomplete input:
 *    `result` is undefined, `journeys` is [], `isLoading`/`isError` are
 *    false and NO provider call is made — the screen shows its empty/form
 *    state, not an error.
 *  - `result` is the provider's `JourneySearchResult` envelope (search echo,
 *    `fetchedAt`, result-level `provenance`); `journeys` is the convenience
 *    projection (`result.journeys`, [] until data arrives).
 *  - EMPTY results are NOT an error: the provider resolves an envelope with
 *    `journeys: []` (Appendix A.5) — render the "no journeys" state.
 *  - Errors are typed `ProviderError` (never strings); map `error.code` ->
 *    `ERROR_MESSAGE_KEYS` -> `errors.*` (src/i18n/keys.ts). Unknown station
 *    ids reject `not_found`; scenario failures map to their codes.
 *  - `refetch()` re-runs the search manually; it is a no-op while the query
 *    is disabled. It does not reset `result` — the previous envelope stays
 *    visible until fresh data arrives.
 *  - FRESHNESS (rule 6): provenance labels come from the DATA
 *    (`result.provenance`/`journey.provenance` — `demo` from the mock).
 *    `dataUpdatedAt` (ms epoch of the last successful fetch, 0 before the
 *    first) and `isFetching` are exposed so a screen can honestly label
 *    "updated HH:mm" and "refreshing…":
 *      - while `isFetching` with data on screen -> background refresh;
 *      - `Date.now() - dataUpdatedAt > staleTime` -> data may be out of date:
 *        show a hint / "may be out of date" copy, BUT never label it
 *        `cached-stale` provenance — that kind requires the DEC-006 payload
 *        fields (`cachedAt`/`expiresAt`/`staleReason`) and is only produced
 *        when the data itself carries them.
 *  - On `isError` after a success, `result` keeps the last good envelope;
 *    screens decide whether to keep showing it (labelled with its age) or
 *    show the error state.
 */

import { useQuery } from '@tanstack/react-query';

import { createProviderError } from '../services/api/providerErrors';
import type { ProviderError } from '../types/errors';
import type { Journey, JourneySearch, JourneySearchResult } from '../types/journey';
import { useTrainDataProvider } from './AppDataProvider';
import { EMPTY_JOURNEYS, runProviderCall } from './internals';
import { journeyQueryKeys, normalizeJourneySearch } from './queryKeys';

export interface JourneySearchState {
  /** The provider's result envelope; undefined until the first successful fetch. */
  result: JourneySearchResult | undefined;
  /** `result.journeys`; [] while loading, disabled or on error. */
  journeys: readonly Journey[];
  /** True while the first load for the current search is in flight (no data yet). */
  isLoading: boolean;
  isError: boolean;
  /** Typed provider error for the UI to map to `errors.*`; null when not in error. */
  error: ProviderError | null;
  /** Manually re-run the search; no-op while `input` is null/incomplete. */
  refetch: () => void;
  /** True whenever a fetch (initial, refetch or background refresh) is in flight. */
  isFetching: boolean;
  /** Ms epoch of the last successful fetch (0 before the first) — freshness labelling. */
  dataUpdatedAt: number;
}

export function useJourneySearch(input: JourneySearch | null): JourneySearchState {
  const provider = useTrainDataProvider();
  const search = input === null ? null : normalizeJourneySearch(input);
  const enabled = search !== null;

  const result = useQuery<JourneySearchResult, ProviderError>({
    queryKey: journeyQueryKeys.search(search),
    queryFn: ({ signal }) => {
      if (search === null) {
        // Unreachable in practice: `enabled` gates the fetch. Kept as a typed
        // guard so queryFn can never run with an incomplete search.
        throw createProviderError(
          'unknown',
          'useJourneySearch queryFn ran while the search input was incomplete.',
        );
      }
      return runProviderCall(() => provider.searchJourneys(search, { signal }));
    },
    enabled,
    // No React Query auto-retry — the request executor owns retries (DEC-007).
    retry: false,
  });

  return {
    result: result.data,
    journeys: result.data?.journeys ?? EMPTY_JOURNEYS,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: () => {
      if (!enabled) return;
      void result.refetch();
    },
    isFetching: result.isFetching,
    dataUpdatedAt: result.dataUpdatedAt,
  };
}
