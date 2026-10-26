/**
 * Zod re-validation schemas for local persistence records (DEC-006
 * `src/types/favourites.ts`; Appendix B.4: "Local persistence records
 * (`LocalStoreSnapshot`) are validated on read and reset per-field with a
 * visible notice on corruption").
 *
 * Local storage is UNTRUSTED INPUT (DEC-006): it may hold data written by an
 * older app version, truncated by the OS, or edited on a rooted device. Every
 * record read back from storage is parsed through these schemas BEFORE it
 * reaches the hooks; invalid records are dropped with a notice and the app
 * never crashes.
 *
 * Bounds (DEC-019 W3-M1 hardening batch — unbounded strings/arrays are the
 * same weakness class as the zod advisory): ids ≤ 128 chars, user labels ≤ 80
 * chars (the UI enforces the same limit), arrays bounded, integers bounded.
 * Labels deliberately have NO charset restriction — checklist §2 requires
 * apostrophes, hyphens, Cyrillic, Latin, accents and emoji to work "in every
 * field, in storage" (privacy scan in tests/storage proves nothing beyond the
 * documented fields is persisted).
 *
 * Write-side inputs are runtime-untrusted too (a screen can pass anything):
 * invalid WRITE input is a caller bug and raises `LocalStoreInputError`
 * (static message, schema paths only — never the rejected values). Corrupt
 * STORAGE never raises — reads drop/reset with a notice.
 */

import { z } from 'zod';

/** Length bounds applied to every locally stored identifier. */
export const LOCAL_STORE_ID_MAX_LENGTH = 128;
/** User-assigned label bound (favourite label); the UI uses the same limit. */
export const LOCAL_STORE_LABEL_MAX_LENGTH = 80;
/** Hard bound per collection in a persisted snapshot (policy caps are lower). */
export const LOCAL_STORE_COLLECTION_MAX_LENGTH = 500;

const LocalEntityIdSchema = z.string().min(1).max(LOCAL_STORE_ID_MAX_LENGTH);

const LocalLabelSchema = z.string().max(LOCAL_STORE_LABEL_MAX_LENGTH).optional();

const SortOrderSchema = z.number().int().min(0).max(1_000_000);

/**
 * The exact `JourneySearch` fields persisted inside a `RecentSearchRecord` —
 * mirroring `src/types/journey.ts` `JourneySearch`, bounded. Nothing beyond
 * these fields is ever written to storage.
 */
export const LocalJourneySearchSchema = z.object({
  fromStationId: LocalEntityIdSchema,
  toStationId: LocalEntityIdSchema,
  /** Travel date `YYYY-MM-DD` (Europe/Sofia). */
  date: z.iso.date(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const FavouriteStationSchema = z.object({
  id: LocalEntityIdSchema,
  stationId: LocalEntityIdSchema,
  label: LocalLabelSchema,
  createdAt: z.iso.datetime(),
  sortOrder: SortOrderSchema,
});

export const FavouriteRouteSchema = z.object({
  id: LocalEntityIdSchema,
  fromStationId: LocalEntityIdSchema,
  toStationId: LocalEntityIdSchema,
  label: LocalLabelSchema,
  createdAt: z.iso.datetime(),
  sortOrder: SortOrderSchema,
});

export const RecentSearchRecordSchema = z.object({
  id: LocalEntityIdSchema,
  search: LocalJourneySearchSchema,
  searchedAt: z.iso.datetime(),
  resultCount: z.number().int().min(0).max(10_000).optional(),
});

export const LocalStorePolicySchema = z.object({
  maxRecentSearches: z.number().int().min(1).max(1_000),
  maxFavourites: z.number().int().min(1).max(10_000),
  recentSearchTtlDays: z.number().int().min(1).max(3_650),
});

export const FavouriteStationInputSchema = z.object({
  stationId: LocalEntityIdSchema,
  label: LocalLabelSchema,
});

export const FavouriteRouteInputSchema = z.object({
  fromStationId: LocalEntityIdSchema,
  toStationId: LocalEntityIdSchema,
  label: LocalLabelSchema,
});

export const RecordSearchOptionsSchema = z.object({
  resultCount: z.number().int().min(0).max(10_000).optional(),
});

/**
 * The full persisted shape (schemaVersion 1). The store itself re-validates
 * per-field/per-record so one corrupt record never resets the whole snapshot;
 * this aggregate schema documents the exact stored shape and is asserted over
 * by the key-path allowlist test (`tests/storage/localStore-privacy.test.ts`).
 */
export const LocalStoreSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  favouriteStations: z
    .array(FavouriteStationSchema)
    .max(LOCAL_STORE_COLLECTION_MAX_LENGTH),
  favouriteRoutes: z.array(FavouriteRouteSchema).max(LOCAL_STORE_COLLECTION_MAX_LENGTH),
  recentSearches: z
    .array(RecentSearchRecordSchema)
    .max(LOCAL_STORE_COLLECTION_MAX_LENGTH),
  policy: LocalStorePolicySchema,
});
