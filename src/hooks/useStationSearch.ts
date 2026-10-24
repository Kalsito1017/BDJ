/**
 * useStationSearch — station picker / free-text station search (plan.md §9
 * Phase 3) over the configured `TrainDataProvider`.
 *
 * SEMANTICS (the contract mobile-ui codes against):
 *  - Empty or whitespace-only `query` returns the FULL station directory
 *    (picker UX: show everything until the user types). It uses
 *    `getStationDirectory` when the provider supports it and falls back to a
 *    text-less `searchStations` otherwise.
 *  - Non-empty text goes through the provider's own matching, so Cyrillic,
 *    Latin and mixed input all work (checklist §8; the mock does
 *    case-insensitive substring matching over names/aliases).
 *  - DEBOUNCE: the value present at mount is used immediately; every CHANGE
 *    of `query` is debounced by `STATION_SEARCH_DEBOUNCE_MS` (250 ms) before
 *    it reaches the provider — typing "Со-соф-софия" produces ONE search,
 *    not three. The previous results stay visible during the debounce
 *    window; `isLoading` describes the query state only.
 *  - Errors are typed `ProviderError` (never strings); map
 *    `error.code` -> `ERROR_MESSAGE_KEYS` -> `errors.*` (src/i18n/keys.ts).
 *  - Freshness: `stations` are demo-labelled via `station.provenance` (rule
 *    6). This hook exposes no freshness of its own — station data is static
 *    in this build; `useJourneySearch` shows the `dataUpdatedAt` pattern.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { ProviderError } from '../types/errors';
import type { Station } from '../types/station';
import type { TrainDataProvider } from '../services/train-data';
import { APP_CACHE_POLICY, useTrainDataProvider } from './AppDataProvider';
import { EMPTY_STATIONS, runProviderCall } from './internals';
import { normalizeSearchText, stationQueryKeys } from './queryKeys';

/** Debounce for query CHANGES; the mount-time value is used immediately. */
export const STATION_SEARCH_DEBOUNCE_MS = 250;

export interface StationSearchState {
  /** Matching stations (empty array while loading, on error, or with no matches). */
  stations: readonly Station[];
  /** True while the first load for the current query is in flight (no data yet). */
  isLoading: boolean;
  isError: boolean;
  /** Typed provider error for the UI to map to `errors.*`; null when not in error. */
  error: ProviderError | null;
  /** Re-run the lookup for the current query (checklist §7: retry on every screen). */
  refetch: () => void;
}

async function fetchAllStations(
  provider: TrainDataProvider,
  signal: AbortSignal,
): Promise<readonly Station[]> {
  if (typeof provider.getStationDirectory === 'function') {
    const directory = await provider.getStationDirectory({ signal });
    return directory.stations;
  }
  return provider.searchStations({}, { signal });
}

export function useStationSearch(query: string): StationSearchState {
  const provider = useTrainDataProvider();
  const [debouncedText, setDebouncedText] = useState(() => normalizeSearchText(query));

  useEffect(() => {
    const next = normalizeSearchText(query);
    if (next === debouncedText) return;
    const timer = setTimeout(() => setDebouncedText(next), STATION_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, debouncedText]);

  const fullDirectory = debouncedText === '';

  const result = useQuery<readonly Station[], ProviderError>({
    queryKey: fullDirectory
      ? stationQueryKeys.directory()
      : stationQueryKeys.search(debouncedText),
    queryFn: ({ signal }) =>
      runProviderCall(() =>
        fullDirectory
          ? fetchAllStations(provider, signal)
          : provider.searchStations({ text: debouncedText }, { signal }),
      ),
    // Station data is static: fresh for 5 min, cached 30 min for offline use
    // (checklist §7). See APP_CACHE_POLICY / AppDataProvider docs.
    staleTime: APP_CACHE_POLICY.stationStaleTimeMs,
    gcTime: APP_CACHE_POLICY.stationGcTimeMs,
    // No React Query auto-retry — the request executor owns retries (DEC-007).
    retry: false,
  });

  return {
    stations: result.data ?? EMPTY_STATIONS,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: () => {
      void result.refetch();
    },
  };
}
