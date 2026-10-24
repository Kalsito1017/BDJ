/**
 * useStationSearch contract tests (plan.md §9 Phase 3; checklist §7/§8).
 *
 * Cases: full directory for empty/whitespace queries (picker UX), Cyrillic /
 * Latin / mixed-script text search, empty results (not an error), demo
 * provenance on every station (rule 6), debounce of query CHANGES (250 ms)
 * and cache reuse on a second mount within staleTime.
 *
 * Everything runs against the real MockTrainDataProvider + request executor;
 * no network (DEC-002).
 */

import { act, waitFor } from '@testing-library/react-native';

import {
  createAppQueryClient,
  STATION_SEARCH_DEBOUNCE_MS,
  useStationSearch,
} from '../../src/hooks';
import { loadDemoFixtures } from '../../src/services/train-data/fixtures';
import {
  expectAllDemoProvenance,
  makeTrackedProvider,
  renderDataHook,
} from './testSupport';

const DIRECTORY_SIZE = loadDemoFixtures().stations.length;

describe('useStationSearch — results', () => {
  it('returns the full directory for an empty query (picker UX), via getStationDirectory', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(() => useStationSearch(''), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isLoading).toBe(false));

    expect(result.current?.isError).toBe(false);
    expect(result.current?.error).toBeNull();
    expect(result.current?.stations).toHaveLength(DIRECTORY_SIZE);
    expect(result.current?.stations.map((station) => station.id)).toContain(
      'demo-station-sofia-central',
    );
    expect(tracked.callsOf('searchStations')).toHaveLength(0);
    expect(tracked.callsOf('getStationDirectory')).toHaveLength(1);
    expectAllDemoProvenance(result.current?.stations ?? []);
  });

  it('treats a whitespace-only query as empty (full directory)', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(() => useStationSearch('   \t '), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isLoading).toBe(false));
    expect(result.current?.stations).toHaveLength(DIRECTORY_SIZE);
    expect(tracked.callsOf('getStationDirectory')).toHaveLength(1);
    expect(tracked.callsOf('searchStations')).toHaveLength(0);
  });

  it('finds stations with Cyrillic, Latin and mixed-script queries', async () => {
    const tracked = makeTrackedProvider();
    const { result, rerender } = await renderDataHook(
      ({ query }: { query: string }) => useStationSearch(query),
      { provider: tracked.provider, initialProps: { query: 'софия' } },
    );

    await waitFor(() =>
      expect(result.current?.stations.map((station) => station.id)).toEqual([
        'demo-station-sofia-central',
      ]),
    );

    // Latin-script query -> the mixed/Cyrillic fixtures stay out of the way.
    await rerender({ query: 'demo sofia' });
    await waitFor(() =>
      expect(result.current?.stations.map((station) => station.id)).toEqual([
        'demo-station-sofia-central',
      ]),
    );

    // Mixed Cyrillic + Latin in one query.
    await rerender({ query: 'смесен mixed' });
    await waitFor(() =>
      expect(result.current?.stations.map((station) => station.id)).toEqual([
        'demo-station-mixed',
      ]),
    );
  });

  it('returns an empty list when nothing matches — not an error', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(
      () => useStationSearch('zzz-no-such-station'),
      {
        provider: tracked.provider,
      },
    );

    await waitFor(() => expect(tracked.callsOf('searchStations')).toHaveLength(1));
    await waitFor(() => expect(result.current?.isLoading).toBe(false));

    expect(result.current?.stations).toEqual([]);
    expect(result.current?.isError).toBe(false);
    expect(result.current?.error).toBeNull();
  });

  it('keeps demo provenance on every returned station (rule 6)', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(() => useStationSearch('демо'), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.stations.length).toBeGreaterThan(0));
    expectAllDemoProvenance(result.current?.stations ?? []);
  });
});

describe('useStationSearch — caching (checklist §7)', () => {
  it('serves a second mount from cache within staleTime without calling the provider again', async () => {
    const tracked = makeTrackedProvider();
    const queryClient = createAppQueryClient();

    const first = await renderDataHook(() => useStationSearch('соф'), {
      provider: tracked.provider,
      queryClient,
    });
    await waitFor(() => expect(first.result.current?.stations).toHaveLength(1));
    await first.unmount();

    const second = await renderDataHook(() => useStationSearch('соф'), {
      provider: tracked.provider,
      queryClient,
    });
    await waitFor(() => expect(second.result.current?.stations).toHaveLength(1));

    expect(second.result.current?.stations.map((station) => station.id)).toEqual(
      first.result.current?.stations.map((station) => station.id),
    );
    expect(tracked.callsOf('searchStations')).toHaveLength(1);
  });
});

describe('useStationSearch — debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces query CHANGES by 250 ms and fires once with the final text', async () => {
    const tracked = makeTrackedProvider();
    const { result, rerender } = await renderDataHook(
      ({ query }: { query: string }) => useStationSearch(query),
      { provider: tracked.provider, initialProps: { query: '' } },
    );

    // The mount-time value is used immediately (no debounce): full directory.
    await waitFor(() => {
      expect(tracked.callsOf('getStationDirectory')).toHaveLength(1);
      expect(result.current?.stations).toHaveLength(DIRECTORY_SIZE);
    });

    // Typing: each change resets the debounce window.
    await rerender({ query: 'Со' });
    expect(tracked.callsOf('searchStations')).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(STATION_SEARCH_DEBOUNCE_MS - 1);
    });
    expect(tracked.callsOf('searchStations')).toHaveLength(0);

    await rerender({ query: 'Соф' });
    await act(async () => {
      jest.advanceTimersByTime(STATION_SEARCH_DEBOUNCE_MS);
    });

    // Exactly one search, for the final text.
    expect(tracked.callsOf('searchStations')).toHaveLength(1);
    expect(tracked.callsOf('searchStations')[0]?.input).toEqual({ text: 'Соф' });

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(tracked.callsOf('searchStations')).toHaveLength(1);
    // 'Соф' is a prefix of the fixture name "…София" — one match.
    await waitFor(() => expect(result.current?.stations).toHaveLength(1));
    expect(result.current?.stations[0]?.id).toBe('demo-station-sofia-central');
  });

  it('does not fire at all when the text returns to the previous value within the window', async () => {
    const tracked = makeTrackedProvider();
    const { rerender } = await renderDataHook(
      ({ query }: { query: string }) => useStationSearch(query),
      { provider: tracked.provider, initialProps: { query: '' } },
    );

    await waitFor(() => expect(tracked.callsOf('getStationDirectory')).toHaveLength(1));

    await rerender({ query: 'Со' });
    await rerender({ query: '   ' }); // back to empty (whitespace) before the timer fires

    await act(async () => {
      jest.advanceTimersByTime(STATION_SEARCH_DEBOUNCE_MS * 2);
    });

    expect(tracked.callsOf('searchStations')).toHaveLength(0);
    expect(tracked.callsOf('getStationDirectory')).toHaveLength(1);
  });
});
