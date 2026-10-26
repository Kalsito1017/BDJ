/**
 * useJourneySearch — `isStale` semantics (reviewer-qa, Phase 5 review).
 *
 * The screen contract (src/hooks/useJourneySearch.ts) promises:
 *  - `isStale` is FALSE without data (before the first success, on error
 *    without data, while disabled) — the hint only ever accompanies data;
 *  - it flips TRUE only once the shown data is older than
 *    `APP_CACHE_POLICY.journeyStaleTimeMs` (60 s);
 *  - it flips back to FALSE when fresh data arrives;
 *  - the flag re-renders on its own when the age crosses the threshold
 *    (React Query's internal staleTime timer) — no screen timer needed;
 *  - it NEVER implies `cached-stale` provenance (rule 6): the DATA keeps
 *    its own provenance (`demo` from the mock) and the hint is a separate,
 *    weaker signal.
 *
 * Fake timers drive the 60 s window deterministically (no real waiting).
 */

import { act } from '@testing-library/react-native';

import { APP_CACHE_POLICY } from '../../src/hooks/AppDataProvider';
import { useJourneySearch } from '../../src/hooks/useJourneySearch';
import type { JourneySearch } from '../../src/types/journey';

import { makeTrackedProvider, renderDataHook } from './testSupport';

const SEARCH: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-varna',
  date: '2026-11-01',
};

const REAL_NOW = new Date('2026-10-24T10:00:00.000Z');

/** Advance fake timers and flush the async pipeline (fetch + notify batch). */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(REAL_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useJourneySearch — isStale (rule 6 honest hint)', () => {
  it('pins the freshness window to the app policy (60 s)', () => {
    expect(APP_CACHE_POLICY.journeyStaleTimeMs).toBe(60_000);
  });

  it('is false without data: disabled input and while loading', async () => {
    const tracked = makeTrackedProvider();
    const { result, unmount } = await renderDataHook(() => useJourneySearch(null));
    expect(result.current.isStale).toBe(false);
    expect(result.current.dataUpdatedAt).toBe(0);
    await unmount();

    const loading = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });
    // Before the fetch settles there is no data — the hint must be absent.
    expect(loading.result.current.dataUpdatedAt).toBe(0);
    expect(loading.result.current.isStale).toBe(false);
    await loading.unmount();
  });

  it('stays false for a minute and flips true only after the 60 s window', async () => {
    const tracked = makeTrackedProvider();
    const { result, unmount } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });

    await advance(10); // let the fetch settle
    expect(result.current.isLoading).toBe(false);
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
    expect(result.current.isStale).toBe(false);

    await advance(59_000); // 59 s after the fetch: still fresh
    expect(result.current.isStale).toBe(false);

    await advance(2_000); // cross the 60 s threshold
    expect(result.current.isStale).toBe(true);

    await unmount();
  });

  it('re-renders on its own at the threshold (no screen timer: no interaction happened)', async () => {
    const tracked = makeTrackedProvider();
    const { result, unmount } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });
    await advance(10);
    expect(result.current.isStale).toBe(false);

    // Pure timer advancement — nothing touches the hook or the screen.
    await advance(61_000);
    expect(result.current.isStale).toBe(true);
    expect(tracked.callsOf('searchJourneys')).toHaveLength(1); // staleness never refetches

    await unmount();
  });

  it('flips back to false when fresh data arrives', async () => {
    const tracked = makeTrackedProvider();
    const { result, unmount } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });
    await advance(10);
    const firstFetchAt = result.current.dataUpdatedAt;

    await advance(61_000);
    expect(result.current.isStale).toBe(true);

    await act(async () => {
      result.current.refetch();
    });
    await advance(10);
    expect(result.current.dataUpdatedAt).toBeGreaterThan(firstFetchAt);
    expect(result.current.isStale).toBe(false);

    await unmount();
  });

  it('never implies cached-stale provenance: the data keeps its own label (rule 6)', async () => {
    const tracked = makeTrackedProvider();
    const { result, unmount } = await renderDataHook(() => useJourneySearch(SEARCH), {
      provider: tracked.provider,
    });
    await advance(10);
    await advance(61_000);

    expect(result.current.isStale).toBe(true);
    // The hint is a hint: the envelope's provenance stays `demo`, and the
    // `cached-stale` kind (which needs cachedAt/expiresAt/staleReason data)
    // is never fabricated from query age.
    expect(result.current.result?.provenance.kind).toBe('demo');
    for (const journey of result.current.journeys) {
      expect(journey.provenance?.kind).toBe('demo');
    }

    await unmount();
  });
});
