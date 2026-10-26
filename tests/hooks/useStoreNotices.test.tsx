/**
 * useStoreNotices — hook contract over the REAL local store (DEC-007 App. B.4
 * "reset per-field with a visible notice"; DEC-026 Phase-7 blocker (a)).
 *
 * What this suite pins:
 *  - a corrupt read surfaces notices through the hook (empty before the load
 *    settles, non-empty after);
 *  - PER-FIELD recovery is visible per field: a corrupt record drops only
 *    that record (`invalid_record` + that field), a corrupt collection resets
 *    only that field (`invalid_collection` + that field);
 *  - REACTIVITY: a write failure recorded later (memory persistence seam
 *    rejecting `write`) reaches every mounted instance without a remount;
 *  - the contract order is NEWEST FIRST (the store's own history is
 *    chronological and must not be mutated by the hook);
 *  - the returned array is a stable reference between notice changes.
 *
 * No AsyncStorage, no timers: injected memory store with a controlled
 * persistence seam.
 */

import { act } from '@testing-library/react-native';

import { useStoreNotices, type LocalStoreNotice } from '../../src/hooks';
import {
  createMemoryLocalStore,
  createMemoryLocalStorePersistence,
  type LocalStorePersistence,
} from '../../src/services/storage/localStore';
import type { JourneySearch } from '../../src/types/journey';

import { renderDataHook } from './testSupport';

const SEARCH_A: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-varna',
  date: '2026-11-01',
};

const reasons = (notices: readonly LocalStoreNotice[]): string[] =>
  notices.map((notice) => notice.reason);

describe('useStoreNotices — corruption notices (DEC-007 App. B.4)', () => {
  it('is empty before hydration and surfaces a notice on a corrupt read', async () => {
    let releaseRead: (() => void) | undefined;
    const slowRead = new Promise<string | null>((resolve) => {
      releaseRead = () => resolve('not json {');
    });
    const persistence: LocalStorePersistence = {
      read: () => slowRead,
      write: async () => undefined,
    };

    const { result, unmount } = await renderDataHook(useStoreNotices, {
      localStore: createMemoryLocalStore({ persistence }),
    });
    expect(result.current.notices).toEqual([]);

    await act(async () => {
      releaseRead?.();
      await slowRead;
    });

    expect(reasons(result.current.notices)).toContain('malformed_snapshot');
    expect(result.current.notices[0]).toMatchObject({ field: 'snapshot' });
    expect(typeof result.current.notices[0].at).toBe('string');
    await unmount();
  });

  it('describes per-field resets: one corrupt record, one corrupt collection', async () => {
    // Seed a REAL snapshot via the store itself, then corrupt it field-wise.
    const persistence = createMemoryLocalStorePersistence();
    const seedStore = createMemoryLocalStore({ persistence });
    await seedStore.hydrate();
    seedStore.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    seedStore.addFavouriteStation({ stationId: 'demo-station-sofia-central' });
    seedStore.recordSearch(SEARCH_A);
    await seedStore.flush();

    const stored = JSON.parse(persistence.dump() ?? 'null') as Record<string, unknown>;
    stored.favouriteRoutes = [...(stored.favouriteRoutes as unknown[]), { bad: true }];
    stored.recentSearches = 'corrupt';

    const { result, unmount } = await renderDataHook(useStoreNotices, {
      localStore: createMemoryLocalStore({ initialRaw: stored }),
    });
    await act(async () => {});

    const notices = result.current.notices;
    // Per-field, per-record: each reset is described by its own notice.
    expect(
      notices.some(
        (notice) =>
          notice.reason === 'invalid_record' && notice.field === 'favouriteRoutes',
      ),
    ).toBe(true);
    expect(
      notices.some(
        (notice) =>
          notice.reason === 'invalid_collection' && notice.field === 'recentSearches',
      ),
    ).toBe(true);
    // The healthy field produced NO reset notice.
    expect(notices.some((notice) => notice.field === 'favouriteStations')).toBe(false);
    await unmount();
  });
});

describe('useStoreNotices — reactivity, ordering, stability', () => {
  it('surfaces a write failure reactively in every mounted instance', async () => {
    const persistence: LocalStorePersistence = {
      read: async () => null,
      write: async () => {
        throw new Error('simulated disk failure');
      },
    };
    const store = createMemoryLocalStore({ persistence });

    function useTwoInstances() {
      return { first: useStoreNotices(), second: useStoreNotices() };
    }
    const { result, unmount } = await renderDataHook(useTwoInstances, {
      localStore: store,
    });
    expect(result.current.first.notices).toEqual([]);
    expect(result.current.second.notices).toEqual([]);

    await act(async () => {
      store.addFavouriteStation({ stationId: 'demo-station-sofia-central' });
      await store.flush();
    });

    expect(reasons(result.current.first.notices)).toEqual(['write_failed']);
    expect(reasons(result.current.second.notices)).toEqual(['write_failed']);
    expect(result.current.first.notices[0]).toMatchObject({ field: 'snapshot' });
    await unmount();
  });

  it('returns notices newest first and never mutates the store history', async () => {
    let tick = 0;
    const store = createMemoryLocalStore({
      clock: () => new Date(Date.UTC(2026, 9, 25, 12, 0, tick++)),
      persistence: {
        read: async () => null,
        write: async () => {
          throw new Error('simulated disk failure');
        },
      },
    });

    const { result, unmount } = await renderDataHook(useStoreNotices, {
      localStore: store,
    });

    await act(async () => {
      store.addFavouriteStation({ stationId: 'demo-station-sofia-central' });
      await store.flush();
    });
    await act(async () => {
      store.addFavouriteStation({ stationId: 'demo-station-varna' });
      await store.flush();
    });

    const notices = result.current.notices;
    expect(reasons(notices)).toEqual(['write_failed', 'write_failed']);
    expect(Date.parse(notices[0].at)).toBeGreaterThan(Date.parse(notices[1].at));
    // The store's own state keeps chronological order — the hook's newest-first
    // view is a copy, not a reordering of the shared history.
    expect(Date.parse(store.getSnapshot().notices[0].at)).toBeLessThan(
      Date.parse(store.getSnapshot().notices[1].at),
    );
    await unmount();
  });

  it('keeps a stable array reference across unrelated state changes', async () => {
    const store = createMemoryLocalStore({ initialRaw: 'not json {' });
    const { result, unmount } = await renderDataHook(useStoreNotices, {
      localStore: store,
    });
    await act(async () => {});
    expect(result.current.notices.length).toBeGreaterThan(0);

    const before = result.current.notices;
    await act(async () => {
      store.addFavouriteStation({ stationId: 'demo-station-sofia-central' });
      await store.flush();
    });
    expect(result.current.notices).toBe(before);
    await unmount();
  });
});
