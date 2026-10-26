/**
 * Zod schemas for the primitive domain types (mirrors src/types/common.ts —
 * Appendix B, DEC-007/DEC-009: zod@4.6.x, MIT).
 *
 * Conventions enforced here (DEC-006):
 * - timestamps are ISO 8601 UTC (`...Z`);
 * - travel dates are `YYYY-MM-DD` (calendar-validated);
 * - user-facing wall-clock times are `HH:mm` Europe/Sofia local time;
 * - day offsets are non-negative integers (midnight crossings);
 * - coordinates are WGS84 decimal degrees in range.
 *
 * Unknown extra fields on objects are stripped (Zod default) — tolerated for
 * forward compatibility, never passed through to the UI (Appendix B.3).
 */

import { z } from 'zod';

/** Calendar date `YYYY-MM-DD` (validated by Zod's ISO date rules). */
export const IsoDateSchema = z.iso.date();

/** Timestamp, ISO 8601 in UTC (offset forms rejected — DEC-006). */
export const IsoDateTimeSchema = z.iso.datetime();

/** Wall-clock time `HH:mm`, Europe/Sofia local time. */
export const LocalTimeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

/** Whole days after the travel date (0 = same day, 1 = next day, ...). */
export const DayOffsetSchema = z.number().int().min(0);

/**
 * Opaque provider identifier. Bounded (DEC-019 W3-M1): unbounded strings are
 * the same weakness class as the zod advisory — ids are short opaque tokens
 * (the mock's are ASCII slugs); 128 chars is far beyond any real id.
 */
export const EntityIdSchema = z.string().min(1).max(128);

/** Display-name bound (station/segment names); fixtures max out below 80 chars. */
export const MAX_NAME_LENGTH = 200;

/** WGS84 decimal degrees. */
export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Integer minor units of money (BGN stotinki / EUR cents) — never floats. */
export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.enum(['BGN', 'EUR']),
});
