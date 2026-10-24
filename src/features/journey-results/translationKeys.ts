/**
 * i18n key contract for the journey results screen AND the shared journey
 * vocabulary (`journey.*`) used by the journey details timeline.
 *
 * Per DEC-016 §3 the locale files are single-owner: this object is the
 * exact key list the lead merges; proposed en+bg values are in the mobile-ui
 * report, never hard-coded here. `journey.*` lives here (not in both
 * features) so the results card and the details timeline can never drift
 * into two vocabularies (DEC-019: one vocabulary per surface — the journey
 * flow is one surface).
 */

/** Shared journey vocabulary (results cards + details timeline). */
export const JOURNEY_KEYS = {
  departureLabel: 'journey.departure_label',
  arrivalLabel: 'journey.arrival_label',
  durationLabel: 'journey.duration_label',
  /** "Transfers: {count}" — count >= 1. */
  transfers: 'journey.transfers',
  /** "No transfers" — count 0. */
  transfersDirect: 'journey.transfers_direct',
  /** "+1 day" — midnight-crossing marker, exactly one day. */
  dayOffsetOne: 'journey.day_offset_one',
  /** "+{days} days" — midnight-crossing marker, 2+ days. */
  dayOffsetMany: 'journey.day_offset_many',
  /** "{hours}h {minutes}m" (bg: "{hours} ч {minutes} мин"). */
  durationValue: 'journey.duration_value',
  /** "{minutes} min" — durations under an hour (bg: "{minutes} мин"). */
  durationMinutesValue: 'journey.duration_minutes_value',
  /** "From {from} to {to}" — accessible name of a route line. */
  routeA11y: 'journey.route_a11y',
  /** "Journey option {index}" — accessible name of a result card. */
  cardA11y: 'journey.card_a11y',
  /** Reused common key for null/missing values (proposed: common.unknown). */
  unknown: 'common.unknown',
} as const;

export const JOURNEY_RESULTS_KEYS = {
  title: 'journey_results.title',
  emptyTitle: 'journey_results.empty_title',
  emptyBody: 'journey_results.empty_body',
  changeSearch: 'journey_results.change_search',
  /** "Results loaded at {time}" — query cache freshness, NOT provenance. */
  fetchedAt: 'journey_results.fetched_at',
  detailsCta: 'journey_results.details_cta',
} as const;

export type JourneyKey = (typeof JOURNEY_KEYS)[keyof typeof JOURNEY_KEYS];
export type JourneyResultsKey =
  (typeof JOURNEY_RESULTS_KEYS)[keyof typeof JOURNEY_RESULTS_KEYS];
