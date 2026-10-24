/**
 * Journey search form validation — unit tests (Phase 3 acceptance:
 * "invalid and incomplete input is handled clearly").
 *
 * Pure schema tests: every issue message is an i18n KEY (`validation.*`),
 * so the assertions compare keys — no literal copy is duplicated here.
 * Synthetic dates only; `todayIso` is injected so results never depend on
 * the wall clock.
 */

import {
  addDaysIso,
  createJourneySearchFormSchema,
  isValidIsoDate,
  MAX_DAYS_AHEAD,
  todayIsoInSofia,
} from '../../src/features/journey-search/validation';
import { translate } from '../../src/i18n';
import type { Station } from '../../src/types/station';

const TODAY = '2026-10-24';

function station(id: string): Station {
  return {
    id,
    name: `Гара ${id}`,
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  };
}

const SOFIA = station('sofia');
const VARNA = station('varna');

function messages(values: unknown): Record<string, string> {
  const result = createJourneySearchFormSchema(() => TODAY).safeParse(values);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : '_';
    out[field] = issue.message;
  }
  return out;
}

describe('journey search form schema', () => {
  it('accepts a complete, valid search', () => {
    expect(messages({ fromStation: SOFIA, toStation: VARNA, date: TODAY })).toEqual({});
  });

  it('requires both stations', () => {
    expect(messages({ fromStation: null, toStation: null, date: TODAY })).toEqual({
      fromStation: 'validation.required',
      toStation: 'validation.required',
    });
    expect(messages({ fromStation: SOFIA, toStation: null, date: TODAY })).toEqual({
      toStation: 'validation.required',
    });
  });

  it('rejects a station value that is not a real station', () => {
    expect(messages({ fromStation: { id: '' }, toStation: VARNA, date: TODAY })).toEqual({
      fromStation: 'validation.invalid_station',
    });
  });

  it('requires from and to to differ', () => {
    expect(messages({ fromStation: SOFIA, toStation: SOFIA, date: TODAY })).toEqual({
      toStation: 'validation.stations_must_differ',
    });
  });

  it('requires a date', () => {
    expect(messages({ fromStation: SOFIA, toStation: VARNA, date: '' })).toEqual({
      date: 'validation.required',
    });
  });

  it('rejects malformed and impossible dates', () => {
    for (const date of [
      '24.10.2026',
      '2026/10/24',
      '2026-10-2',
      'tomorrow',
      '2026-02-30',
      '2026-13-01',
    ]) {
      expect({
        date,
        errors: messages({ fromStation: SOFIA, toStation: VARNA, date }),
      }).toEqual({ date, errors: { date: 'validation.invalid_date' } });
    }
  });

  it('rejects dates in the past (Europe/Sofia today)', () => {
    expect(
      messages({ fromStation: SOFIA, toStation: VARNA, date: '2026-10-23' }),
    ).toEqual({ date: 'validation.date_in_past' });
  });

  it('accepts today and the 90-day horizon but not beyond', () => {
    const lastAllowed = addDaysIso(TODAY, MAX_DAYS_AHEAD);
    expect(messages({ fromStation: SOFIA, toStation: VARNA, date: lastAllowed })).toEqual(
      {},
    );
    const tooFar = addDaysIso(TODAY, MAX_DAYS_AHEAD + 1);
    expect(messages({ fromStation: SOFIA, toStation: VARNA, date: tooFar })).toEqual({
      date: 'validation.date_too_far',
    });
  });

  it('reports several independent errors at once', () => {
    expect(messages({ fromStation: null, toStation: VARNA, date: '2020-01-01' })).toEqual(
      {
        fromStation: 'validation.required',
        date: 'validation.date_in_past',
      },
    );
  });
});

describe('date helpers', () => {
  it('validates strict ISO dates only', () => {
    expect(isValidIsoDate('2026-10-24')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false); // 2026 is not a leap year
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-10-24T00:00:00Z')).toBe(false);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysIso('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes "today" on the Europe/Sofia calendar, not UTC', () => {
    // 2026-10-24T22:30:00Z is already 2026-10-25 00:30 in Sofia (EET, UTC+2).
    expect(todayIsoInSofia(Date.parse('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
    expect(todayIsoInSofia(Date.parse('2026-10-24T20:30:00Z'))).toBe('2026-10-24');
  });
});

describe('date rules around the Europe/Sofia midnight edge', () => {
  it('rejects the UTC date as past once Sofia has rolled into the next day', () => {
    // 23:30 UTC on 2026-10-24 = 01:30 on 2026-10-25 in Sofia (EET). The form
    // must validate against the SOFIA day: "today" is 2026-10-25, so a search
    // for 2026-10-24 is already in the past even though the UTC day matches.
    const lateEveningUtc = Date.parse('2026-10-24T23:30:00Z');
    const sofiaToday = todayIsoInSofia(lateEveningUtc);
    expect(sofiaToday).toBe('2026-10-25');

    const schema = createJourneySearchFormSchema(() => sofiaToday);
    expect(
      schema
        .safeParse({ fromStation: SOFIA, toStation: VARNA, date: '2026-10-24' })
        .error?.issues.map((issue) => issue.message),
    ).toEqual(['validation.date_in_past']);
    expect(
      schema.safeParse({ fromStation: SOFIA, toStation: VARNA, date: sofiaToday })
        .success,
    ).toBe(true);
  });

  it('validates against the day at VALIDATION time, not the day the form opened', () => {
    // A form kept open across midnight re-reads the day per submit (the
    // schema calls getToday() lazily): yesterday's "tomorrow" must become
    // "today", and the day before it must become "past".
    let today = '2026-10-24';
    const schema = createJourneySearchFormSchema(() => today);
    expect(
      schema.safeParse({ fromStation: SOFIA, toStation: VARNA, date: '2026-10-25' })
        .success,
    ).toBe(true);

    today = '2026-10-25'; // midnight passed while the form stayed mounted
    expect(
      schema
        .safeParse({ fromStation: SOFIA, toStation: VARNA, date: '2026-10-24' })
        .error?.issues.map((issue) => issue.message),
    ).toEqual(['validation.date_in_past']);
    expect(
      schema.safeParse({ fromStation: SOFIA, toStation: VARNA, date: '2026-10-25' })
        .success,
    ).toBe(true);
  });
});

describe('validation messages are real catalog keys (never raw keys on screen)', () => {
  const EMITTED_MESSAGE_KEYS = [
    'validation.required',
    'validation.invalid_station',
    'validation.invalid_date',
    'validation.date_in_past',
    'validation.date_too_far',
    'validation.stations_must_differ',
  ];

  it.each(EMITTED_MESSAGE_KEYS)(
    '%s resolves to real copy in both locales',
    (messageKey) => {
      for (const locale of ['bg', 'en'] as const) {
        const rendered = translate(locale, messageKey);
        // The raw-key fallback renders the key itself — that must never
        // reach the user for a validation message.
        expect({ locale, key: messageKey, rendered }).toEqual({
          locale,
          key: messageKey,
          rendered: expect.not.stringMatching(new RegExp(`^${messageKey}$`)),
        });
        expect(rendered.trim().length).toBeGreaterThan(0);
      }
    },
  );
});
