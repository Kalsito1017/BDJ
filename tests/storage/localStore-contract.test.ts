/**
 * Local store — CONTRACT tests (reviewer-qa, Phase 5 review 2026-10-24).
 *
 * tests/storage/localStore.test.ts covers the happy paths. This suite pins
 * the behaviour the DOCUMENTS promise, so tests assert intended behaviour
 * and never merely mirror the implementation:
 *
 *  - POLICY header of src/services/storage/localStore.ts: "20 recent
 *    searches, 100 favourites PER collection … oldest dropped first";
 *  - src/hooks/useFavouriteRoutes.ts contract: "`favourites` — persisted
 *    `FavouriteRoute[]`, most recently added first";
 *  - LocalStore.addFavouriteRoute: the returned record is the record the
 *    store holds (a caller that receives a record believes it is saved);
 *  - "Writes made before hydration completes WIN over the pending load" —
 *    a write wins OVER the load; it must not DESTROY the loaded history
 *    (plan.md §9 Phase 5: "Saved items survive app restarts");
 *  - DEC-006 "Local storage is untrusted input … corrupt records are
 *    dropped, corrupt collections are reset … and every reset surfaces a
 *    LocalStoreNotice";
 *  - `flush()`: queued fire-and-forget writes are serialised (an older
 *    snapshot can never land after a newer one) and `flush()` awaits them;
 *  - privacy (localStore.ts header): ONLY the documented fields are ever
 *    persisted — asserted by a key-path allowlist over the raw bytes.
 *
 * Everything runs against the REAL store with injected persistence/clock/id
 * factories — no AsyncStorage, no timers, fully deterministic.
 */

import {
  LocalStoreInputError,
  createLocalStore,
  createMemoryLocalStore,
  createMemoryLocalStorePersistence,
  type LocalStore,
  type LocalStorePersistence,
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
  advanceSeconds: (seconds: number) => void;
} {
  let now = start;
  return {
    clock: () => now,
    advanceDays: (days) => {
      now = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    },
    advanceSeconds: (seconds) => {
      now = new Date(now.getTime() + seconds * 1000);
    },
  };
}

function makeIdFactory(): () => string {
  let n = 0;
  return () => `id-${(n += 1)}`;
}

function search(overrides: Partial<JourneySearch> = {}): JourneySearch {
  return {
    fromStationId: 'demo-station-sofia-central',
    toStationId: 'demo-station-varna',
    date: '2026-11-01',
    ...overrides,
  };
}

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

/** Let pending promise jobs run (real timers in this suite). */
const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/* ------------------------------------------------------------------ */
/* Retention: TTL + caps + eviction direction (POLICY header)          */
/* ------------------------------------------------------------------ */

describe('retention — 90-day TTL on recent searches (boundary)', () => {
  it('keeps a record exactly 90 days old (boundary is inclusive)', async () => {
    const time = makeClock();
    const store = await hydratedStore({ clock: time.clock });
    store.recordSearch(search());
    time.advanceDays(90); // exactly at the cutoff
    store.recordSearch(search({ toStationId: 'demo-station-plovdiv' }));

    expect(store.getSnapshot().snapshot.recentSearches).toHaveLength(2);
  });

  it('drops a record one second past the 90-day boundary', async () => {
    const time = makeClock();
    const store = await hydratedStore({ clock: time.clock });
    store.recordSearch(search());
    time.advanceDays(90);
    time.advanceSeconds(1); // just past the cutoff
    store.recordSearch(search({ toStationId: 'demo-station-plovdiv' }));

    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents).toHaveLength(1);
    expect(recents[0].search.toStationId).toBe('demo-station-plovdiv');
  });

  it('re-applies the TTL on READ, silently (retention is not corruption)', async () => {
    const time = makeClock();
    const old = new Date(T0.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const store = await hydratedStore({
      clock: time.clock,
      initialRaw: {
        schemaVersion: 1,
        favouriteStations: [],
        favouriteRoutes: [],
        recentSearches: [
          {
            id: 'r-old',
            search: search(),
            searchedAt: old,
          },
        ],
        policy: DEFAULT_LOCAL_STORE_POLICY,
      },
    });

    expect(store.getSnapshot().snapshot.recentSearches).toEqual([]);
    expect(store.getSnapshot().notices).toEqual([]);
  });

  it('re-applies the dedupe rule on READ (newest duplicate wins)', async () => {
    const store = await hydratedStore({
      initialRaw: {
        schemaVersion: 1,
        favouriteStations: [],
        favouriteRoutes: [],
        recentSearches: [
          { id: 'r-older', search: search(), searchedAt: '2026-10-20T10:00:00.000Z' },
          { id: 'r-newer', search: search(), searchedAt: '2026-10-23T10:00:00.000Z' },
        ],
        policy: DEFAULT_LOCAL_STORE_POLICY,
      },
    });

    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents.map((r) => r.id)).toEqual(['r-newer']);
  });
});

describe('retention — caps', () => {
  it('keeps exactly maxRecentSearches and drops the oldest', async () => {
    const policy: LocalStorePolicy = { ...DEFAULT_LOCAL_STORE_POLICY };
    const store = await hydratedStore({ policy });
    for (let i = 0; i < policy.maxRecentSearches + 1; i += 1) {
      store.recordSearch(search({ toStationId: `demo-station-${i}` }));
    }
    const recents = store.getSnapshot().snapshot.recentSearches;
    expect(recents).toHaveLength(policy.maxRecentSearches);
    // "oldest dropped first": the newest record is present, the first is gone.
    expect(recents[0].search.toStationId).toBe(
      `demo-station-${policy.maxRecentSearches}`,
    );
    expect(recents.map((r) => r.search.toStationId)).not.toContain('demo-station-0');
  });

  it('drops the OLDEST favourite when the cap is exceeded (POLICY header)', async () => {
    const policy: LocalStorePolicy = { ...DEFAULT_LOCAL_STORE_POLICY, maxFavourites: 2 };
    const store = await hydratedStore({ policy });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' }); // oldest
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'c' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'd' }); // newest

    const routes = store.getSnapshot().snapshot.favouriteRoutes;
    expect(routes).toHaveLength(2);
    // "oldest dropped first" — the NEW favourite survives, the oldest goes.
    expect(routes.map((r) => r.toStationId).sort()).toEqual(['c', 'd']);
  });

  it('orders favourites most recently added first (useFavouriteRoutes contract)', async () => {
    const store = await hydratedStore();
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'c' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'd' });

    // The hook contract mobile-ui codes against: most recently added first.
    expect(
      store.getSnapshot().snapshot.favouriteRoutes.map((r) => r.toStationId),
    ).toEqual(['d', 'c', 'b']);
  });

  it('never returns a favourite record the store does not hold', async () => {
    const policy: LocalStorePolicy = { ...DEFAULT_LOCAL_STORE_POLICY, maxFavourites: 2 };
    const store = await hydratedStore({ policy });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'c' });
    const returned = store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'd' });

    // A caller that receives a record believes the route is saved (see
    // SaveRouteControl). The returned record must therefore be in the
    // snapshot — or the call must fail loudly. Silent loss is a defect.
    const ids = store.getSnapshot().snapshot.favouriteRoutes.map((r) => r.id);
    expect(ids).toContain(returned.id);
  });
});

/* ------------------------------------------------------------------ */
/* flush(): serialised writes, restart-safe                            */
/* ------------------------------------------------------------------ */

/**
 * Persistence whose writes complete only when the test says so — flush()
 * becomes load-bearing (with instant writes even a lost flush passes).
 * `release()` switches to auto-resolve: pending AND future writes land.
 */
function makeControlledPersistence(
  initial: string | null = null,
): LocalStorePersistence & {
  writes: string[];
  pendingCount(): number;
  resolveNext(): void;
  release(): void;
  dump(): string | null;
} {
  let raw = initial;
  let hold = true;
  const writes: string[] = [];
  const resolvers: (() => void)[] = [];
  const drain = (): void => {
    while (!hold && resolvers.length > 0) resolvers.shift()?.();
  };
  return {
    writes,
    read: async () => raw,
    write(serialized: string) {
      writes.push(serialized);
      return new Promise<void>((resolve) => {
        resolvers.push(() => {
          raw = serialized;
          resolve();
        });
        drain();
      });
    },
    pendingCount: () => resolvers.length,
    resolveNext: () => resolvers.shift()?.(),
    release: () => {
      hold = false;
      drain();
    },
    dump: () => raw,
  };
}

describe('flush() and write serialisation', () => {
  it('serialises writes: a second write starts only after the first settles', async () => {
    const persistence = makeControlledPersistence();
    const store = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    await store.hydrate();

    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'c' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'd' });

    // Only ONE write may be in flight at a time (queue ordering).
    await tick();
    expect(persistence.writes).toHaveLength(1);
    persistence.resolveNext();
    await tick();
    expect(persistence.writes).toHaveLength(2);
    persistence.resolveNext();
    await tick();
    expect(persistence.writes).toHaveLength(3);
  });

  it('flush() resolves only after every queued write has landed, newest bytes win', async () => {
    const persistence = makeControlledPersistence();
    const store = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    await store.hydrate();

    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'b' });
    store.addFavouriteRoute({ fromStationId: 'a', toStationId: 'c' });

    let flushed = false;
    const flushPromise = store.flush().then(() => {
      flushed = true;
    });
    await tick();
    expect(flushed).toBe(false); // writes still pending — flush must not lie

    persistence.release();
    await flushPromise;

    // The persisted bytes are the LATEST snapshot (2 favourites), never an
    // older one landing after a newer write.
    const persisted = JSON.parse(persistence.dump() ?? 'null');
    expect(persisted.favouriteRoutes).toHaveLength(2);
    const counts = persistence.writes.map(
      (w) => JSON.parse(w).favouriteRoutes.length as number,
    );
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it('survives a true app restart when writes were still pending (flush is load-bearing)', async () => {
    const persistence = makeControlledPersistence();
    const first = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    await first.hydrate();
    first.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
    });
    first.recordSearch(search());

    // Writes are deliberately still pending here. flush() must land them.
    persistence.release();
    await first.flush();
    await tick();

    const second = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    await second.hydrate();
    expect(second.getSnapshot().snapshot.favouriteRoutes).toHaveLength(1);
    expect(second.getSnapshot().snapshot.recentSearches).toHaveLength(1);
    expect(second.getSnapshot().notices).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Hydration races: writes win WITHOUT destroying the loaded history   */
/* ------------------------------------------------------------------ */

describe('writes vs a pending load', () => {
  it('keeps previously persisted records when a write lands before hydration finishes', async () => {
    const persistence = makeControlledPersistence();
    let releaseRead: (() => void) | undefined;
    const slowRead = new Promise<string | null>((resolve) => {
      releaseRead = () =>
        resolve(
          JSON.stringify({
            schemaVersion: 1,
            favouriteStations: [],
            favouriteRoutes: [
              {
                id: 'f-old',
                fromStationId: 'demo-station-sofia-central',
                toStationId: 'demo-station-varna',
                createdAt: T0.toISOString(),
                sortOrder: 0,
              },
            ],
            recentSearches: [],
            policy: DEFAULT_LOCAL_STORE_POLICY,
          }),
        );
    });
    const slowPersistence: LocalStorePersistence = {
      read: () => slowRead,
      write: async (serialized) => {
        persistence.writes.push(serialized);
      },
    };

    const store = createLocalStore({
      persistence: slowPersistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    // A write BEFORE hydration settles (the recents path is not gated on
    // isLoading — JourneySearchScreen records searches immediately).
    store.recordSearch(search());
    releaseRead?.();
    await store.hydrate();

    // The write "wins" over the load for its own record — but the rest of
    // the persisted history must survive (plan.md: "Saved items survive
    // app restarts").
    const snapshot = store.getSnapshot().snapshot;
    expect(snapshot.favouriteRoutes.map((r) => r.id)).toEqual(['f-old']);
    expect(snapshot.recentSearches).toHaveLength(1);
  });

  /**
   * Persistence with a read that settles only when the test releases it. The
   * read captures the bytes as they were when the load STARTED (like a getItem
   * already in flight), so a racing write may overwrite `raw` meanwhile.
   */
  function makeRacingPersistence(initialRaw: string | null): LocalStorePersistence & {
    dump(): string | null;
    releaseRead(): void;
  } {
    let raw = initialRaw;
    let releaseRead: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    return {
      read: async () => {
        const bytesAtReadStart = raw;
        await gate;
        return bytesAtReadStart;
      },
      write: async (serialized) => {
        raw = serialized;
      },
      dump: () => raw,
      releaseRead: () => releaseRead?.(),
    };
  }

  function loadedRaw(overrides: {
    favouriteRoutes?: unknown[];
    favouriteStations?: unknown[];
    recentSearches?: unknown[];
    schemaVersion?: number;
  }): string {
    return JSON.stringify({
      schemaVersion: overrides.schemaVersion ?? 1,
      favouriteStations: overrides.favouriteStations ?? [],
      favouriteRoutes: overrides.favouriteRoutes ?? [],
      recentSearches: overrides.recentSearches ?? [],
      policy: DEFAULT_LOCAL_STORE_POLICY,
    });
  }

  it('heals the disk snapshot after the merge (racing write + loaded history both land)', async () => {
    const persistence = makeRacingPersistence(
      loadedRaw({
        favouriteRoutes: [
          {
            id: 'f-old',
            fromStationId: 'demo-station-sofia-central',
            toStationId: 'demo-station-varna',
            createdAt: T0.toISOString(),
            sortOrder: 0,
          },
        ],
      }),
    );
    const clock = makeClock();
    const store = createLocalStore({
      persistence,
      clock: clock.clock,
      idFactory: makeIdFactory(),
    });
    // The racing write itself persists a TRUNCATED snapshot (history not yet
    // loaded). The merge must re-persist so the truncated bytes never survive.
    const returned = store.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-plovdiv',
    });
    persistence.releaseRead();
    await store.hydrate();
    await store.flush();

    const raw = persistence.dump();
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw as string) as {
      favouriteRoutes: { id: string }[];
    };
    expect(persisted.favouriteRoutes.map((r) => r.id).sort()).toEqual(
      ['f-old', returned.id].sort(),
    );
  });

  it('a corrupt loaded snapshot keeps the racing write and raises a notice', async () => {
    const persistence = makeRacingPersistence('{ definitely not json');
    const store = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    const returned = store.addFavouriteRoute({
      fromStationId: 'a',
      toStationId: 'b',
    });
    persistence.releaseRead();
    await store.hydrate();

    const state = store.getSnapshot();
    expect(state.snapshot.favouriteRoutes.map((r) => r.id)).toEqual([returned.id]);
    expect(state.notices.map((n) => n.reason)).toContain('malformed_snapshot');
  });

  it('an unsupported schemaVersion in the load keeps the racing write and raises a notice', async () => {
    const persistence = makeRacingPersistence(
      loadedRaw({
        schemaVersion: 99,
        favouriteRoutes: [
          {
            id: 'f-ignored',
            fromStationId: 'x',
            toStationId: 'y',
            createdAt: T0.toISOString(),
            sortOrder: 0,
          },
        ],
      }),
    );
    const store = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    const returned = store.addFavouriteRoute({
      fromStationId: 'a',
      toStationId: 'b',
    });
    persistence.releaseRead();
    await store.hydrate();

    const state = store.getSnapshot();
    expect(state.snapshot.favouriteRoutes.map((r) => r.id)).toEqual([returned.id]);
    expect(state.notices.map((n) => n.reason)).toContain('unsupported_schema_version');
  });

  /**
   * REGRESSION (defect pinned by reviewer-qa 2026-10-25, fixed the same day):
   * a pre-hydration add gets `sortOrder = nextSortOrder(in-memory)` = 0 while
   * the loaded history may hold higher sortOrders. Without the merge rebase,
   * sorting by sortOrder DESC at the cap silently evicted the NEWEST record —
   * the write's own, which the merge promises "wins for its own record" — and
   * `addFavouriteRoute` returned it as saved. "Oldest dropped first" must
   * evict f-old-a instead.
   */
  it('holds a favourite added before hydration at the cap after the merge (oldest dropped first)', async () => {
    const policy: LocalStorePolicy = {
      ...DEFAULT_LOCAL_STORE_POLICY,
      maxFavourites: 2,
    };
    const persistence = makeRacingPersistence(
      loadedRaw({
        favouriteRoutes: [
          {
            id: 'f-old-a',
            fromStationId: 'x',
            toStationId: 'a',
            createdAt: T0.toISOString(),
            sortOrder: 1, // gap: sortOrder 0 was deleted in a past session
          },
          {
            id: 'f-old-b',
            fromStationId: 'x',
            toStationId: 'b',
            createdAt: T0.toISOString(),
            sortOrder: 2,
          },
        ],
      }),
    );
    const clock = makeClock();
    const store = createLocalStore({
      persistence,
      clock: clock.clock,
      idFactory: makeIdFactory(),
      policy,
    });
    clock.advanceSeconds(60); // the racing add is the NEWEST record
    const returned = store.addFavouriteRoute({
      fromStationId: 'x',
      toStationId: 'c',
    });
    persistence.releaseRead();
    await store.hydrate();

    const ids = store.getSnapshot().snapshot.favouriteRoutes.map((r) => r.id);
    expect(ids).toContain(returned.id);
  });
});

/* ------------------------------------------------------------------ */
/* Corrupt-snapshot recovery (DEC-006 untrusted input)                 */
/* ------------------------------------------------------------------ */

describe('corrupt-snapshot recovery', () => {
  it('replaces a malformed (non-JSON) snapshot without crashing', async () => {
    const store = await hydratedStore({ initialRaw: 'this is not json {' });
    const state = store.getSnapshot();
    expect(state.hydrated).toBe(true);
    expect(state.snapshot.schemaVersion).toBe(1);
    expect(state.snapshot.favouriteRoutes).toEqual([]);
    expect(state.notices.map((n) => n.reason)).toEqual(['malformed_snapshot']);
  });

  it.each(['[]', 'null', '"a string"', '42'])(
    'treats %s as a malformed snapshot (must be an object)',
    async (raw) => {
      const store = await hydratedStore({ initialRaw: raw });
      expect(store.getSnapshot().snapshot.favouriteRoutes).toEqual([]);
      expect(store.getSnapshot().notices.map((n) => n.reason)).toEqual([
        'malformed_snapshot',
      ]);
    },
  );

  it('replaces an unsupported schemaVersion instead of guessing', async () => {
    const store = await hydratedStore({
      initialRaw: {
        schemaVersion: 2,
        favouriteStations: [],
        favouriteRoutes: [],
        recentSearches: [],
        policy: DEFAULT_LOCAL_STORE_POLICY,
      },
    });
    expect(store.getSnapshot().snapshot.schemaVersion).toBe(1);
    expect(store.getSnapshot().notices.map((n) => n.reason)).toEqual([
      'unsupported_schema_version',
    ]);
  });

  it('resets only the corrupt collection and keeps the rest', async () => {
    const store = await hydratedStore({
      initialRaw: {
        schemaVersion: 1,
        favouriteStations: 'not-an-array',
        favouriteRoutes: [
          {
            id: 'f-ok',
            fromStationId: 'a',
            toStationId: 'b',
            createdAt: T0.toISOString(),
            sortOrder: 0,
          },
        ],
        recentSearches: [],
        policy: DEFAULT_LOCAL_STORE_POLICY,
      },
    });
    const state = store.getSnapshot();
    expect(state.snapshot.favouriteStations).toEqual([]);
    expect(state.snapshot.favouriteRoutes.map((r) => r.id)).toEqual(['f-ok']);
    expect(state.notices.map((n) => n.reason)).toEqual(['invalid_collection']);
  });

  it('drops only the corrupt record and keeps its siblings', async () => {
    const store = await hydratedStore({
      initialRaw: {
        schemaVersion: 1,
        favouriteStations: [],
        favouriteRoutes: [
          {
            id: 'f-ok',
            fromStationId: 'a',
            toStationId: 'b',
            createdAt: T0.toISOString(),
            sortOrder: 0,
          },
          { id: 'f-bad', fromStationId: 'a' }, // missing fields
          {
            id: 'f-ok-2',
            fromStationId: 'c',
            toStationId: 'd',
            createdAt: T0.toISOString(),
            sortOrder: 1,
          },
        ],
        recentSearches: [],
        policy: DEFAULT_LOCAL_STORE_POLICY,
      },
    });
    const state = store.getSnapshot();
    // Order-independent: this test is about NO DATA LOSS (siblings survive a
    // corrupt record). Listing order is pinned by the contract tests above.
    expect(state.snapshot.favouriteRoutes.map((r) => r.id).sort()).toEqual([
      'f-ok',
      'f-ok-2',
    ]);
    expect(state.notices.map((n) => n.reason)).toEqual(['invalid_record']);
  });

  it('notices a corrupt policy but enforces the STORE policy', async () => {
    const store = await hydratedStore({
      initialRaw: {
        schemaVersion: 1,
        favouriteStations: [],
        favouriteRoutes: [],
        recentSearches: [],
        policy: { maxRecentSearches: 'many' },
      },
    });
    const state = store.getSnapshot();
    expect(state.notices.map((n) => n.reason)).toEqual(['invalid_policy']);
    expect(state.snapshot.policy).toEqual(DEFAULT_LOCAL_STORE_POLICY);
  });

  it('reports read_failed as a notice and settles hydrated', async () => {
    const store = createMemoryLocalStore({
      clock: makeClock().clock,
      persistence: {
        read: async () => {
          throw new Error('storage unavailable');
        },
        write: async () => undefined,
      },
    });
    await store.hydrate();
    const state = store.getSnapshot();
    expect(state.hydrated).toBe(true);
    expect(state.notices.map((n) => n.reason)).toEqual(['read_failed']);
  });

  it('bounds the notice history (maxNotices)', async () => {
    const store = await hydratedStore({
      maxNotices: 3,
      initialRaw: {
        schemaVersion: 1,
        favouriteStations: [],
        favouriteRoutes: [
          { id: 'bad-1' },
          { id: 'bad-2' },
          { id: 'bad-3' },
          { id: 'bad-4' },
        ],
        recentSearches: [{ id: 'bad-5' }],
        policy: DEFAULT_LOCAL_STORE_POLICY,
      },
    });
    expect(store.getSnapshot().notices.length).toBeLessThanOrEqual(3);
  });
});

/* ------------------------------------------------------------------ */
/* Privacy: key-path allowlist over the raw persisted bytes            */
/* ------------------------------------------------------------------ */

describe('privacy — persisted key-path allowlist (localStore.ts header)', () => {
  const ALLOWED_PATHS: ReadonlySet<string> = new Set([
    'schemaVersion',
    'policy.maxRecentSearches',
    'policy.maxFavourites',
    'policy.recentSearchTtlDays',
    'favouriteStations[].id',
    'favouriteStations[].stationId',
    'favouriteStations[].label',
    'favouriteStations[].createdAt',
    'favouriteStations[].sortOrder',
    'favouriteRoutes[].id',
    'favouriteRoutes[].fromStationId',
    'favouriteRoutes[].toStationId',
    'favouriteRoutes[].label',
    'favouriteRoutes[].createdAt',
    'favouriteRoutes[].sortOrder',
    'recentSearches[].id',
    'recentSearches[].search.fromStationId',
    'recentSearches[].search.toStationId',
    'recentSearches[].search.date',
    'recentSearches[].search.time',
    'recentSearches[].search.limit',
    'recentSearches[].searchedAt',
    'recentSearches[].resultCount',
  ]);

  function keyPaths(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).flatMap(([key, item]) =>
        keyPaths(item, prefix === '' ? key : `${prefix}.${key}`),
      );
    }
    return [prefix];
  }

  it('keeps every persisted key path inside the allowlist (raw bytes)', async () => {
    const persistence = createMemoryLocalStorePersistence();
    const store = createLocalStore({
      persistence,
      clock: makeClock().clock,
      idFactory: makeIdFactory(),
    });
    await store.hydrate();
    store.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      label: 'Почивка 🚆',
    });
    store.addFavouriteStation({ stationId: 'demo-station-plovdiv' });
    store.recordSearch({ ...search(), time: '08:30', limit: 10 }, { resultCount: 3 });
    await store.flush();

    const raw = persistence.dump();
    expect(raw).not.toBeNull();
    const paths = new Set(keyPaths(JSON.parse(raw as string)));
    const unexpected = [...paths].filter((p) => !ALLOWED_PATHS.has(p)).sort();
    expect({ unexpectedKeyPaths: unexpected }).toEqual({ unexpectedKeyPaths: [] });

    // No names, no location history, no identifiers beyond the documented ids.
    expect(raw).not.toContain('name');
    expect(raw).not.toContain('location');
    expect(raw).not.toContain('latitude');
    expect(raw).not.toContain('longitude');
  });
});

describe('input validation — caller bugs stay typed', () => {
  it('throws LocalStoreInputError (never a ZodError) for bad writes', async () => {
    const store = await hydratedStore();
    expect(() => store.recordSearch({ ...search(), date: 'yesterday' })).toThrow(
      LocalStoreInputError,
    );
  });
});
