/**
 * i18n key contract for the journey search form (Phase 3 surface).
 *
 * All user-visible strings in this feature render through `t(key)` with the
 * keys below — never literal text in components (addbeforerelease.txt 8).
 * Per DEC-016 §3 the locale files (src/i18n/locales/{bg,en}.json) are owned
 * by the i18n workstream/lead: this object is the exact key list they must
 * merge, and the proposed en+bg values live in the mobile-ui report, not
 * hard-coded here.
 *
 * REUSED keys (DEC-019: one vocabulary per surface; reserved keys must be
 * reused rather than re-invented):
 * - `validation.required`, `validation.invalid_station`,
 *   `validation.invalid_date`, `validation.date_in_past`,
 *   `validation.stations_must_differ` — every validation message;
 * - `stations.detail.find_trains` — the submit CTA (reserved for Phase 3
 *   journey surfaces, DEC-019);
 * - `common.close`, `states.*`, `provenance.*` — screen chrome and labelling.
 *
 * NEW keys are listed here and in the report for the lead to merge. Until
 * they are merged `t` renders the key itself — visible but not fabricated
 * copy, and tests/mobile-ui/i18n-integrity.test.tsx tracks them explicitly.
 */

export const JOURNEY_SEARCH_KEYS = {
  title: 'journey_search.title',
  fromLabel: 'journey_search.from_label',
  toLabel: 'journey_search.to_label',
  fromPlaceholder: 'journey_search.from_placeholder',
  toPlaceholder: 'journey_search.to_placeholder',
  swapLabel: 'journey_search.swap_label',
  dateLabel: 'journey_search.date_label',
  datePlaceholder: 'journey_search.date_placeholder',
  dateHint: 'journey_search.date_hint',
  today: 'journey_search.today',
  tomorrow: 'journey_search.tomorrow',
  submitHint: 'journey_search.submit_hint',
  /** REUSED (DEC-019 reserved for Phase 3): the submit CTA label. */
  submitCta: 'stations.detail.find_trains',
  /** NEW validation message for the 90-day horizon (validation.* namespace). */
  dateTooFar: 'validation.date_too_far',
} as const;

export type JourneySearchKey =
  (typeof JOURNEY_SEARCH_KEYS)[keyof typeof JOURNEY_SEARCH_KEYS];
