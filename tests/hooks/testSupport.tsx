/**
 * Shared test support for tests/hooks/** (not a test file — testMatch only
 * picks up *.test.{ts,tsx}).
 *
 * Everything here exercises the REAL pipeline: MockTrainDataProvider
 * (Appendix A.1), the Zod boundary schemas and the shared request executor
 * (DEC-007). The only test conveniences are:
 *  - a tracking wrapper that records every provider call (method, input,
 *    RequestOptions, the AbortSignal the hooks handed down, and the settled
 *    outcome) — so tests can assert call counts, inputs and cancellation;
 *  - tight RequestOptions (small `timeoutMs`, `NO_AUTO_RETRY_POLICY`) for
 *    failure scenarios, the same technique as
 *    tests/data-provider/mockTrainDataProvider.test.ts: the hooks never set
 *    budgets themselves (the provider/transport layer does), and without a
 *    small budget scenario 'timeout' would hold its deliberately huge
 *    simulated latency for the full default budget.
 *
 * No network anywhere (DEC-002): all data is fixture data.
 *
 * TIMING NOTE (learned from the first test run): TanStack Query delivers
 * state notifications through `notifyManager`'s `setTimeout(0)` batch — a
 * MACROTASK. `await act(async () => {})` flushes microtasks only, so a hook
 * state update may still be pending afterwards. Assert settled state with
 * `waitFor(...)` (which polls with the act environment disabled) rather than
 * bare `act(async () => {})` + assertions.
 */

import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  cleanup,
  renderHook,
  type RenderHookOptions,
  type RenderHookResult,
} from '@testing-library/react-native';

import { AppDataProvider, createAppQueryClient } from '../../src/hooks';
import {
  NO_AUTO_RETRY_POLICY,
  type RequestOptions,
} from '../../src/services/common/RequestOptions';
import {
  MockTrainDataProvider,
  type MockTrainDataProviderConfig,
  type MockScenario,
  type TrainDataProvider,
  type TrainDataProviderCapabilities,
  type TrainDataProviderHealth,
} from '../../src/services/train-data';
import type { InformationProvenance } from '../../src/types/provenance';
import type {
  Journey,
  JourneySearch,
  JourneySearchResult,
} from '../../src/types/journey';
import type { Station, StationDirectory, StationQuery } from '../../src/types/station';

export type ProviderMethod =
  | 'searchJourneys'
  | 'searchStations'
  | 'getStation'
  | 'getJourney'
  | 'getStationDirectory'
  | 'healthCheck';

export type SettledOutcome = { ok: true } | { ok: false; code: string };

export interface RecordedProviderCall {
  method: ProviderMethod;
  input: unknown;
  options: RequestOptions;
  /** The AbortSignal the hook passed down (TanStack's per-fetch signal). */
  signal: AbortSignal | undefined;
  /** Settled outcome of the underlying provider promise ('cancelled' on abort). */
  settled: Promise<SettledOutcome>;
}

export interface TrackedProvider {
  provider: TrainDataProvider;
  calls: RecordedProviderCall[];
  callsOf(method: ProviderMethod): RecordedProviderCall[];
}

/** Options merged into every provider call made through the tracking wrapper. */
export interface TrackedProviderConfig extends MockTrainDataProviderConfig {
  requestOptions?: RequestOptions;
}

function outcomeOf(promise: Promise<unknown>): Promise<SettledOutcome> {
  return promise.then(
    () => ({ ok: true }) as const,
    (error: unknown) =>
      ({ ok: false, code: (error as { code?: string }).code ?? 'unknown' }) as const,
  );
}

/**
 * A `TrainDataProvider` that delegates to a real `MockTrainDataProvider` and
 * records every call. `requestOptions` are merged UNDER the hook-supplied
 * options (hooks only pass `signal`), so cancellation stays real while tests
 * can force tight budgets.
 */
export function makeTrackedProvider(
  scenario: MockScenario = 'success',
  config: TrackedProviderConfig = {},
): TrackedProvider {
  const { requestOptions, ...mockConfig } = config;
  const mock = new MockTrainDataProvider({ scenario, ...mockConfig });
  const calls: RecordedProviderCall[] = [];

  const record = (
    method: ProviderMethod,
    input: unknown,
    options: RequestOptions | undefined,
    promise: Promise<unknown>,
  ): Promise<unknown> => {
    const merged: RequestOptions = { ...requestOptions, ...options };
    calls.push({
      method,
      input,
      options: merged,
      signal: merged.signal,
      settled: outcomeOf(promise),
    });
    return promise;
  };

  const provider: TrainDataProvider = {
    id: mock.id,
    displayName: mock.displayName,
    capabilities: mock.capabilities,
    searchJourneys(input: JourneySearch, options?: RequestOptions) {
      return record(
        'searchJourneys',
        input,
        options,
        mock.searchJourneys(input, {
          ...requestOptions,
          ...options,
        }),
      ) as Promise<JourneySearchResult>;
    },
    searchStations(query: StationQuery, options?: RequestOptions) {
      return record(
        'searchStations',
        query,
        options,
        mock.searchStations(query, {
          ...requestOptions,
          ...options,
        }),
      ) as Promise<readonly Station[]>;
    },
    getStation(stationId: string, options?: RequestOptions) {
      return record(
        'getStation',
        stationId,
        options,
        mock.getStation(stationId, {
          ...requestOptions,
          ...options,
        }),
      ) as Promise<Station>;
    },
    getJourney(journeyId: string, options?: RequestOptions) {
      return record(
        'getJourney',
        journeyId,
        options,
        mock.getJourney(journeyId, {
          ...requestOptions,
          ...options,
        }),
      ) as Promise<Journey>;
    },
    getStationDirectory(options?: RequestOptions) {
      return record(
        'getStationDirectory',
        undefined,
        options,
        mock.getStationDirectory({
          ...requestOptions,
          ...options,
        }),
      ) as Promise<StationDirectory>;
    },
    healthCheck(options?: RequestOptions) {
      return record(
        'healthCheck',
        undefined,
        options,
        mock.healthCheck({
          ...requestOptions,
          ...options,
        }),
      ) as Promise<TrainDataProviderHealth>;
    },
  };

  return {
    provider,
    calls,
    callsOf: (method) => calls.filter((call) => call.method === method),
  };
}

/** A provider whose `capabilities.supportsJourneyDetails` is false and which
 *  has NO `getJourney` method — the "provider cannot resolve ids" case. */
export function makeProviderWithoutJourneyDetails(): TrackedProvider {
  const tracked = makeTrackedProvider();
  const { provider, calls, callsOf } = tracked;
  const capabilities: TrainDataProviderCapabilities = {
    ...provider.capabilities,
    supportsJourneyDetails: false,
  };
  const withoutDetails: TrainDataProvider = {
    id: provider.id,
    displayName: provider.displayName,
    capabilities,
    searchJourneys: provider.searchJourneys.bind(provider),
    searchStations: provider.searchStations.bind(provider),
    getStation: provider.getStation.bind(provider),
  };
  return { provider: withoutDetails, calls, callsOf };
}

/** Deterministic budgets for failure scenarios (see the module comment). */
export const TIGHT_REQUEST_OPTIONS: RequestOptions = {
  retry: NO_AUTO_RETRY_POLICY,
  timeoutMs: 50,
};

export interface RenderDataHookOptions<Props> {
  provider?: TrainDataProvider;
  queryClient?: QueryClient;
  initialProps?: Props;
}

/**
 * Every QueryClient these tests create is tracked and torn down after each
 * test: React Query schedules gc timers (5–30 min) for cached entries after
 * the last observer unmounts, and a pending timer keeps Jest's event loop
 * alive ("Jest did not exit one second after the test run"). `clear()`
 * destroys the cached queries and cancels those timers. `cleanup()` is
 * called explicitly first so unmounts happen BEFORE the cache is cleared.
 */
const trackedQueryClients = new Set<QueryClient>();

afterEach(() => {
  cleanup();
  for (const queryClient of trackedQueryClients) {
    queryClient.clear();
  }
  trackedQueryClients.clear();
});

export type DataHookRender<Result, Props> = RenderHookResult<Result, Props> & {
  provider: TrainDataProvider;
  queryClient: QueryClient;
};

/**
 * `renderHook` wrapped in `<AppDataProvider>` with the injected provider and
 * QueryClient (defaults: MockTrainDataProvider + createAppQueryClient()).
 * RNTL v14: renderHook/rerender/unmount are async — always await them.
 */
export async function renderDataHook<Result, Props>(
  hookToRender: (props: Props) => Result,
  options: RenderDataHookOptions<Props> = {},
): Promise<DataHookRender<Result, Props>> {
  const provider = options.provider ?? new MockTrainDataProvider();
  const queryClient = options.queryClient ?? createAppQueryClient();
  trackedQueryClients.add(queryClient);

  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <AppDataProvider provider={provider} queryClient={queryClient}>
        {children}
      </AppDataProvider>
    );
  }

  const hookOptions: RenderHookOptions<Props> = {
    wrapper: Wrapper,
    ...(options.initialProps !== undefined ? { initialProps: options.initialProps } : {}),
  };
  const rendered = await renderHook(hookToRender, hookOptions);
  return { ...rendered, provider, queryClient };
}

/** Rule 6: every record under test must carry demo provenance (mock-only). */
export function expectAllDemoProvenance(
  records: readonly { provenance?: InformationProvenance }[],
): void {
  expect(records.length).toBeGreaterThan(0);
  for (const record of records) {
    expect(record.provenance?.kind).toBe('demo');
  }
}

/** Assert a value is a typed ProviderError with the expected code. */
export function expectProviderError(
  error: unknown,
  code: string,
): asserts error is {
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
} {
  expect(error).toMatchObject({ code });
  expect(typeof (error as { message?: unknown }).message).toBe('string');
  expect(typeof (error as { retryable?: unknown }).retryable).toBe('boolean');
  expect(typeof (error as { occurredAt?: unknown }).occurredAt).toBe('string');
}
