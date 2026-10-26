/**
 * Local store — favourites + recent searches behaviour (plan.md §9 Phase 5
 * acceptance: "Saved items survive app restarts. Users can remove saved
 * items."; DEC-006 policy: 20 recents / 100 favourites / 90-day TTL).
 *
 * Everything runs against the REAL store with injected persistence/clock/id
 * factories — no AsyncStorage, no timers, fully deterministic.
 */

import {
  LocalStoreInputError,
  createMemoryLocalStore,
  createMemoryLocalStorePersistence,
  type LocalStore,
} from '../../src/services/storage/localStore';
import {
  DEFAULT_LOCAL_STORE_POLICY,
  type LocalStorePolicy,
} from '../../src/types/favourites';
import type { JourneySearch } from '../../src/types/journey';

const T0 = new Date('2026-10-24T10:00:00.000Z');

function makeClock(start: Date = T0): {
  clock: () => Date;
  advanceDays: (days: number) => void;
} {
  let now = start;
  return {
    clock: () => now,
    advanceDays: (days) => {
      now = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    },
  };
}

function makeIdFactory(): () => string {
  let n = 0;
  return () => `id-${(n += 1)}`;
}

const SEARCH_A: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-varna',
  date: '2026-11-01',
};
const SEARCH_A_AGAIN: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-varna',
  date: '2026-11-01',
  time: '08:30',
};
const SEARCH_B: JourneySearch = {
  fromStationId: 'demo-station-sofia-central',
  toStationId: 'demo-station-plovdiv',
  date: '2026-11-01',
};

async function hydratedStore(
  config: Partial<Parameters<typeof createMemoryLocalStore>[0]> = {},
): Promise<LocalStore> {
  const store = createMemoryLocalStore({
    clock: makeClock().clock,
    idFactory: makeIdFactory(),
    ...config,
  });
  await store.hydrate();
  return store;
}

describe('localStore — persistence round-trip (app restarts)', () => {
  it('restores favourites and recent searches from the persisted snapshot', async () => {
    const persistence = createMemoryLocalStorePersistence();
    const first = await hydratedStore({ persistence });
    first.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      label: 'Почивка',
    });
    first.recordSearch(SEARCH_A, { resultCount: 3 });
    await first.flush(); // let the fire-and-forget writes land before the "restart"

    // "Restart": a fresh store over the SAME persisted bytes.
    const second = await hydratedStore({ persistence });
    const state = second.getSnapshot();
    expect(state.snapshot.favouriteRoutes).toHaveLength(1);
    expect(state.snapshot.favouriteRoutes[0]).toMatchObject({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      label: 'Почивка',
    });
    expect(state.snapshot.recentSearches).toHaveLength(1);
    expect(state.snapshot.recentSearches[0].search).toEqual(SEARCH_A);
    expect(state.snapshot.recentSearches[0].resultCount).toBe(3);
    expect(state.notices).toEqual([]);
  });

  it('starts unhydrated and settles without notices on an empty store', async () => {
    const store = createMemoryLocalStore();
    expect(store.getSnapshot().hydrated).toBe(false);
    await store.hydrate();
    expect(store.getSnapshot().hydrated).toBe(true);
    expect(store.getSnapshot().snapshot.schemaVersion).toBe(1);
    expect(store.getSnapshot().notices).toEqual([]);
    // hydrate() is idempotent.
    await store.hydrate();
    expect(store.getSnapshot().snapshot.recentSearches).toEqual([]);
  });
});

describe('localStore — favourites', () => {
  it('is identity-idempotent: the same from/to returns the existing route', async () => {
    const store = await hydratedStore();
    const first = store.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      label: 'first',
    });
    const again = store.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      label: 'second',
    });
    expect(again).toEqual(first); // same record — label NOT overwritten
    expect(store.getSnapshot().snapshot.favouriteRoutes).toHaveLength(1);
  });

  it('keeps station favourites idempotent and gives increasing sortOrder', async () => {
    const store = await hydratedStore();
    const a = store.addFavouriteStation({ stationId: 'demo-station-sofia-central' });
    const b = store.addFavouriteStation({ stationId: 'demo-station-varna' });
    const again = store.addFavouriteStation({ stationId: 'demo-station-varna' });
    expect(again.id).toBe(b.id);
    expect(a.sortOrder).toBe(0);
    expect(b.sortOrder).toBe(1);
    expect(store.getSnapshot().snapshot.favouriteStations).toHaveLength(2);
  });

  it('removeFavourite deletes by id from both collections, unknown ids are no-ops', async () => {
    const store = await hydratedStore();
    const route = store.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
    });
    const station = store.addFavouriteStation({ stationId: 'demo-station-plovdiv' });
    store.removeFavourite('does-not-exist');
    expect(store.getSnapshot().snapshot.favouriteRoutes).toHaveLength(1);

    store.removeFavourite(route.id);
    store.removeFavourite(station.id);
    expect(store.getSnapshot().snapshot.favouriteRoutes).toEqual([]);
    expect(store.getSnapshot().snapshot.favouriteStations).toEqual([]);
  });

  it('enforces the 100-favourite cap per collection (spec policy)', async () => {
    const store = await hydratedStore();
    for (let i = 0; i < 105; i += 1) {
      store.addFavouriteRoute({
        fromStationId: `demo-station-sofia-central`,
        toStationId: `demo-station-${i}`,
      });
    }
    const routes = store.getSnapshot().snapshot.favouriteRoutes;
    expect(routes).toHaveLength(DEFAULT_LOCAL_STORE_POLICY.maxFavourites);
    // POLICY header: "oldest dropped first" — the NEWEST 100 survive and are
    // listed most-recently-added first (useFavouriteRoutes contract).
    expect(routes[0].toStationId).toBe('demo-station-104');
    expect(routes[99].toStationId).toBe('demo-station-5');
  });

  it('honours an injected policy (cap of 2)', async () => {
    const policy: LocalStorePolicy = {
      maxRecentSearches: 2,
      maxFavourites: 2,
      recentSearchTtlDays: 90,
    };
    const store = await hydratedStore({ policy });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'c' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'd' });
    expect(store.getSnapshot().snapshot.favouriteRoutes).toHaveLength(2);
  });
});

describe('localStore — recent searches', () => {
  it('dedupes same from/to/date: one record, newest wins', async () => {
    const store = await hydratedStore();
    const first = store.recordSearch(SEARCH_A, { resultCount: 1 });
    store.recordSearch(SEARCH_B);
    const second = store.recordSearch(SEARCH_A_AGAIN, { resultCount: 9 });

    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents).toHaveLength(2); // A-key and B-key — no duplicates
    expect(recents[0].id).toBe(second.id); // newest first
    expect(recents[0].resultCount).toBe(9);
    expect(recents.map((r) => r.id)).not.toContain(first.id); // replaced
    // The dedupe key is from/to/date — the newer `time` won.
    expect(recents[0].search.time).toBe('08:30');
  });

  it('keeps different dates as separate records and orders newest first', async () => {
    const store = await hydratedStore();
    store.recordSearch({ ...SEARCH_A, date: '2026-11-01' });
    const later = store.recordSearch({ ...SEARCH_A, date: '2026-11-02' });
    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents).toHaveLength(2);
    expect(recents[0].id).toBe(later.id);
  });

  it('expires records older than 90 days (TTL)', async () => {
    const time = makeClock();
    const store = await hydratedStore({ clock: time.clock });
    store.recordSearch(SEARCH_A);
    time.advanceDays(91);
    store.recordSearch(SEARCH_B); // a write re-applies retention

    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents).toHaveLength(1);
    expect(recents[0].search.toStationId).toBe('demo-station-plovdiv');
  });

  it('keeps records inside the TTL window', async () => {
    const time = makeClock();
    const store = await hydratedStore({ clock: time.clock });
    store.recordSearch(SEARCH_A);
    time.advanceDays(89);
    store.recordSearch(SEARCH_B);
    expect(store.getSnapshot().snapshot.recentSearches).toHaveLength(2);
  });

  it('caps at 20 records, dropping the oldest', async () => {
    const store = await hydratedStore();
    for (let i = 0; i < 25; i += 1) {
      store.recordSearch({
        ...SEARCH_A,
        toStationId: `demo-station-${i}`,
        date: '2026-11-01',
      });
    }
    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents).toHaveLength(DEFAULT_LOCAL_STORE_POLICY.maxRecentSearches);
    expect(recents[0].search.toStationId).toBe('demo-station-24');
    expect(recents.at(-1)?.search.toStationId).toBe('demo-station-5');
  });

  it('removeRecent and clearRecentSearches never touch favourites', async () => {
    const store = await hydratedStore();
    const route = store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    const first = store.recordSearch(SEARCH_A);
    store.recordSearch(SEARCH_B);

    store.removeRecent(first.id);
    expect(store.getSnapshot().snapshot.recentSearches).toHaveLength(1);

    store.removeRecent('does-not-exist'); // no-op
    store.clearRecentSearches();
    expect(store.getSnapshot().snapshot.recentSearches).toEqual([]);
    expect(store.getSnapshot().snapshot.favouriteRoutes.map((r) => r.id)).toEqual([
      route.id,
    ]);
  });

  it('clearAll wipes favourites AND recents (the destructive "clear saved items")', async () => {
    const store = await hydratedStore();
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    store.addFavouriteStation({ stationId: 'demo-station-varna' });
    store.recordSearch(SEARCH_A);

    store.clearAll();
    const snapshot = store.getSnapshot().snapshot;
    expect(snapshot.favouriteRoutes).toEqual([]);
    expect(snapshot.favouriteStations).toEqual([]);
    expect(snapshot.recentSearches).toEqual([]);
  });
});

describe('localStore — write input validation (caller bugs, static errors)', () => {
  it('rejects blank and out-of-bound ids and labels without echoing values', async () => {
    const store = await hydratedStore();
    expect(() =>
      store.addFavouriteRoute({
        fromStationId: '   ',
        toStationId: 'demo-station-varna',
      }),
    ).toThrow(LocalStoreInputError);
    try {
      store.addFavouriteRoute({
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-varna',
        label: 'x'.repeat(500),
      });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(LocalStoreInputError);
      const typed = error as LocalStoreInputError;
      // Static message — the rejected values never leak (privacy rule).
      expect(typed.message).not.toContain('x'.repeat(50));
      expect(typed.message).toBe('Local store write rejected: invalid input.');
      expect(typed.diagnostics.length).toBeGreaterThan(0);
      expect(typed.diagnostics.join(' ')).not.toContain('xxxx');
    }
    expect(store.getSnapshot().snapshot.favouriteRoutes).toEqual([]);
  });

  it('rejects malformed search input and never stores it', async () => {
    const store = await hydratedStore();
    expect(() => store.recordSearch({ ...SEARCH_A, date: 'not-a-date' })).toThrow(
      LocalStoreInputError,
    );
    expect(() => store.recordSearch({ ...SEARCH_A, fromStationId: '' })).toThrow(
      LocalStoreInputError,
    );
    expect(() => store.recordSearch(SEARCH_A, { resultCount: Number.NaN })).toThrow(
      LocalStoreInputError,
    );
    expect(store.getSnapshot().snapshot.recentSearches).toEqual([]);
  });
});

describe('localStore — reactivity and persistence failures', () => {
  it('notifies subscribers on every change and stops after unsubscribe', async () => {
    const store = await hydratedStore();
    const seen: number[] = [];
    const unsubscribe = store.subscribe(() => {
      seen.push(store.getSnapshot().snapshot.recentSearches.length);
    });
    store.recordSearch(SEARCH_A);
    store.recordSearch(SEARCH_B);
    unsubscribe();
    store.recordSearch({ ...SEARCH_A, date: '2026-12-01' });
    expect(seen).toEqual([1, 2]);
  });

  it('surfaces write_failed as a notice while keeping the in-memory change', async () => {
    const store = await hydratedStore({
      persistence: {
        read: async () => null,
        write: async () => {
          throw new Error('disk full');
        },
      },
    });
    store.recordSearch(SEARCH_A);
    // Let the queued write promise reject and its catch run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getSnapshot().snapshot.recentSearches).toHaveLength(1);
    expect(store.getSnapshot().notices.map((n) => n.reason)).toContain('write_failed');
  });
});
