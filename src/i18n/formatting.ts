/**
 * Locale-aware formatting for dates, times, numbers and money.
 *
 * Timezone: user-facing wall-clock values are Europe/Sofia (DEC-006).
 * This module deliberately does NOT depend on `Intl.DateTimeFormat` time
 * zone support: Hermes' Intl coverage differs per platform/build and could
 * not be verified on-device from this environment. Europe/Sofia is
 * implemented directly (EET = UTC+2, EEST = UTC+3, EU DST rule: 01:00 UTC on
 * the last Sunday of March -> 01:00 UTC on the last Sunday of October) and is
 * cross-checked against `Intl` in `tests/i18n/formatting.test.ts` wherever
 * the runtime provides full ICU (the Node test runtime does — see the report).
 *
 * Numbers/money are formatted deterministically for the two supported locales
 * (bg: `1 234,56` with NBSP grouping and comma decimal; en: `1,234.56`) and
 * cross-checked against `Intl.NumberFormat` in the same test file. Money is
 * always converted from integer minor units (DEC-006) — never floats.
 */

import type { CurrencyCode } from '../types/common';

import type { Locale } from './catalog';

export type DateFormatStyle = 'numeric' | 'long';

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const MS_PER_MINUTE = 60_000;

/** Non-breaking space: Bulgarian groups thousands and separates the currency
 *  suffix with NBSP (matches CLDR/Intl conventions — see tests). */
const NBSP = '\u00A0';

const BG_MONTHS_LONG = [
  'януари',
  'февруари',
  'март',
  'април',
  'май',
  'юни',
  'юли',
  'август',
  'септември',
  'октомври',
  'ноември',
  'декември',
] as const;

const EN_MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Parse an ISO-8601 date-time (per `ISODateTime`, UTC) to epoch milliseconds. */
function parseUtc(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    throw new TypeError(`i18n/formatting: not an ISO date-time: ${String(iso)}`);
  }
  return ms;
}

/** Day of month of the last Sunday of `monthIndex` (UTC) in `year`. */
function lastSundayOfMonthUtc(year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const dayOfWeek = new Date(Date.UTC(year, monthIndex, lastDay)).getUTCDay();
  return lastDay - dayOfWeek;
}

/**
 * Europe/Sofia offset from UTC in minutes at a given instant: 120 (EET) or
 * 180 (EEST). Bulgaria follows the EU daylight-saving rule since 1996:
 * summer time runs from 01:00 UTC on the last Sunday of March to 01:00 UTC
 * on the last Sunday of October (inclusive of the start, exclusive of the end).
 */
export function sofiaUtcOffsetMinutes(utcMillis: number): number {
  const year = new Date(utcMillis).getUTCFullYear();
  const dstStart = Date.UTC(year, 2, lastSundayOfMonthUtc(year, 2), 1);
  const dstEnd = Date.UTC(year, 9, lastSundayOfMonthUtc(year, 9), 1);
  return utcMillis >= dstStart && utcMillis < dstEnd ? 180 : 120;
}

export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Wall-clock components of an instant in Europe/Sofia. */
export function sofiaWallClock(utcMillis: number): WallClock {
  const shifted = new Date(utcMillis + sofiaUtcOffsetMinutes(utcMillis) * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/**
 * `HH:mm` wall-clock time in Europe/Sofia, 24-hour, zero-padded (DEC-006).
 * The same format is used for both locales: transport times are read the
 * same way in bg and en, and ambiguity is avoided (no 12-hour clock).
 */
export function formatTimeInSofia(iso: string): string {
  const clock = sofiaWallClock(parseUtc(iso));
  return `${pad2(clock.hour)}:${pad2(clock.minute)}`;
}

/**
 * Date in Europe/Sofia.
 * - bg `numeric`: `24.10.2026 г.` (CLDR bg convention)
 * - bg `long`: `24 октомври 2026 г.`
 * - en `numeric`: `24/10/2026` (dd/mm/yyyy, en-GB convention)
 * - en `long`: `24 October 2026`
 */
export function formatDateInSofia(
  iso: string,
  locale: Locale,
  style: DateFormatStyle = 'numeric',
): string {
  const clock = sofiaWallClock(parseUtc(iso));
  if (locale === 'bg') {
    return style === 'long'
      ? `${clock.day} ${BG_MONTHS_LONG[clock.month - 1]} ${clock.year} г.`
      : `${pad2(clock.day)}.${pad2(clock.month)}.${clock.year} г.`;
  }
  return style === 'long'
    ? `${clock.day} ${EN_MONTHS_LONG[clock.month - 1]} ${clock.year}`
    : `${pad2(clock.day)}/${pad2(clock.month)}/${clock.year}`;
}

function groupDigits(digits: string, locale: Locale): string {
  const separator = locale === 'bg' ? NBSP : ',';
  let grouped = '';
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    grouped += digits[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) grouped += separator;
  }
  return grouped;
}

function decimalSeparator(locale: Locale): string {
  return locale === 'bg' ? ',' : '.';
}

/**
 * Format a finite number with locale grouping/decimal separators and
 * fraction-digit bounds (rounded half away from zero). Deterministic — see
 * the module comment; cross-checked against `Intl.NumberFormat` in tests.
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options: NumberFormatOptions = {},
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('i18n/formatNumber: value must be a finite number');
  }
  const minFrac = options.minimumFractionDigits ?? 0;
  const maxFrac = options.maximumFractionDigits ?? 3;
  if (
    !Number.isInteger(minFrac) ||
    !Number.isInteger(maxFrac) ||
    minFrac < 0 ||
    maxFrac < minFrac ||
    maxFrac > 20
  ) {
    throw new TypeError('i18n/formatNumber: invalid fraction-digit options');
  }
  const negative = value < 0;
  const abs = Math.abs(value);
  if (abs > 1e15) {
    throw new RangeError('i18n/formatNumber: value out of supported range');
  }
  const factor = 10 ** maxFrac;
  const scaled = Math.round(abs * factor);
  const whole = Math.floor(scaled / factor);
  let fraction = String(scaled % factor).padStart(maxFrac, '0');
  while (fraction.length > minFrac && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1);
  }
  const body = groupDigits(String(whole), locale);
  const withFraction = fraction ? `${body}${decimalSeparator(locale)}${fraction}` : body;
  return negative && (whole !== 0 || fraction.replace(/0/g, '') !== '')
    ? `-${withFraction}`
    : withFraction;
}

/**
 * Format money from INTEGER MINOR UNITS (stotinki/cents, DEC-006) in a
 * closed currency union (BGN | EUR).
 *
 * Conventions (verified against `Intl.NumberFormat` currency style in tests):
 * - bg: `12,50 лв.` / `12,50 €` (suffix, NBSP before the symbol)
 * - en: `BGN 12.50` / `€12.50`
 */
export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode,
  locale: Locale,
): string {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(
      'i18n/formatMoney: amountMinor must be an integer (DEC-006: never floats)',
    );
  }
  if (currency !== 'BGN' && currency !== 'EUR') {
    throw new TypeError(`i18n/formatMoney: unsupported currency: ${String(currency)}`);
  }
  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const whole = groupDigits(String(Math.floor(abs / 100)), locale);
  const fraction = pad2(abs % 100);
  const amount = `${whole}${decimalSeparator(locale)}${fraction}`;
  const sign = negative ? '-' : '';
  if (locale === 'bg') {
    return `${sign}${amount}${NBSP}${currency === 'BGN' ? 'лв.' : '€'}`;
  }
  return currency === 'EUR' ? `${sign}€${amount}` : `${sign}BGN${NBSP}${amount}`;
}
