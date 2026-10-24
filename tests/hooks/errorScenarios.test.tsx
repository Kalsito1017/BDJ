/**
 * Failure-scenario and cancellation tests for the data-access hooks
 * (plan.md §9 Phase 4 acceptance: "Mock tests cover success, empty results,
 * malformed response, timeout, and server error"; "No provider failure
 * crashes the app"; Appendix A.4 scenarios).
 *
 * Every scenario runs through the REAL MockTrainDataProvider + Zod boundary
 * + request executor; only the RequestOptions budgets are tight (see
 * testSupport) so 'timeout' fails in 50 ms instead of the production budget.
 *
 * Asserted here:
 *  - each failure surfaces as a typed `ProviderError` with the right `code`
 *    (never a raw string / never a crash) for ALL THREE hooks;
 *  - scenario 'empty' is a successful empty result, not an error;
 *  - unmounting mid-flight cancels the provider call via the AbortSignal and
 *    produces no state update afterwards (no act warnings / console errors).
 */

import { act, waitFor } from '@testing-library/react-native';

import { useJourney, useJourneySearch, useStationSearch } from '../../src/hooks';
import { NO_AUTO_RETRY_POLICY } from '../../src/services/common/RequestOptions';
import type { JourneySearch } from '../../src/types/journey';
import type { MockScenario } from '../../src/services/train-data';
import {
  expectProviderError,
  makeTrackedProvider,
  renderDataHook,
  TIGHT_REQUEST_OPTIONS,
  type TrackedProviderConfig,
} from './testSupport';

const SEARCH: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  date: '2026-07-01',
};
const KNOWN_JOURNEY_ID = 'demo-journey-multi-transfer';

const FAILURE_CASES: readonly { scenario: MockScenario; code: string }[] = [
  { scenario: 'malformed', code: 'invalid_response' },
  { scenario: 'timeout', code: 'timeout' },
  { scenario: 'offline', code: 'offline' },
  { scenario: 'upstream_error', code: 'upstream_error' },
  { scenario: 'rate_limited', code: 'rate_limited' },
];

function trackedFor(scenario: MockScenario) {
  const config: TrackedProviderConfig = { requestOptions: TIGHT_REQUEST_OPTIONS };
  return makeTrackedProvider(scenario, config);
}

describe.each(FAILURE_CASES)('failure scenario "$scenario"', ({ scenario, code }) => {
  it(`useStationSearch surfaces a typed ProviderError (${code})`, async () => {
    const tracked = trackedFor(scenario);
    const { result } = await renderDataHook(() => useStationSearch('соф'), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));

    expectProviderError(result.current?.error, code);
    expect(result.current?.stations).toEqual([]);
    expect(result.current?.isLoading).toBe(false);
  });

  it(`useJourneySearch surfaces a typed ProviderError (${code})`, async () => {
    const tracked = trackedFor(scenario);
    const { result } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));

    expectProviderError(result.current?.error, code);
    expect(result.current?.journeys).toEqual([]);
    expect(result.current?.result).toBeUndefined();
  });

  it(`useJourney surfaces a typed ProviderError (${code})`, async () => {
    const tracked = trackedFor(scenario);
    const { result } = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));

    expectProviderError(result.current?.error, code);
    expect(result.current?.journey).toBeUndefined();
  });
});

describe("scenario 'empty' — empty results are success, not errors", () => {
  it('useStationSearch resolves an empty list for a text search', async () => {
    const tracked = trackedFor('empty');
    const { result } = await renderDataHook(() => useStationSearch('соф'), {
      provider: tracked.provider,
    });

    await waitFor(() => {
      expect(tracked.callsOf('searchStations')).toHaveLength(1);
      expect(result.current?.isLoading).toBe(false);
    });

    expect(result.current?.stations).toEqual([]);
    expect(result.current?.isError).toBe(false);
    expect(result.current?.error).toBeNull();
    expect(result.current?.isLoading).toBe(false);
  });

  it('useStationSearch resolves an empty directory for the full-directory query', async () => {
    const tracked = trackedFor('empty');
    const { result } = await renderDataHook(() => useStationSearch(''), {
      provider: tracked.provider,
    });

    await waitFor(() => {
      expect(tracked.callsOf('getStationDirectory')).toHaveLength(1);
      expect(result.current?.isLoading).toBe(false);
    });

    expect(result.current?.stations).toEqual([]);
    expect(result.current?.isError).toBe(false);
  });

  it('useJourneySearch resolves an empty envelope', async () => {
    const tracked = trackedFor('empty');
    const { result } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.result).toBeDefined());

    expect(result.current?.journeys).toEqual([]);
    expect(result.current?.result?.journeys).toEqual([]);
    expect(result.current?.isError).toBe(false);
    expect(result.current?.result?.provenance.kind).toBe('demo');
  });

  it('useJourney reports not_found for ids the empty source cannot resolve', async () => {
    const tracked = trackedFor('empty');
    const { result } = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));
    expectProviderError(result.current?.error, 'not_found');
  });
});

describe('cancellation on unmount (DEC-007)', () => {
  it('cancels the in-flight provider call and never touches state after unmount', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const tracked = makeTrackedProvider('success', {
        latencyMs: 100,
        requestOptions: { retry: NO_AUTO_RETRY_POLICY, timeoutMs: 5_000 },
      });
      const { result, unmount } = await renderDataHook(() => useJourneySearch(SEARCH), {
        provider: tracked.provider,
      });

      await waitFor(() => expect(tracked.callsOf('searchJourneys')).toHaveLength(1));
      expect(result.current?.isFetching).toBe(true);
      const call = tracked.callsOf('searchJourneys')[0];
      expect(call?.signal).toBeDefined();
      expect(call?.signal?.aborted).toBe(false);

      await unmount();

      // TanStack aborts the per-fetch signal it handed to the provider...
      expect(call?.signal?.aborted).toBe(true);
      // ...the executor rejects promptly with a typed 'cancelled' error...
      await expect(call?.settled).resolves.toEqual({ ok: false, code: 'cancelled' });
      // ...and no React state was updated after unmount (which would surface
      // as an "not wrapped in act(...)" warning — TanStack swallows the late
      // rejection entirely via its reverted cancellation).
      await act(async () => {});
      const actWarningsAfterUnmount = consoleError.mock.calls.filter((args) =>
        args.some((arg) => typeof arg === 'string' && arg.includes('not wrapped in act')),
      );
      expect(actWarningsAfterUnmount).toEqual([]);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('cancels an in-flight journey lookup on unmount the same way', async () => {
    const tracked = makeTrackedProvider('success', {
      latencyMs: 100,
      requestOptions: { retry: NO_AUTO_RETRY_POLICY, timeoutMs: 5_000 },
    });
    const { unmount } = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(tracked.callsOf('getJourney')).toHaveLength(1));
    const call = tracked.callsOf('getJourney')[0];

    await unmount();

    expect(call?.signal?.aborted).toBe(true);
    await expect(call?.settled).resolves.toEqual({ ok: false, code: 'cancelled' });
  });
});
