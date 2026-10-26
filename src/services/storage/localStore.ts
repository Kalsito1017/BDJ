/**
 * Favourites + recent searches local persistence (plan.md §9 Phase 5:
 * "Persist favourites and recent searches locally"; DEC-006
 * `src/types/favourites.ts`; Appendix B.4).
 *
 * SHAPE — mirrors `settingsStorage.ts`: one interface (`LocalStore`), an
 * in-memory implementation for tests (`createMemoryLocalStore`) and an
 * AsyncStorage-backed one for the app (`createAsyncStorageLocalStore`), plus
 * the app-wide default (`localStore`). The reactive surface
 * (`getSnapshot`/`subscribe`) is `useSyncExternalStore`-compatible so the
 * hooks in `src/hooks/` update every mounted list on add/remove/clear.
 *
 * POLICY (spec defaults, `DEFAULT_LOCAL_STORE_POLICY` — enforced on WRITE and
 * re-applied on READ):
 *  - 20 recent searches, 100 favourites PER collection (routes and stations),
 *    90-day TTL on recent searches (`searchedAt`), oldest dropped first;
 *  - dedupe: one recent record per from/to/date ("newest wins" — a repeated
 *    search replaces its older record); one favourite per from/to (and per
 *    station) — `addFavourite*` is IDENTITY-IDEMPOTENT and returns the
 *    existing record unchanged.
 *
 * TRUST (DEC-006): local storage is untrusted input. On read the snapshot is
 * re-validated field-by-field and record-by-record with Zod
 * (`localStoreSchemas.ts`): corrupt records are DROPPED, corrupt collections
 * are RESET, an unreadable/foreign snapshot is replaced — never a crash — and
 * every reset surfaces a `LocalStoreNotice` (Appendix B.4 "visible notice").
 * Invalid WRITE input is a caller bug and throws `LocalStoreInputError`
 * (static message + schema paths only — never the rejected values).
 *
 * POLICY FIELD: `LocalStoreSnapshot.policy` records the policy in force at
 * write time; the store ENFORCES its configured policy (constructor
 * `config.policy`, default `DEFAULT_LOCAL_STORE_POLICY`) and normalises the
 * persisted field to it.
 *
 * PRIVACY (plan.md §12, checklist §14): ONLY the documented fields of
 * `src/types/favourites.ts` are ever persisted — ids, station ids, the search
 * echo (from/to/date/time/limit), an optional user label and
 * timestamps/sortOrder/resultCount. No names, no location history, no device
 * identifiers, no analytics. Records are user-deletable (`removeRecent`,
 * `removeFavourite`, `clearRecentSearches`, `clearAll`) and live on-device
 * only (DEC-003: no account, no sync). A key-path allowlist test —
 * `tests/storage/localStore-privacy.test.ts` — enforces this.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ZodError, ZodType } from 'zod';

import { formatSchemaPath } from '../api/providerErrors';
import type { EntityId, ISODateTime } from '../../types/common';
import {
  DEFAULT_LOCAL_STORE_POLICY,
  type FavouriteRoute,
  type FavouriteStation,
  type LocalStorePolicy,
  type LocalStoreSnapshot,
  type RecentSearchRecord,
} from '../../types/favourites';
import type { JourneySearch } from '../../types/journey';
import {
  FavouriteRouteInputSchema,
  FavouriteRouteSchema,
  FavouriteStationInputSchema,
  FavouriteStationSchema,
  LocalStorePolicySchema,
  LocalJourneySearchSchema,
  RecordSearchOptionsSchema,
  RecentSearchRecordSchema,
} from './localStoreSchemas';

/** The single AsyncStorage key. The snapshot itself carries `schemaVersion`. */
export const LOCAL_STORE_KEY = 'localStore.snapshot';

/* ------------------------------------------------------------------ */
/* Notices (Appendix B.4 "visible notice on corruption")               */
/* ------------------------------------------------------------------ */

export type LocalStoreField =
  'snapshot' | 'favouriteStations' | 'favouriteRoutes' | 'recentSearches' | 'policy';

export type LocalStoreNoticeReason =
  /** Stored string was not JSON / not an object — whole snapshot replaced. */
  | 'malformed_snapshot'
  /** Underlying storage read failed — empty snapshot, nothing lost by us. */
  | 'read_failed'
  /** `schemaVersion` is not the supported one — whole snapshot replaced. */
  | 'unsupported_schema_version'
  /** A collection field was not an array — that field reset, others kept. */
  | 'invalid_collection'
  /** A single record failed re-validation — dropped, the rest kept. */
  | 'invalid_record'
  /** The persisted policy failed re-validation — replaced with defaults. */
  | 'invalid_policy'
  /** Persisting a change failed; the in-memory state still applied. */
  | 'write_failed';

export interface LocalStoreNotice {
  readonly reason: LocalStoreNoticeReason;
  readonly field: LocalStoreField;
  readonly at: ISODateTime;
}

export interface LocalStoreState {
  /** False until the first load attempt settled; hooks expose it as `isLoading`. */
  readonly hydrated: boolean;
  readonly snapshot: LocalStoreSnapshot;
  readonly notices: readonly LocalStoreNotice[];
}

/* ------------------------------------------------------------------ */
/* Store surface                                                       */
/* ------------------------------------------------------------------ */

export class LocalStoreInputError extends Error {
  /** Schema paths + issue codes only — NEVER the rejected values. */
  readonly diagnostics: readonly string[];

  constructor(diagnostics: readonly string[]) {
    // Static message on purpose: error text must not carry payload values.
    super('Local store write rejected: invalid input.');
    this.name = 'LocalStoreInputError';
    this.diagnostics = diagnostics;
  }
}

export interface RecordSearchOptions {
  /** Number of results shown at the time (recent-list subtitle); optional. */
  resultCount?: number;
}

export interface LocalStore {
  /** Current state. Stable reference between changes (`useSyncExternalStore`). */
  getSnapshot(): LocalStoreState;
  /** Subscribe to state changes; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;

  /**
   * Load + re-validate the persisted snapshot. Idempotent, never rejects.
   * Auto-started on construction; hooks render `isLoading` until it settles.
   * Writes made before hydration completes WIN over the pending load.
   */
  hydrate(): Promise<void>;

  /**
   * Await every queued fire-and-forget write. Tests simulate app restarts
   * with `flush()` before handing the persistence to a new store instance.
   */
  flush(): Promise<void>;

  /** Identity-idempotent: the same from/to returns the existing route. */
  addFavouriteRoute(input: {
    fromStationId: string;
    toStationId: string;
    label?: string;
  }): FavouriteRoute;
  /** Identity-idempotent: the same stationId returns the existing record. */
  addFavouriteStation(input: { stationId: string; label?: string }): FavouriteStation;
  /** Removes the record with this id from BOTH favourite collections. */
  removeFavourite(id: EntityId): void;

  /**
   * Records a search (newest first). Dedupe: same from/to/date replaces the
   * older record ("newest wins"). TTL (90 d) and the 20-record cap are
   * enforced here. Throws `LocalStoreInputError` on invalid input.
   */
  recordSearch(input: JourneySearch, options?: RecordSearchOptions): RecentSearchRecord;
  removeRecent(id: EntityId): void;
  /** Clears ALL recent searches. Never touches favourites. */
  clearRecentSearches(): void;
  /** The destructive "clear saved items" action: favourites + recents. */
  clearAll(): void;
}

/** Raw string persistence underneath the store (settingsStorage-style seam). */
export interface LocalStorePersistence {
  /** The raw stored string, or null when nothing is stored. May reject. */
  read(): Promise<string | null>;
  /** Persists the serialized snapshot. May reject (surfaced as `write_failed`). */
  write(serialized: string): Promise<void>;
}

export interface LocalStoreConfig {
  persistence: LocalStorePersistence;
  /** Policy enforced by this store; default `DEFAULT_LOCAL_STORE_POLICY`. */
  policy?: LocalStorePolicy;
  /** Injected clock (tests): timestamps and TTL come from here. */
  clock?: () => Date;
  /** Injected id factory (tests). Default: timestamp + counter. */
  idFactory?: () => string;
  /** Bounded notice history kept in state (default 20). */
  maxNotices?: number;
}

export interface MemoryLocalStoreConfig extends Omit<LocalStoreConfig, 'persistence'> {
  /**
   * Optional shared persistence seam: tests simulate app restarts by handing
   * two stores the SAME persistence (tests/storage/localStore.test.ts).
   * When omitted, a private in-memory persistence is created (seeded by
   * `initialRaw`).
   */
  persistence?: LocalStorePersistence;
  /**
   * Seeds the backing memory storage. `string` values are stored verbatim
   * (malformed-JSON tests); other values are `JSON.stringify`ed.
   */
  initialRaw?: unknown;
}

/* ------------------------------------------------------------------ */
/* Normalisation (single pipeline for read AND write)                  */
/* ------------------------------------------------------------------ */

function emptySnapshot(policy: LocalStorePolicy): LocalStoreSnapshot {
  return {
    schemaVersion: 1,
    favouriteStations: [],
    favouriteRoutes: [],
    recentSearches: [],
    policy: { ...policy },
  };
}

/** Dedupe key: same from/to/date recent = one record (spec). */
function recentSearchKey(record: {
  search: { fromStationId: string; toStationId: string; date: string };
}): string {
  return `${record.search.fromStationId}|${record.search.toStationId}|${record.search.date}`;
}

function favouriteRouteKey(record: {
  fromStationId: string;
  toStationId: string;
}): string {
  return `${record.fromStationId}|${record.toStationId}`;
}

function favouriteStationKey(record: { stationId: string }): string {
  return record.stationId;
}

/**
 * TTL + caps + dedupe. Applied after every write and after every read, so
 * oversized snapshots written by an older/foreign version are trimmed too.
 * TTL/cap trimming is normal retention behaviour — no notices for it.
 */
function enforceSnapshotPolicy(
  snapshot: LocalStoreSnapshot,
  now: Date,
  policy: LocalStorePolicy,
): LocalStoreSnapshot {
  const cutoffMs = now.getTime() - policy.recentSearchTtlDays * 24 * 60 * 60 * 1000;

  const recentsByKey = new Map<string, RecentSearchRecord>();
  for (const record of snapshot.recentSearches) {
    if (Date.parse(record.searchedAt) < cutoffMs) continue; // TTL expiry
    const key = recentSearchKey(record);
    const existing = recentsByKey.get(key);
    // Dedupe "newest wins": the latest searchedAt replaces older duplicates.
    if (
      existing === undefined ||
      Date.parse(record.searchedAt) > Date.parse(existing.searchedAt)
    ) {
      recentsByKey.set(key, record);
    }
  }
  const recentSearches = [...recentsByKey.values()]
    .sort((a, b) => Date.parse(b.searchedAt) - Date.parse(a.searchedAt))
    .slice(0, policy.maxRecentSearches);

  const routesByKey = new Map<string, FavouriteRoute>();
  for (const record of snapshot.favouriteRoutes) {
    const key = favouriteRouteKey(record);
    if (!routesByKey.has(key)) routesByKey.set(key, record); // first (oldest) wins
  }
  const favouriteRoutes = [...routesByKey.values()]
    .sort(
      (a, b) =>
        b.sortOrder - a.sortOrder || Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, policy.maxFavourites);

  const stationsByKey = new Map<string, FavouriteStation>();
  for (const record of snapshot.favouriteStations) {
    const key = favouriteStationKey(record);
    if (!stationsByKey.has(key)) stationsByKey.set(key, record);
  }
  const favouriteStations = [...stationsByKey.values()]
    .sort(
      (a, b) =>
        b.sortOrder - a.sortOrder || Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, policy.maxFavourites);

  return {
    schemaVersion: 1,
    favouriteStations,
    favouriteRoutes,
    recentSearches,
    policy: { ...policy },
  };
}

function parseRecords<T>(
  field: LocalStoreField,
  value: unknown,
  schema: ZodType<T>,
  at: ISODateTime,
  notices: LocalStoreNotice[],
): T[] {
  if (!Array.isArray(value)) {
    notices.push({ reason: 'invalid_collection', field, at });
    return [];
  }
  const records: T[] = [];
  for (const item of value) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      records.push(parsed.data);
    } else {
      // Per-record reset: one corrupt record never resets the collection.
      notices.push({ reason: 'invalid_record', field, at });
    }
  }
  return records;
}

/**
 * Re-validate a raw snapshot read back from storage. Never throws: corrupt
 * fields are reset individually and described by notices (Appendix B.4).
 */
export function normalizeStoredSnapshot(
  raw: unknown,
  now: Date,
  policy: LocalStorePolicy,
): { snapshot: LocalStoreSnapshot; notices: LocalStoreNotice[] } {
  const at = now.toISOString();
  const notices: LocalStoreNotice[] = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    notices.push({ reason: 'malformed_snapshot', field: 'snapshot', at });
    return { snapshot: emptySnapshot(policy), notices };
  }
  const record = raw as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    // Forward/backward compatibility: migrations bump schemaVersion; unknown
    // versions are replaced, never guessed at (Appendix B.4).
    notices.push({ reason: 'unsupported_schema_version', field: 'snapshot', at });
    return { snapshot: emptySnapshot(policy), notices };
  }

  const favouriteStations = parseRecords(
    'favouriteStations',
    record.favouriteStations,
    FavouriteStationSchema,
    at,
    notices,
  );
  const favouriteRoutes = parseRecords(
    'favouriteRoutes',
    record.favouriteRoutes,
    FavouriteRouteSchema,
    at,
    notices,
  );
  const recentSearches = parseRecords(
    'recentSearches',
    record.recentSearches,
    RecentSearchRecordSchema,
    at,
    notices,
  );

  // The STORE's configured policy is authoritative (see module comment); the
  // persisted one is only checked for corruption so users get a notice.
  const parsedPolicy = LocalStorePolicySchema.safeParse(record.policy);
  if (!parsedPolicy.success) {
    notices.push({ reason: 'invalid_policy', field: 'policy', at });
  }

  const snapshot = enforceSnapshotPolicy(
    {
      schemaVersion: 1,
      favouriteStations,
      favouriteRoutes,
      recentSearches,
      policy: { ...policy },
    },
    now,
    policy,
  );
  return { snapshot, notices };
}

/* ------------------------------------------------------------------ */
/* Implementation                                                      */
/* ------------------------------------------------------------------ */

function defaultIdFactory(): () => string {
  let counter = 0;
  return () => `local-${Date.now().toString(36)}-${(counter += 1).toString(36)}`;
}

function diagnosticsOf(error: ZodError): readonly string[] {
  return error.issues.map((issue) => `${formatSchemaPath(issue.path)}: ${issue.code}`);
}

function inputError(error: ZodError): LocalStoreInputError {
  return new LocalStoreInputError(diagnosticsOf(error));
}

/** Trim strings before validation; non-strings go to the schema to be rejected. */
function trimmed(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function createLocalStore(config: LocalStoreConfig): LocalStore {
  const policy = config.policy ?? DEFAULT_LOCAL_STORE_POLICY;
  const clock = config.clock ?? (() => new Date());
  const idFactory = config.idFactory ?? defaultIdFactory();
  const maxNotices = config.maxNotices ?? 20;

  let state: LocalStoreState = {
    hydrated: false,
    snapshot: emptySnapshot(policy),
    notices: [],
  };
  const listeners = new Set<() => void>();
  let mutatedSinceConstruction = false;
  let hydratePromise: Promise<void> | null = null;
  let writeQueue: Promise<void> = Promise.resolve();

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const replaceState = (next: LocalStoreState): void => {
    state = next;
    notify();
  };

  const withNotices = (extra: readonly LocalStoreNotice[]): void => {
    if (extra.length === 0) return;
    replaceState({
      ...state,
      notices: [...state.notices, ...extra].slice(-maxNotices),
    });
  };

  const persist = (snapshot: LocalStoreSnapshot): void => {
    let serialized: string;
    try {
      serialized = JSON.stringify(snapshot);
    } catch {
      withNotices([
        { reason: 'write_failed', field: 'snapshot', at: clock().toISOString() },
      ]);
      return;
    }
    // Serialise writes so an older snapshot can never land after a newer one.
    writeQueue = writeQueue
      .then(() => config.persistence.write(serialized))
      .catch(() => {
        withNotices([
          { reason: 'write_failed', field: 'snapshot', at: clock().toISOString() },
        ]);
      });
  };

  /** Apply a change: enforce policy, persist (fire-and-forget), notify. */
  const commit = (
    updater: (snapshot: LocalStoreSnapshot) => LocalStoreSnapshot,
  ): void => {
    mutatedSinceConstruction = true;
    const snapshot = enforceSnapshotPolicy(updater(state.snapshot), clock(), policy);
    replaceState({ ...state, snapshot });
    persist(snapshot);
  };

  const markHydrated = (): void => {
    replaceState({ ...state, hydrated: true });
  };

  const doHydrate = async (): Promise<void> => {
    let raw: string | null = null;
    try {
      raw = await config.persistence.read();
    } catch {
      withNotices([
        { reason: 'read_failed', field: 'snapshot', at: clock().toISOString() },
      ]);
      markHydrated();
      return;
    }
    // A write that lands before hydration settles wins for its OWN record,
    // but the rest of the persisted history must survive (plan.md: "saved
    // items survive app restarts") — merge instead of discarding the load.
    if (mutatedSinceConstruction) {
      if (raw === null) {
        markHydrated();
        return;
      }
      let loadedParsed: unknown;
      try {
        loadedParsed = JSON.parse(raw);
      } catch {
        withNotices([
          { reason: 'malformed_snapshot', field: 'snapshot', at: clock().toISOString() },
        ]);
        markHydrated();
        return;
      }
      const { snapshot: loaded, notices } = normalizeStoredSnapshot(
        loadedParsed,
        clock(),
        policy,
      );
      // Rebase records written during the load: they were numbered against an
      // empty in-memory snapshot (sortOrder 0,1,...) and would otherwise rank
      // as the OLDEST and be evicted at the cap (silent loss — reviewer pin).
      // They are the newest actions, so they rank above everything loaded.
      const rebase = <T extends { sortOrder: number }>(
        current: readonly T[],
        loadedList: readonly T[],
      ): T[] => {
        const base = loadedList.reduce(
          (max, record) => Math.max(max, record.sortOrder),
          -1,
        );
        return current.map((record, index) => ({
          ...record,
          sortOrder: base + 1 + index,
        }));
      };
      const merged = enforceSnapshotPolicy(
        {
          ...loaded,
          favouriteRoutes: [
            ...rebase(state.snapshot.favouriteRoutes, loaded.favouriteRoutes),
            ...loaded.favouriteRoutes,
          ],
          favouriteStations: [
            ...rebase(state.snapshot.favouriteStations, loaded.favouriteStations),
            ...loaded.favouriteStations,
          ],
          recentSearches: [...state.snapshot.recentSearches, ...loaded.recentSearches],
        },
        clock(),
        policy,
      );
      replaceState({
        hydrated: true,
        snapshot: merged,
        notices: [...state.notices, ...notices].slice(-maxNotices),
      });
      persist(merged); // heal disk state truncated by the racing write
      return;
    }
    if (raw === null) {
      markHydrated(); // fresh install: nothing stored, no notice
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      withNotices([
        { reason: 'malformed_snapshot', field: 'snapshot', at: clock().toISOString() },
      ]);
      markHydrated();
      return;
    }
    const { snapshot, notices } = normalizeStoredSnapshot(parsed, clock(), policy);
    replaceState({
      hydrated: true,
      snapshot,
      notices: [...state.notices, ...notices].slice(-maxNotices),
    });
  };

  const nextSortOrder = (records: readonly { sortOrder: number }[]): number => {
    let max = -1;
    for (const record of records) max = Math.max(max, record.sortOrder);
    return max + 1;
  };

  const addFavouriteRoute: LocalStore['addFavouriteRoute'] = (input) => {
    const parsed = FavouriteRouteInputSchema.safeParse({
      fromStationId: trimmed(input.fromStationId),
      toStationId: trimmed(input.toStationId),
      ...(input.label !== undefined ? { label: input.label } : {}),
    });
    if (!parsed.success) throw inputError(parsed.error);
    const data = parsed.data;

    const existing = state.snapshot.favouriteRoutes.find(
      (record) =>
        favouriteRouteKey(record) ===
        favouriteRouteKey({
          fromStationId: data.fromStationId,
          toStationId: data.toStationId,
        }),
    );
    if (existing !== undefined) return existing; // idempotent

    const record: FavouriteRoute = {
      id: idFactory(),
      fromStationId: data.fromStationId,
      toStationId: data.toStationId,
      ...(data.label !== undefined ? { label: data.label } : {}),
      createdAt: clock().toISOString(),
      sortOrder: nextSortOrder(state.snapshot.favouriteRoutes),
    };
    commit((snapshot) => ({
      ...snapshot,
      favouriteRoutes: [record, ...snapshot.favouriteRoutes],
    }));
    return record;
  };

  const addFavouriteStation: LocalStore['addFavouriteStation'] = (input) => {
    const parsed = FavouriteStationInputSchema.safeParse({
      stationId: trimmed(input.stationId),
      ...(input.label !== undefined ? { label: input.label } : {}),
    });
    if (!parsed.success) throw inputError(parsed.error);
    const data = parsed.data;

    const existing = state.snapshot.favouriteStations.find(
      (record) => favouriteStationKey(record) === data.stationId,
    );
    if (existing !== undefined) return existing; // idempotent

    const record: FavouriteStation = {
      id: idFactory(),
      stationId: data.stationId,
      ...(data.label !== undefined ? { label: data.label } : {}),
      createdAt: clock().toISOString(),
      sortOrder: nextSortOrder(state.snapshot.favouriteStations),
    };
    commit((snapshot) => ({
      ...snapshot,
      favouriteStations: [record, ...snapshot.favouriteStations],
    }));
    return record;
  };

  const removeFavourite: LocalStore['removeFavourite'] = (id) => {
    const { favouriteRoutes, favouriteStations } = state.snapshot;
    if (
      !favouriteRoutes.some((record) => record.id === id) &&
      !favouriteStations.some((record) => record.id === id)
    ) {
      return;
    }
    commit((snapshot) => ({
      ...snapshot,
      favouriteRoutes: snapshot.favouriteRoutes.filter((record) => record.id !== id),
      favouriteStations: snapshot.favouriteStations.filter((record) => record.id !== id),
    }));
  };

  const recordSearch: LocalStore['recordSearch'] = (input, options = {}) => {
    const parsedSearch = LocalJourneySearchSchema.safeParse({
      fromStationId: trimmed(input.fromStationId),
      toStationId: trimmed(input.toStationId),
      date: trimmed(input.date),
      ...(input.time !== undefined ? { time: trimmed(input.time) } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });
    if (!parsedSearch.success) throw inputError(parsedSearch.error);

    const parsedOptions = RecordSearchOptionsSchema.safeParse(options);
    if (!parsedOptions.success) throw inputError(parsedOptions.error);

    const record: RecentSearchRecord = {
      id: idFactory(),
      search: parsedSearch.data,
      searchedAt: clock().toISOString(),
      ...(parsedOptions.data.resultCount !== undefined
        ? { resultCount: parsedOptions.data.resultCount }
        : {}),
    };
    commit((snapshot) => ({
      ...snapshot,
      recentSearches: [
        record,
        ...snapshot.recentSearches.filter(
          (existing) => recentSearchKey(existing) !== recentSearchKey(record),
        ),
      ],
    }));
    return record;
  };

  const removeRecent: LocalStore['removeRecent'] = (id) => {
    if (!state.snapshot.recentSearches.some((record) => record.id === id)) return;
    commit((snapshot) => ({
      ...snapshot,
      recentSearches: snapshot.recentSearches.filter((record) => record.id !== id),
    }));
  };

  const clearRecentSearches: LocalStore['clearRecentSearches'] = () => {
    if (state.snapshot.recentSearches.length === 0) return;
    commit((snapshot) => ({ ...snapshot, recentSearches: [] }));
  };

  const clearAll: LocalStore['clearAll'] = () => {
    commit((snapshot) => ({
      ...snapshot,
      favouriteStations: [],
      favouriteRoutes: [],
      recentSearches: [],
    }));
  };

  const store: LocalStore = {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate: () => {
      hydratePromise ??= doHydrate();
      return hydratePromise;
    },
    flush: () => writeQueue,
    addFavouriteRoute,
    addFavouriteStation,
    removeFavourite,
    recordSearch,
    removeRecent,
    clearRecentSearches,
    clearAll,
  };

  // Auto-hydrate: the app must not need a bootstrap call. `hydrate()` is
  // idempotent so callers (and tests) can still await it deterministically.
  void store.hydrate();
  return store;
}

/* ------------------------------------------------------------------ */
/* Implementations + default                                           */
/* ------------------------------------------------------------------ */

/** In-memory persistence for tests (and previews). */
export interface MemoryLocalStorePersistence extends LocalStorePersistence {
  /** The raw persisted string as it would hit disk (privacy assertions). */
  dump(): string | null;
}

export function createMemoryLocalStorePersistence(
  initial: string | null = null,
): MemoryLocalStorePersistence {
  let raw = initial;
  return {
    async read() {
      return raw;
    },
    async write(serialized) {
      raw = serialized;
    },
    dump() {
      return raw;
    },
  };
}

/** AsyncStorage-backed persistence used by the running app. */
export function createAsyncStorageLocalStorePersistence(
  key: string = LOCAL_STORE_KEY,
): LocalStorePersistence {
  return {
    read: () => AsyncStorage.getItem(key),
    write: (serialized) => AsyncStorage.setItem(key, serialized),
  };
}

/** In-memory implementation for tests and previews. */
export function createMemoryLocalStore(config: MemoryLocalStoreConfig = {}): LocalStore {
  const { initialRaw, persistence, ...rest } = config;
  const initial =
    initialRaw === undefined
      ? null
      : typeof initialRaw === 'string'
        ? initialRaw
        : JSON.stringify(initialRaw);
  return createLocalStore({
    ...rest,
    persistence: persistence ?? createMemoryLocalStorePersistence(initial),
  });
}

/** AsyncStorage-backed implementation used by the running app. */
export function createAsyncStorageLocalStore(
  config: Omit<LocalStoreConfig, 'persistence'> = {},
): LocalStore {
  return createLocalStore({
    ...config,
    persistence: createAsyncStorageLocalStorePersistence(),
  });
}

/**
 * App-wide default local store (AsyncStorage). Tests inject their own via
 * `LocalStoreProvider` (`src/hooks/`), so nothing depends on this singleton
 * being clean between cases.
 */
export const localStore: LocalStore = createAsyncStorageLocalStore();
