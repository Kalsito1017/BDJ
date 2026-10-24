/**
 * useJourneySearch contract tests (plan.md §9 Phase 3/4; Appendix A.5).
 *
 * Cases: success envelope + journeys with demo provenance (rule 6), empty
 * result (envelope with `journeys: []`, never an error), disabled behaviour
 * for null/incomplete input (no provider call), unknown station id
 * (`not_found`), refetch + `isFetching`/`dataUpdatedAt` freshness exposure,
 * cache reuse on a second mount within staleTime, and "no React Query
 * auto-retry on top of the executor's bounded retries" (single retry layer,
 * DEC-007).
 *
 * Everything runs against the real MockTrainDataProvider + request executor;
 * no network (DEC-002).
 */

import { act, waitFor } from '@testing-library/react-native';

import { createAppQueryClient, useJourneySearch } from '../../src/hooks';
import type { Journey, JourneySearch, TrainSegment } from '../../src/types/journey';
import { DEMO_EMPTY_ROUTE } from '../../src/services/train-data/fixtures';
import {
  expectAllDemoProvenance,
  expectProviderError,
  makeTrackedProvider,
  renderDataHook,
  TIGHT_REQUEST_OPTIONS,
} from './testSupport';

const SEARCH: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-varna',
  date: '2026-07-01',
};

const DIRECT_SEARCH: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  date: '2026-07-01',
};

function trainSegmentsOf(journey: Journey): TrainSegment[] {
  return journey.legs.filter((leg): leg is TrainSegment => leg.kind === 'train');
}

describe('useJourneySearch — results', () => {
  it('returns the result envelope and journeys, all labelled demo (rule 6)', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.journeys.length).toBeGreaterThan(0));

    expect(result.current?.isError).toBe(false);
    expect(result.current?.error).toBeNull();
    expect(result.current?.isLoading).toBe(false);
    expect(result.current?.isFetching).toBe(false);
    expect(result.current?.dataUpdatedAt).toBeGreaterThan(0);

    const envelope = result.current?.result;
    expect(envelope).toBeDefined();
    expect(envelope?.search).toEqual(SEARCH);
    expect(envelope?.journeys.map((journey) => journey.id)).toEqual([
      'demo-journey-multi-transfer',
      'demo-journey-midnight',
    ]);
    expect(envelope?.provenance.kind).toBe('demo');
    expectAllDemoProvenance(result.current?.journeys ?? []);
    for (const journey of result.current?.journeys ?? []) {
      expectAllDemoProvenance(trainSegmentsOf(journey));
      expectAllDemoProvenance(journey.legs);
    }

    expect(tracked.callsOf('searchJourneys')).toHaveLength(1);
    expect(tracked.callsOf('searchJourneys')[0]?.input).toEqual(SEARCH);
  });

  it('treats an empty result as success with an empty envelope, not an error', async () => {
    const tracked = makeTrackedProvider();
    const input: JourneySearch = { ...DEMO_EMPTY_ROUTE, date: '2026-07-01' };
    const { result } = await renderDataHook(() => useJourneySearch(input), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.result).toBeDefined());

    expect(result.current?.isError).toBe(false);
    expect(result.current?.journeys).toEqual([]);
    expect(result.current?.result).toBeDefined();
    expect(result.current?.result?.journeys).toEqual([]);
    expect(result.current?.result?.provenance.kind).toBe('demo');
  });

  it('rejects with typed not_found for an unknown station id', async () => {
    const tracked = makeTrackedProvider('success', {
      requestOptions: TIGHT_REQUEST_OPTIONS,
    });
    const input: JourneySearch = {
      fromStationId: 'demo-station-does-not-exist',
      toStationId: 'demo-station-plovdiv',
      date: '2026-07-01',
    };
    const { result } = await renderDataHook(() => useJourneySearch(input), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));

    expectProviderError(result.current?.error, 'not_found');
    expect(result.current?.journeys).toEqual([]);
    expect(result.current?.result).toBeUndefined();
  });
});

describe('useJourneySearch — enabled gating', () => {
  it('does nothing at all for null input', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(() => useJourneySearch(null), {
      provider: tracked.provider,
    });

    await act(async () => {});

    expect(tracked.calls).toHaveLength(0);
    expect(result.current?.result).toBeUndefined();
    expect(result.current?.journeys).toEqual([]);
    expect(result.current?.isLoading).toBe(false);
    expect(result.current?.isFetching).toBe(false);
    expect(result.current?.isError).toBe(false);
    expect(result.current?.dataUpdatedAt).toBe(0);

    // refetch() is a no-op while disabled — it must not hit the provider.
    await act(async () => {
      result.current?.refetch();
    });
    expect(tracked.calls).toHaveLength(0);
  });

  it('stays disabled when from/to/date are incomplete (blank fields)', async () => {
    const tracked = makeTrackedProvider();
    const incomplete = {
      fromStationId: 'demo-station-sofia-central',
      toStationId: '   ',
      date: '2026-07-01',
    } as JourneySearch;
    const { result } = await renderDataHook(() => useJourneySearch(incomplete), {
      provider: tracked.provider,
    });

    await act(async () => {});

    expect(tracked.calls).toHaveLength(0);
    expect(result.current?.isLoading).toBe(false);
    expect(result.current?.isError).toBe(false);
  });
});

describe('useJourneySearch — refetch and freshness (checklist §7)', () => {
  it('refetch() re-runs the search and exposes isFetching/dataUpdatedAt honestly', async () => {
    const tracked = makeTrackedProvider('success', { latencyMs: 300 });
    const { result } = await renderDataHook(() => useJourneySearch(DIRECT_SEARCH), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.journeys).toHaveLength(1));
    const updatedAtFirst = result.current?.dataUpdatedAt ?? 0;
    expect(updatedAtFirst).toBeGreaterThan(0);
    expect(result.current?.isFetching).toBe(false);

    await act(async () => {
      result.current?.refetch();
    });
    // Background refresh: previous data stays visible while isFetching is true.
    // (TanStack notifies through a macrotask batch — wait for the state, don't
    // assume it flipped synchronously.)
    await waitFor(() => expect(result.current?.isFetching).toBe(true));
    expect(result.current?.journeys).toHaveLength(1);
    expect(result.current?.isLoading).toBe(false);

    await waitFor(() => expect(result.current?.isFetching).toBe(false));
    expect(tracked.callsOf('searchJourneys')).toHaveLength(2);
    expect(result.current?.journeys).toHaveLength(1);
    expect(result.current?.dataUpdatedAt).toBeGreaterThanOrEqual(updatedAtFirst);
    expectAllDemoProvenance(result.current?.journeys ?? []);
  });

  it('serves a second mount from cache within staleTime without calling the provider again', async () => {
    const tracked = makeTrackedProvider();
    const queryClient = createAppQueryClient();

    const first = await renderDataHook(() => useJourneySearch(DIRECT_SEARCH), {
      provider: tracked.provider,
      queryClient,
    });
    await waitFor(() => expect(first.result.current?.journeys).toHaveLength(1));
    await first.unmount();

    const second = await renderDataHook(() => useJourneySearch(DIRECT_SEARCH), {
      provider: tracked.provider,
      queryClient,
    });
    await waitFor(() => expect(second.result.current?.journeys).toHaveLength(1));

    expect(second.result.current?.result).toBe(first.result.current?.result);
    expect(tracked.callsOf('searchJourneys')).toHaveLength(1);
  });

  it('does not stack React Query retries on the executor retries (single retry layer)', async () => {
    // Failure scenario with the executor's DEFAULT retry policy (3 attempts,
    // backoff + jitter). The queryFn must still run exactly once: React Query
    // auto-retry is disabled; retrying lives only in the executor (DEC-007).
    const tracked = makeTrackedProvider('upstream_error');
    const { result } = await renderDataHook(() => useJourneySearch(DIRECT_SEARCH), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true), { timeout: 5_000 });
    expectProviderError(result.current?.error, 'upstream_error');

    await act(async () => {});
    expect(tracked.callsOf('searchJourneys')).toHaveLength(1);
  });
});
