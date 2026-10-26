/**
 * useFavouriteRoutes / useRecentSearches — hook contract over the REAL
 * local store (reviewer-qa, Phase 5 review).
 *
 * The mobile-ui suites mock these hooks at the contract boundary
 * (tests/mobile-ui/*), so nothing there proves the hooks actually bind the
 * store. This suite closes that gap:
 *  - `useSyncExternalStore` reactivity: every mounted instance sees adds,
 *    removes and clears immediately (src/hooks docs);
 *  - `isLoading` is true until the snapshot is hydrated and false after;
 *  - identity-idempotent adds through the hook;
 *  - `useRecentSearches().clearAll()` clears recents ONLY (hook contract);
 *  - corruption notices surface through both hooks (Appendix B.4).
 *
 * No AsyncStorage, no timers: injected memory store with a controlled
 * persistence.
 */

import { act } from '@testing-library/react-native';

import { useFavouriteRoutes } from '../../src/hooks/useFavouriteRoutes';
import { useRecentSearches } from '../../src/hooks/useRecentSearches';
import {
  createMemoryLocalStore,
  type LocalStorePersistence,
} from '../../src/services/storage/localStore';
import type { JourneySearch } from '../../src/types/journey';

import { renderDataHook } from './testSupport';

const SEARCH_A: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-varna',
  date: '2026-11-01',
};
const SEARCH_B: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  date: '2026-11-01',
};

function useCombined() {
  return {
    favourites: useFavouriteRoutes(),
    favouritesAgain: useFavouriteRoutes(),
    recents: useRecentSearches(),
  };
}

describe('local store hooks — reactivity across mounted instances', () => {
  it('shows an add from one instance in every other instance immediately', async () => {
    const { result, unmount } = await renderDataHook(useCombined, {
      localStore: createMemoryLocalStore(),
    });

    await act(async () => {
      result.current.favourites.addFavourite({
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-varna',
      });
    });

    expect(result.current.favourites.favourites).toHaveLength(1);
    expect(result.current.favouritesAgain.favourites).toHaveLength(1);
    expect(result.current.favouritesAgain.favourites[0].toStationId).toBe(
      'demo-station-varna',
    );

    await act(async () => {
      result.current.favouritesAgain.removeFavourite(
        result.current.favourites.favourites[0].id,
      );
    });
    expect(result.current.favourites.favourites).toHaveLength(0);
    await unmount();
  });

  it('is identity-idempotent through the hook (same record, no duplicate)', async () => {
    const { result, unmount } = await renderDataHook(useCombined, {
      localStore: createMemoryLocalStore(),
    });

    let firstId = '';
    await act(async () => {
      firstId = result.current.favourites.addFavourite({
        fromStationId: 'a',
        toStationId: 'b',
        label: 'first',
      }).id;
      result.current.favourites.addFavourite({
        fromStationId: 'a',
        toStationId: 'b',
        label: 'second',
      });
    });

    expect(result.current.favourites.favourites).toHaveLength(1);
    expect(result.current.favourites.favourites[0].id).toBe(firstId);
    expect(result.current.favourites.favourites[0].label).toBe('first');
    await unmount();
  });

  it('records, dedupes and removes recents across instances', async () => {
    const { result, unmount } = await renderDataHook(useCombined, {
      localStore: createMemoryLocalStore(),
    });

    await act(async () => {
      result.current.recents.recordSearch(SEARCH_A);
      result.current.recents.recordSearch(SEARCH_B);
    });
    expect(result.current.recents.recents).toHaveLength(2);

    // Same from/to/date replaces the older record (hook contract).
    await act(async () => {
      result.current.recents.recordSearch({ ...SEARCH_A });
    });
    expect(result.current.recents.recents).toHaveLength(2);

    await act(async () => {
      result.current.recents.removeRecent(result.current.recents.recents[0].id);
    });
    expect(result.current.recents.recents).toHaveLength(1);
    await unmount();
  });

  it('clearAll() clears recent searches only and never favourites', async () => {
    const { result, unmount } = await renderDataHook(useCombined, {
      localStore: createMemoryLocalStore(),
    });

    await act(async () => {
      result.current.favourites.addFavourite({ fromStationId: 'a', toStationId: 'b' });
      result.current.recents.recordSearch(SEARCH_A);
    });
    await act(async () => {
      result.current.recents.clearAll();
    });

    expect(result.current.recents.recents).toEqual([]);
    expect(result.current.favourites.favourites).toHaveLength(1);
    await unmount();
  });
});

describe('local store hooks — isLoading and notices', () => {
  it('isLoading is true until hydration settles and false afterwards', async () => {
    let releaseRead: (() => void) | undefined;
    const slowRead = new Promise<string | null>((resolve) => {
      releaseRead = () => resolve(null);
    });
    const persistence: LocalStorePersistence = {
      read: () => slowRead,
      write: async () => undefined,
    };

    const { result, unmount } = await renderDataHook(useCombined, {
      localStore: createMemoryLocalStore({ persistence }),
    });
    expect(result.current.favourites.isLoading).toBe(true);
    expect(result.current.recents.isLoading).toBe(true);

    await act(async () => {
      releaseRead?.();
      await slowRead;
    });

    expect(result.current.favourites.isLoading).toBe(false);
    expect(result.current.recents.isLoading).toBe(false);
    await unmount();
  });

  it('surfaces corruption notices through both hooks (Appendix B.4)', async () => {
    const { result, unmount } = await renderDataHook(useCombined, {
      localStore: createMemoryLocalStore({ initialRaw: 'not json {' }),
    });
    await act(async () => {});

    const reasons = (result.current.favourites.notices ?? []).map((n) => n.reason);
    expect(reasons).toContain('malformed_snapshot');
    expect((result.current.recents.notices ?? []).map((n) => n.reason)).toContain(
      'malformed_snapshot',
    );
    await unmount();
  });
});
