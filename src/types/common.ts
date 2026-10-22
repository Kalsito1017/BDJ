/**
 * Shared primitive domain types.
 *
 * Spec-only file (Phase 0). No runtime logic, no dependency imports.
 * See docs/decisions.md DEC-006 (domain model, time and money conventions).
 *
 * Conventions (DEC-006):
 * - Timestamps are stored/transported as ISO 8601 in UTC.
 * - Clock times shown to users are local wall-clock time in Europe/Sofia
 *   (the operating timezone of BDZ services). Day offsets handle journeys
 *   that cross midnight (addbeforerelease.txt section 2).
 * - Money is always integer minor units (stotinki/cents), never floats
 *   (addbeforerelease.txt section 2).
 */

/** Calendar date, ISO format `YYYY-MM-DD`. Travel date is interpreted in Europe/Sofia. */
export type ISODate = string;

/** Timestamp, ISO 8601 in UTC, e.g. `2026-10-22T09:30:00Z`. */
export type ISODateTime = string;

/** Wall-clock time of day, `HH:mm`, Europe/Sofia local time. */
export type LocalTimeOfDay = string;

/**
 * Whole days added to the journey's travel date to get the actual
 * calendar date of a segment endpoint. `0` (default) = same day as the
 * travel date; `1` = next day (midnight-crossing journeys).
 */
export type DayOffset = number;

/** Supported UI locales (plan.md section 17.6). */
export type LocaleCode = 'bg' | 'en';

/**
 * Currencies the app may display.
 * Closed union on purpose: extend only after finance/legal verification
 * of currency, rounding and VAT rules (addbeforerelease.txt section 4).
 * BGN is the expected default; EUR status for BDZ sales is UNVERIFIED.
 */
export type CurrencyCode = 'BGN' | 'EUR';

/** Amount in integer minor units (stotinki for BGN, cents for EUR). Never a float. */
export interface Money {
  /** Integer minor units. MUST be an integer; see DEC-006. */
  amountMinor: number;
  currency: CurrencyCode;
}

/** WGS84 geographic point. Optional everywhere: station coordinates are shown only
 *  when the licensed dataset provides them (plan.md section 17.5). */
export interface GeoPoint {
  /** Decimal degrees, -90..90. */
  latitude: number;
  /** Decimal degrees, -180..180. */
  longitude: number;
}

/** Opaque identifier assigned by the owning provider/system. Never parse or invent meaning from it. */
export type EntityId = string;

/**
 * Client-generated idempotency key (UUID v4 recommended) attached to
 * every state-changing ticketing operation (DEC-008).
 */
export type IdempotencyKey = string;
