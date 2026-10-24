/**
 * AppDataProvider — the app-wide wiring of TanStack Query + the
 * `TrainDataProvider` seam (DEC-002/006/007; plan.md §9 Phase 3/4).
 *
 * Screens and features NEVER create providers or QueryClients: they call the
 * hooks in `src/hooks/`, which read the provider from this context. Tests
 * inject a `TrainDataProvider` (scenario switching) and/or a `QueryClient`.
 *
 * DATA SOURCE (DEC-002, rule 1/6): the default provider is
 * `MockTrainDataProvider` — demo-labelled fixture data only. There is no live
 * provider in this repository and none may be created until a lawful,
 * documented source exists and DEC-002 is superseded.
 *
 * CACHE POLICY (addbeforerelease.txt §7 "offline caching of static station
 * data with expiry and 'stale' labels"; §7 "scheduled vs real-time vs cached
 * vs demo clearly labelled"). The values below are app policy, not a source
 * policy, and are chosen as follows:
 *
 *  - `staleTime` 60 s: within a minute of a successful fetch, a remount or a
 *    revisited screen reuses the cache silently (no provider call). After
 *    that TanStack marks the entry STALE and refetches in the background
 *    while the cached value stays on screen. Screens label freshness from
 *    `dataUpdatedAt` + `isFetching` (see "Honest staleness" below).
 *  - `gcTime` 5 min: cache expiry — an unused entry is dropped 5 minutes
 *    after its last observer unmounts. Until then the cached value can be
 *    shown offline (Phase 5 wires the offline banner). After expiry nothing
 *    is shown as current; the app shows the loading state again.
 *  - Station data is static in this build (a bundled demo directory), so
 *    station queries override these with 5 min stale / 30 min gc
 *    (`APP_CACHE_POLICY.station*`).
 *
 * RETRIES — exactly ONE retry layer (DEC-007 "one implementation, one test
 * surface"): the shared executor (`src/services/api/requestExecutor.ts`)
 * already performs bounded retries with exponential backoff + jitter for the
 * retryable codes of idempotent reads. React Query auto-retry is therefore
 * DISABLED (`retry: false`): stacking it would multiply attempts (3 × 3),
 * stretch worst-case error surfacing past UX budgets, and re-run codes that
 * are explicitly non-retryable (`invalid_response`, `not_found`, ...). This
 * is the `retry: false` half of the "no double retry" rule; the executor's
 * `NO_AUTO_RETRY_POLICY` is the other half (used by ticketing, DEC-008).
 *
 * HONEST STALENESS (rule 6; DEC-006): provenance labels come from the DATA
 * (`journey.provenance` / `station.provenance` — always `demo` from the mock).
 * Query staleness is a separate, weaker notion: it may drive an "updated at"
 * line or a subtle "may be out of date" hint from `dataUpdatedAt`, but it
 * MUST NOT be used to fabricate `cached-stale` provenance — that kind carries
 * DEC-006 fields (`cachedAt`/`expiresAt`/`staleReason`) and is only produced
 * when a payload actually carries them.
 *
 * CANCELLATION: the hooks pass TanStack's per-fetch `AbortSignal` into the
 * provider `RequestOptions` (DEC-007). Consuming the signal means TanStack
 * aborts the executor's work when the last observer unmounts or the query
 * key changes — no orphaned attempts, no state updates after unmount.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type JSX, type ReactNode } from 'react';

import { MockTrainDataProvider } from '../services/train-data';
import type { TrainDataProvider } from '../services/train-data';

export interface AppDataProviderProps {
  children: ReactNode;
  /** Defaults to a fresh `MockTrainDataProvider` (DEC-002: mock-only). */
  provider?: TrainDataProvider;
  /** Defaults to `createAppQueryClient()`; tests inject their own client. */
  queryClient?: QueryClient;
}

/** Cache policy constants — see the module comment above. */
export const APP_CACHE_POLICY = {
  /** Journey data freshness window (default for all queries). */
  staleTimeMs: 60_000,
  /** Journey cache expiry after the last observer unmounts. */
  gcTimeMs: 5 * 60_000,
  /** Station directory/search freshness window (static data). */
  stationStaleTimeMs: 5 * 60_000,
  /** Station cache expiry after the last observer unmounts. */
  stationGcTimeMs: 30 * 60_000,
} as const;

/**
 * Build a QueryClient with the app's cache policy (see module comment).
 * Exported so tests exercise the SAME defaults as production instead of
 * inventing their own.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: APP_CACHE_POLICY.staleTimeMs,
        gcTime: APP_CACHE_POLICY.gcTimeMs,
        // No React Query auto-retry: the shared request executor already does
        // bounded retries with backoff + jitter (DEC-007). See module comment.
        retry: false,
        // The app is not a browser tab: refetching on every focus would churn
        // the mock (and later a rate-limited source) for nothing. Staleness
        // and the explicit `refetch` action cover refreshes.
        refetchOnWindowFocus: false,
        // When connectivity returns, stale data is refetched (Phase 5 wires
        // real network status into React Query's onlineManager).
        refetchOnReconnect: true,
        // Refetch on mount only when the entry is stale (staleTime above).
        refetchOnMount: true,
      },
    },
  });
}

const TrainDataProviderContext = createContext<TrainDataProvider | null>(null);

/**
 * The configured `TrainDataProvider` for this subtree. Throws a clear
 * programming error when used outside `<AppDataProvider>` (same contract as
 * React Query's "No QueryClient set" — a missing wrapper is a bug, not a
 * provider failure).
 */
export function useTrainDataProvider(): TrainDataProvider {
  const provider = useContext(TrainDataProviderContext);
  if (provider === null) {
    throw new Error('useTrainDataProvider must be used within <AppDataProvider>.');
  }
  return provider;
}

export function AppDataProvider(props: AppDataProviderProps): JSX.Element {
  // Lazy singletons: created once per mounted provider, never per render.
  const [fallbackQueryClient] = useState(createAppQueryClient);
  const [fallbackProvider] = useState(() => new MockTrainDataProvider());
  const queryClient = props.queryClient ?? fallbackQueryClient;
  const provider = props.provider ?? fallbackProvider;

  return (
    <TrainDataProviderContext.Provider value={provider}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </TrainDataProviderContext.Provider>
  );
}
