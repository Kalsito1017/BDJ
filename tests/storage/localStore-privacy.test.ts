/**
 * Key-path allowlist (privacy — DEC-006 data minimisation; promised by the
 * localStore/localStoreSchemas module comments and closed under P5-M2):
 * the persisted snapshot may contain ONLY the documented fields. No names,
 * no location history, no device identifiers, no analytics — and no field
 * smuggled in via labels or search input.
 */
import {
  createMemoryLocalStore,
  createMemoryLocalStorePersistence,
} from '../../src/services/storage/localStore';

/** Every key path the store is allowed to write to disk (`[]` = array item). */
const ALLOWED_KEY_PATHS: ReadonlySet<string> = new Set([
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
  'recentSearches[].searchedAt',
  'recentSearches[].resultCount',
  'recentSearches[].search.fromStationId',
  'recentSearches[].search.toStationId',
  'recentSearches[].search.date',
  'recentSearches[].search.time',
]);

function collectKeyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectKeyPaths(item, `${prefix}[]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      collectKeyPaths(child, prefix === '' ? key : `${prefix}.${key}`),
    );
  }
  return [prefix];
}

describe('localStore — persisted key-path allowlist (privacy)', () => {
  it('writes only the documented key paths — nothing else', async () => {
    const persistence = createMemoryLocalStorePersistence();
    const store = createMemoryLocalStore({ persistence });
    await store.hydrate();

    store.addFavouriteStation({
      stationId: 'demo-station-sofia-central',
      label: 'Вкъщи',
    });
    store.addFavouriteRoute({
      fromStationId: 'demo-station-sofia-central',
      toStationId: 'demo-station-varna',
      label: 'Почивка',
    });
    store.recordSearch(
      {
        fromStationId: 'demo-station-sofia-central',
        toStationId: 'demo-station-varna',
        date: '2026-11-01',
      },
      { resultCount: 3 },
    );
    await store.flush();

    const raw = persistence.dump();
    expect(raw).not.toBeNull();
    const paths = collectKeyPaths(JSON.parse(raw as string));

    const unexpected = paths.filter((path) => !ALLOWED_KEY_PATHS.has(path));
    expect(unexpected.sort()).toEqual([]);

    // Sanity: the populated shape really was observed (the allowlist is not
    // vacuously satisfied by an empty snapshot).
    expect(paths).toContain('favouriteRoutes[].label');
    expect(paths).toContain('recentSearches[].search.date');
  });
});
