/**
 * Journey search form validation — Zod schema + pure date helpers.
 *
 * The schema is the single validation source for the form (react-hook-form
 * + zodResolver). Every issue message is an i18n KEY (`validation.*`), never
 * literal copy (addbeforerelease.txt §8): the form renders `t(issue.message)`
 * and the keys already exist in the catalogs except `validation.date_too_far`
 * (proposed in the mobile-ui report, DEC-016 §3).
 *
 * Date rules (travel date is Europe/Sofia — DEC-006):
 * - required,
 * - strict `YYYY-MM-DD` and a real calendar date (2026-02-30 is invalid),
 * - not before "today" in Europe/Sofia,
 * - not more than 90 days ahead (MAX_DAYS_AHEAD).
 *
 * "Today" is injected (`createJourneySearchFormSchema(todayIso)`) so tests
 * are deterministic and the screen computes it with the Europe/Sofia
 * wall clock (src/i18n/formatting).
 */

import { z } from 'zod';

import { sofiaWallClock } from '../../i18n/formatting';
import type { ISODate } from '../../types/common';
import type { JourneySearch } from '../../types/journey';
import type { Station } from '../../types/station';

/** The travel-date horizon the form accepts (checklist §7 validation). */
export const MAX_DAYS_AHEAD = 90;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Route-boundary validation for deep links (review L1): applies the SAME rules
 * as `createJourneySearchFormSchema` — both stations present and distinct,
 * strict `YYYY-MM-DD` real date, not before today (Europe/Sofia), at most
 * `MAX_DAYS_AHEAD` ahead. Returns the typed input, or `null` when the params
 * are not acceptable. `getToday` is injectable for deterministic tests.
 */
export function journeySearchFromRouteParams(
  params: { from?: string | null; to?: string | null; date?: string | null },
  getToday: () => ISODate = systemTodayIso,
): JourneySearch | null {
  const fromStationId = (params.from ?? '').trim();
  const toStationId = (params.to ?? '').trim();
  const date = (params.date ?? '').trim();
  if (fromStationId === '' || toStationId === '' || fromStationId === toStationId) {
    return null;
  }
  if (!isValidIsoDate(date)) return null;
  const today = getToday();
  if (date < today || date > addDaysIso(today, MAX_DAYS_AHEAD)) return null;
  return { fromStationId, toStationId, date: date as ISODate };
}

/**
 * "Today" as an ISO date in Europe/Sofia (the travel-date reference,
 * DEC-006). Wall-clock math via the pure Sofia clock in
 * `src/i18n/formatting` — no `Intl` dependency.
 */
export function todayIsoInSofia(nowMillis: number): ISODate {
  const clock = sofiaWallClock(nowMillis);
  return `${String(clock.year).padStart(4, '0')}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`;
}

/**
 * The current Europe/Sofia date. Called at VALIDATION and EVENT time (never
 * during render — react-hooks/purity): "today" must be re-read whenever it
 * is actually used, so a long-lived form never validates against a stale day.
 * Tests inject their own `getToday` for determinism.
 */
export function systemTodayIso(): ISODate {
  return todayIsoInSofia(Date.now());
}

/** Form values as managed by react-hook-form. */
export interface JourneySearchFormValues {
  fromStation: Station | null;
  toStation: Station | null;
  /** Raw text: `YYYY-MM-DD`, validated below. */
  date: string;
}

/** Strict `YYYY-MM-DD` check including real calendar days. */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Whole-day date arithmetic on ISO dates (UTC calendar math, no DST). */
export function addDaysIso(iso: string, days: number): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isStationLike(value: unknown): value is Station {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    (value as { id: string }).id.length > 0 &&
    typeof (value as { name?: unknown }).name === 'string' &&
    (value as { name: string }).name.length > 0
  );
}

function stationFieldSchema() {
  return z
    .custom<Station | null>(
      (value) => value === null || value === undefined || isStationLike(value),
      { message: 'validation.invalid_station' },
    )
    .superRefine((value, ctx) => {
      // A missing selection is the common case: "required", not "invalid".
      if (value === null || value === undefined) {
        ctx.addIssue({ code: 'custom', message: 'validation.required' });
      }
    });
}

/**
 * Zod schema for the form. Cross-field rules (`from !== to`) are
 * object-level refinements so the error lands on the right field.
 *
 * `getToday` is resolved LAZILY at validation time (never at render time),
 * so a form that stays open across midnight still validates against the
 * real Europe/Sofia day.
 */
export function createJourneySearchFormSchema(getToday: () => ISODate) {
  const stationField = stationFieldSchema();

  const dateField = z.string().superRefine((value, ctx) => {
    const todayIso = getToday();
    const lastAllowedDate = addDaysIso(todayIso, MAX_DAYS_AHEAD);
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'validation.required' });
      return;
    }
    if (!isValidIsoDate(trimmed)) {
      ctx.addIssue({ code: 'custom', message: 'validation.invalid_date' });
      return;
    }
    if (trimmed < todayIso) {
      ctx.addIssue({ code: 'custom', message: 'validation.date_in_past' });
      return;
    }
    if (trimmed > lastAllowedDate) {
      ctx.addIssue({ code: 'custom', message: 'validation.date_too_far' });
    }
  });

  return z
    .object({
      fromStation: stationField,
      toStation: stationField,
      date: dateField,
    })
    .superRefine((values, ctx) => {
      if (isStationLike(values.fromStation) && isStationLike(values.toStation)) {
        if (values.fromStation.id === values.toStation.id) {
          ctx.addIssue({
            code: 'custom',
            path: ['toStation'],
            message: 'validation.stations_must_differ',
          });
        }
      }
    });
}
