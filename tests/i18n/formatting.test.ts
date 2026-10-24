/**
 * Date/time/number/money formatting (DEC-006: Europe/Sofia wall-clock times,
 * integer minor-unit money in BGN | EUR; checklist section 2: UTC storage,
 * Europe/Sofia handling tested incl. DST and midnight-crossing journeys).
 *
 * The implementations in src/i18n/formatting.ts do NOT use Intl. Where the
 * runtime has full ICU, this suite CROSS-CHECKS them against
 * `Intl.DateTimeFormat`/`Intl.NumberFormat` with `Europe/Sofia` and the
 * bg/en locales. The Node test runtime does have full ICU (see the i18n-a11y
 * report); Hermes on-device could not be verified from this environment, and
 * is covered by the same pure implementation either way.
 */

import {
  formatDateInSofia,
  formatMoney,
  formatNumber,
  formatTimeInSofia,
  sofiaUtcOffsetMinutes,
  sofiaWallClock,
} from '../../src/i18n/formatting';

const NBSP = '\u00A0';

/** Does this runtime's Intl support the Europe/Sofia time zone? */
const intlTimeZoneWorks = (() => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Sofia' }).format(
      new Date('2026-10-23T21:34:00Z'),
    );
    return true;
  } catch {
    return false;
  }
})();

const maybeWithIntl = intlTimeZoneWorks ? it : it.skip;

function intlTimeInSofia(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Sofia',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
  return `${hour}:${minute}`;
}

function intlDateInSofia(iso: string, locale: string, style: 'numeric' | 'long'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Sofia',
    year: 'numeric',
    month: style === 'long' ? 'long' : '2-digit',
    day: style === 'long' ? 'numeric' : '2-digit',
  }).format(new Date(iso));
}

/** Whitespace-insensitive comparison (NBSP vs space). */
function norm(value: string): string {
  return value.replace(/\u00A0/g, ' ');
}

describe('Europe/Sofia UTC offset (EET/EEST, EU DST rule)', () => {
  it('is UTC+2 in winter and UTC+3 in summer', () => {
    expect(sofiaUtcOffsetMinutes(Date.parse('2026-01-15T10:00:00Z'))).toBe(120);
    expect(sofiaUtcOffsetMinutes(Date.parse('2026-07-15T10:00:00Z'))).toBe(180);
  });

  it('starts summer time at 01:00 UTC on the last Sunday of March 2026', () => {
    expect(sofiaUtcOffsetMinutes(Date.parse('2026-03-29T00:59:59Z'))).toBe(120);
    expect(sofiaUtcOffsetMinutes(Date.parse('2026-03-29T01:00:00Z'))).toBe(180);
  });

  it('ends summer time at 01:00 UTC on the last Sunday of October 2026', () => {
    expect(sofiaUtcOffsetMinutes(Date.parse('2026-10-25T00:59:59Z'))).toBe(180);
    expect(sofiaUtcOffsetMinutes(Date.parse('2026-10-25T01:00:00Z'))).toBe(120);
  });

  it('handles other years (2025, 2027, leap year 2028)', () => {
    expect(sofiaUtcOffsetMinutes(Date.parse('2025-03-30T01:00:00Z'))).toBe(180);
    expect(sofiaUtcOffsetMinutes(Date.parse('2025-10-26T01:00:00Z'))).toBe(120);
    expect(sofiaUtcOffsetMinutes(Date.parse('2027-03-28T01:00:00Z'))).toBe(180);
    expect(sofiaUtcOffsetMinutes(Date.parse('2027-10-31T01:00:00Z'))).toBe(120);
    expect(sofiaUtcOffsetMinutes(Date.parse('2028-02-29T12:00:00Z'))).toBe(120);
    expect(sofiaUtcOffsetMinutes(Date.parse('2028-07-01T12:00:00Z'))).toBe(180);
  });
});

describe('formatTimeInSofia (HH:mm, 24-hour, Europe/Sofia)', () => {
  it('converts regular winter and summer instants', () => {
    expect(formatTimeInSofia('2026-01-15T10:00:00Z')).toBe('12:00');
    expect(formatTimeInSofia('2026-07-15T10:00:00Z')).toBe('13:00');
    expect(formatTimeInSofia('2026-10-23T21:34:00Z')).toBe('00:34');
  });

  it('is correct across the spring-forward gap (03:00-04:00 local does not exist)', () => {
    expect(formatTimeInSofia('2026-03-29T00:59:00Z')).toBe('02:59');
    expect(formatTimeInSofia('2026-03-29T01:00:00Z')).toBe('04:00');
  });

  it('is correct across the fall-back overlap (03:00-04:00 local happens twice)', () => {
    expect(formatTimeInSofia('2026-10-25T00:59:00Z')).toBe('03:59');
    expect(formatTimeInSofia('2026-10-25T01:00:00Z')).toBe('03:00');
  });

  it('crosses midnight correctly (checklist section 2)', () => {
    // Departs 23:40 Sofia, arrives 00:25 the next day.
    expect(formatTimeInSofia('2026-10-23T20:40:00Z')).toBe('23:40');
    expect(formatTimeInSofia('2026-10-23T21:25:00Z')).toBe('00:25');
  });

  it('crosses the year boundary correctly', () => {
    expect(formatTimeInSofia('2026-12-31T22:30:00Z')).toBe('00:30');
    expect(formatTimeInSofia('2027-01-01T00:00:00Z')).toBe('02:00');
  });

  it('zero-pads both components', () => {
    expect(formatTimeInSofia('2026-10-23T05:05:00Z')).toBe('08:05'); // EEST, UTC+3
    expect(formatTimeInSofia('2026-01-23T05:05:00Z')).toBe('07:05'); // EET, UTC+2
  });

  it('rejects non-ISO input loudly', () => {
    expect(() => formatTimeInSofia('not a date')).toThrow(TypeError);
    expect(() => formatTimeInSofia('')).toThrow(TypeError);
  });
});

describe('formatDateInSofia', () => {
  it('formats bg numeric and long styles', () => {
    expect(formatDateInSofia('2026-10-23T21:34:00Z', 'bg')).toBe('24.10.2026 г.');
    expect(formatDateInSofia('2026-10-23T21:34:00Z', 'bg', 'long')).toBe(
      '24 октомври 2026 г.',
    );
    expect(formatDateInSofia('2026-01-02T12:00:00Z', 'bg', 'long')).toBe(
      '2 януари 2026 г.',
    );
  });

  it('formats en numeric and long styles', () => {
    expect(formatDateInSofia('2026-10-23T21:34:00Z', 'en')).toBe('24/10/2026');
    expect(formatDateInSofia('2026-10-23T21:34:00Z', 'en', 'long')).toBe(
      '24 October 2026',
    );
    expect(formatDateInSofia('2026-01-02T12:00:00Z', 'en', 'long')).toBe(
      '2 January 2026',
    );
  });

  it('assigns a midnight-crossing journey to two consecutive Sofia dates', () => {
    const departure = '2026-10-23T20:40:00Z'; // 23:40 Sofia, 23 Oct
    const arrival = '2026-10-23T21:25:00Z'; // 00:25 Sofia, 24 Oct
    expect(formatDateInSofia(departure, 'bg')).toBe('23.10.2026 г.');
    expect(formatDateInSofia(arrival, 'bg')).toBe('24.10.2026 г.');
  });

  it('keeps a DST-crossing journey on one calendar date with a stretched clock', () => {
    // 2h25m real time (23:30Z -> 01:55Z) across spring-forward = 3h25m clock.
    const departure = '2026-03-28T23:30:00Z'; // 01:30 Sofia, 29 Mar
    const arrival = '2026-03-29T01:55:00Z'; // 04:55 Sofia, 29 Mar
    expect(formatTimeInSofia(departure)).toBe('01:30');
    expect(formatTimeInSofia(arrival)).toBe('04:55');
    expect(formatDateInSofia(departure, 'en')).toBe('29/03/2026');
    expect(formatDateInSofia(arrival, 'en')).toBe('29/03/2026');
  });

  it('crosses the year boundary in Sofia', () => {
    expect(formatDateInSofia('2026-12-31T22:30:00Z', 'bg', 'long')).toBe(
      '1 януари 2027 г.',
    );
  });

  it('exposes wall-clock components for other UI needs', () => {
    expect(sofiaWallClock(Date.parse('2026-10-23T21:34:00Z'))).toEqual({
      year: 2026,
      month: 10,
      day: 24,
      hour: 0,
      minute: 34,
    });
  });

  it('rejects non-ISO input loudly', () => {
    expect(() => formatDateInSofia('23.10.2026', 'bg')).toThrow(TypeError);
  });
});

describe('formatNumber', () => {
  it('uses Bulgarian grouping (NBSP) and decimal comma', () => {
    expect(formatNumber(1234567.5, 'bg', { minimumFractionDigits: 2 })).toBe(
      `1${NBSP}234${NBSP}567,50`,
    );
    expect(formatNumber(1234.5, 'bg')).toBe(`1${NBSP}234,5`);
  });

  it('uses English grouping (comma) and decimal point', () => {
    expect(formatNumber(1234567.5, 'en', { minimumFractionDigits: 2 })).toBe(
      '1,234,567.50',
    );
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
  });

  it('pads to minimumFractionDigits and trims to maximumFractionDigits', () => {
    expect(formatNumber(5, 'en', { minimumFractionDigits: 2 })).toBe('5.00');
    expect(formatNumber(1.239, 'en', { maximumFractionDigits: 2 })).toBe('1.24');
    expect(
      formatNumber(0, 'bg', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ).toBe('0,00');
  });

  it('handles negatives and small values', () => {
    expect(formatNumber(-42.5, 'en', { minimumFractionDigits: 1 })).toBe('-42.5');
    expect(formatNumber(-0.0001, 'en', { maximumFractionDigits: 3 })).toBe('0');
  });

  it('rejects invalid input and options', () => {
    expect(() => formatNumber(Number.NaN, 'en')).toThrow(TypeError);
    expect(() => formatNumber(Number.POSITIVE_INFINITY, 'en')).toThrow(TypeError);
    expect(() =>
      formatNumber(1, 'en', { minimumFractionDigits: 3, maximumFractionDigits: 2 }),
    ).toThrow(TypeError);
    expect(() => formatNumber(1e16, 'en')).toThrow(RangeError);
  });
});

describe('formatMoney (integer minor units, BGN | EUR — DEC-006)', () => {
  it('formats BGN and EUR in Bulgarian', () => {
    expect(formatMoney(1250, 'BGN', 'bg')).toBe(`12,50${NBSP}лв.`);
    expect(formatMoney(1250, 'EUR', 'bg')).toBe(`12,50${NBSP}€`);
  });

  it('formats BGN and EUR in English', () => {
    expect(formatMoney(1250, 'BGN', 'en')).toBe(`BGN${NBSP}12.50`);
    expect(formatMoney(1250, 'EUR', 'en')).toBe('€12.50');
  });

  it('converts minor units exactly (no float artefacts)', () => {
    expect(formatMoney(0, 'BGN', 'bg')).toBe(`0,00${NBSP}лв.`);
    expect(formatMoney(5, 'BGN', 'bg')).toBe(`0,05${NBSP}лв.`);
    expect(formatMoney(1, 'EUR', 'en')).toBe('€0.01');
    expect(formatMoney(1234567, 'EUR', 'en')).toBe('€12,345.67');
    expect(formatMoney(100000000, 'BGN', 'bg')).toBe(
      `1${NBSP}000${NBSP}000,00${NBSP}лв.`,
    );
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-1250, 'EUR', 'en')).toBe('-€12.50');
    expect(formatMoney(-1250, 'BGN', 'bg')).toBe(`-12,50${NBSP}лв.`);
  });

  it('rejects floats and unknown currencies (checklist section 2)', () => {
    expect(() => formatMoney(12.5 as number, 'BGN', 'bg')).toThrow(TypeError);
    expect(() => formatMoney(Number.NaN, 'BGN', 'bg')).toThrow(TypeError);
    expect(() => formatMoney(100, 'USD' as unknown as 'BGN', 'bg')).toThrow(TypeError);
  });
});

describe('Intl cross-checks (runtime capability: Europe/Sofia time zone)', () => {
  const samples = [
    '2026-01-15T10:00:00Z',
    '2026-03-28T22:59:59Z',
    '2026-03-29T00:59:59Z',
    '2026-03-29T01:00:00Z',
    '2026-03-29T03:30:00Z',
    '2026-06-30T23:59:59Z',
    '2026-07-15T10:00:00Z',
    '2026-10-23T20:40:00Z',
    '2026-10-23T21:25:00Z',
    '2026-10-25T00:59:59Z',
    '2026-10-25T01:00:00Z',
    '2026-12-31T22:30:00Z',
    '2027-03-28T01:00:00Z',
    '2027-10-31T00:59:59Z',
    '2028-02-29T12:34:00Z',
  ];

  maybeWithIntl('formatTimeInSofia matches Intl.DateTimeFormat(Europe/Sofia)', () => {
    for (const iso of samples) {
      expect({ iso, time: formatTimeInSofia(iso) }).toEqual({
        iso,
        time: intlTimeInSofia(iso),
      });
    }
  });

  maybeWithIntl('formatDateInSofia matches Intl.DateTimeFormat(Europe/Sofia)', () => {
    for (const iso of samples) {
      expect({ iso, bg: formatDateInSofia(iso, 'bg') }).toEqual({
        iso,
        bg: intlDateInSofia(iso, 'bg', 'numeric'),
      });
      expect({ iso, bgLong: formatDateInSofia(iso, 'bg', 'long') }).toEqual({
        iso,
        bgLong: intlDateInSofia(iso, 'bg', 'long'),
      });
      expect({ iso, en: formatDateInSofia(iso, 'en') }).toEqual({
        iso,
        en: intlDateInSofia(iso, 'en-GB', 'numeric'),
      });
      expect({ iso, enLong: formatDateInSofia(iso, 'en', 'long') }).toEqual({
        iso,
        enLong: intlDateInSofia(iso, 'en-GB', 'long'),
      });
    }
  });

  maybeWithIntl('formatMoney matches Intl.NumberFormat currency style', () => {
    const amounts = [0, 5, 999, 1000, 1234567, -1234567, 100000000];
    for (const locale of ['bg', 'en'] as const) {
      for (const currency of ['BGN', 'EUR'] as const) {
        for (const amountMinor of amounts) {
          const expected = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            useGrouping: true,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amountMinor / 100);
          expect({
            locale,
            currency,
            amountMinor,
            value: norm(formatMoney(amountMinor, currency, locale)),
          }).toEqual({
            locale,
            currency,
            amountMinor,
            value: norm(expected),
          });
        }
      }
    }
  });

  maybeWithIntl('formatNumber matches Intl.NumberFormat (non-tie values)', () => {
    const values = [0, 5, 999, 1000, 1234.25, 1234567.75, -1234567.25];
    for (const locale of ['bg', 'en'] as const) {
      for (const value of values) {
        const expected = new Intl.NumberFormat(locale, {
          useGrouping: true,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
        expect({
          locale,
          value,
          formatted: norm(
            formatNumber(value, locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          ),
        }).toEqual({ locale, value, formatted: norm(expected) });
      }
    }
  });
});
