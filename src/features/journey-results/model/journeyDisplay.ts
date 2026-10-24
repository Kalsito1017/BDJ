/**
 * Pure presentation model for journey data (results cards + details
 * timeline). No React, no i18n module import: every helper takes the
 * feature's injected `Translate` (the stations feature uses the same
 * seam), so the logic is unit-testable and free of catalog coupling.
 *
 * Shared by `journey-results` and `journey-details` (one vocabulary per
 * surface — DEC-019): the journey flow is one surface, so its display
 * rules live in exactly one module.
 *
 * Conventions (DEC-006): segment times are already Europe/Sofia wall-clock
 * `HH:mm` strings; `departureDayOffset`/`arrivalDayOffset` carry
 * midnight crossings and are rendered as explicit "+N day(s)" markers;
 * missing/unknown values are labelled `common.unknown` — never invented
 * (plan.md section 3.2).
 */

import type { DayOffset, LocalTimeOfDay } from '../../../types/common';
import type { Journey, JourneyLeg, TrainSegment } from '../../../types/journey';

import { JOURNEY_KEYS } from '../translationKeys';

/** Same shape as `useTranslation().t` (src/i18n) and stations' `Translate`. */
export type Translate = (
  key: string,
  params?: Readonly<Record<string, string | number>>,
) => string;

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** First train leg (departure end of the journey), or null when absent. */
export function firstTrainLeg(journey: Journey): TrainSegment | null {
  return journey.segments[0] ?? null;
}

/** Last train leg (arrival end of the journey), or null when absent. */
export function lastTrainLeg(journey: Journey): TrainSegment | null {
  return journey.segments[journey.segments.length - 1] ?? null;
}

/** Transfers = the gaps between consecutive train legs (never negative). */
export function transfersCount(journey: Journey): number {
  return Math.max(0, journey.segments.length - 1);
}

/**
 * `HH:mm` wall-clock text, or the localized "unknown" for null/absent/
 * malformed values. Times are shown verbatim: they are already
 * Europe/Sofia (DEC-006), converting them again would corrupt them.
 */
export function timeText(time: LocalTimeOfDay | null | undefined, t: Translate): string {
  return typeof time === 'string' && TIME_OF_DAY_PATTERN.test(time)
    ? time
    : t(JOURNEY_KEYS.unknown);
}

/**
 * "+1 day" / "+{days} days" marker for a midnight crossing; null when the
 * offset is 0/absent (the common case — no marker, no noise). Negative or
 * fractional offsets are treated as absent rather than guessed at.
 */
export function dayOffsetText(
  days: DayOffset | null | undefined,
  t: Translate,
): string | null {
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) return null;
  const whole = Math.trunc(days);
  if (whole <= 0) return null;
  return whole === 1
    ? t(JOURNEY_KEYS.dayOffsetOne)
    : t(JOURNEY_KEYS.dayOffsetMany, { days: whole });
}

/**
 * Localized duration text from whole minutes ("2h 35m" / "2 ч 35 мин";
 * under an hour: "35 min"). Missing/invalid durations render the
 * localized "unknown" — never an estimate.
 */
export function durationText(
  durationMinutes: number | null | undefined,
  t: Translate,
): string {
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 0
  ) {
    return t(JOURNEY_KEYS.unknown);
  }
  const total = Math.trunc(durationMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours > 0
    ? t(JOURNEY_KEYS.durationValue, { hours, minutes })
    : t(JOURNEY_KEYS.durationMinutesValue, { minutes: total });
}

/** "No transfers" / "Transfers: {count}". */
export function transfersText(count: number, t: Translate): string {
  return count <= 0
    ? t(JOURNEY_KEYS.transfersDirect)
    : t(JOURNEY_KEYS.transfers, { count });
}

/** Accessible name for a "from → to" route line. */
export function routeA11yText(fromName: string, toName: string, t: Translate): string {
  return t(JOURNEY_KEYS.routeA11y, { from: fromName, to: toName });
}

/**
 * All legs of a journey in travel order; falls back to the train segments
 * when a provider result has no `legs` timeline (the `segments` projection
 * is always present — DEC-006).
 */
export function journeyLegs(journey: Journey): readonly JourneyLeg[] {
  return journey.legs ?? journey.segments;
}
