/**
 * Journey-flow i18n key contract — STRICT completeness guard (Phase 3/4).
 *
 * Why this file exists (reviewer-qa, 2026-10-24):
 * `tests/mobile-ui/i18n-integrity.test.tsx` DERIVES its tolerated
 * `PENDING_LEAD_MERGE` set from the contract files, so a key that is removed
 * (or was never merged) silently re-enters the "pending" set and every guard
 * goes green again while the UI renders the raw key. Spot-check evidence:
 * deleting `journey_search.title` from BOTH catalogs left all 360
 * i18n/mobile-ui tests passing. The same hole let the lead's 39-key merge
 * ship with `journey_results.empty_title` missing from both catalogs.
 *
 * This suite closes the hole: EVERY key the four journey-flow contract files
 * declare (and every validation message the form schema can emit) must exist
 * with non-empty values in BOTH catalogs and must render as real copy, never
 * as its own key. Removing any one of them must fail here.
 *
 * It also pins "no duplicate keys in the raw locale JSON" (a duplicated key
 * is silently dropped by JSON.parse, so the catalogs would lie about their
 * own contents).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { JOURNEY_SEARCH_KEYS } from '../../src/features/journey-search/translationKeys';
import {
  JOURNEY_KEYS,
  JOURNEY_RESULTS_KEYS,
} from '../../src/features/journey-results/translationKeys';
import { JOURNEY_DETAILS_KEYS } from '../../src/features/journey-details/translationKeys';
import { STATION_PICKER_KEYS } from '../../src/features/station-picker/translationKeys';
import { catalogs, translate, type Locale } from '../../src/i18n';

/** Every key the journey-flow surfaces render (DEC-022 §4 merge contract). */
const CONTRACT_KEYS: readonly string[] = [
  ...Object.values(JOURNEY_SEARCH_KEYS),
  ...Object.values(JOURNEY_KEYS),
  ...Object.values(JOURNEY_RESULTS_KEYS),
  ...Object.values(JOURNEY_DETAILS_KEYS),
  ...Object.values(STATION_PICKER_KEYS),
];

/**
 * Every message key `createJourneySearchFormSchema` can put in a Zod issue
 * (src/features/journey-search/validation.ts) — the form renders
 * `t(issue.message)`, so a missing one shows a raw key on the primary flow.
 */
const VALIDATION_MESSAGE_KEYS: readonly string[] = [
  'validation.required',
  'validation.invalid_station',
  'validation.invalid_date',
  'validation.date_in_past',
  'validation.date_too_far',
  'validation.stations_must_differ',
];

const LOCALES: readonly Locale[] = ['bg', 'en'];

describe('journey-flow key contract: catalog completeness (strict)', () => {
  it.each(LOCALES)(
    'every journey-flow contract key has a non-empty %s value',
    (locale) => {
      const missing = CONTRACT_KEYS.filter((key) => {
        const value = catalogs[locale][key];
        return typeof value !== 'string' || value.trim().length === 0;
      });
      expect({ locale, missing }).toEqual({ locale, missing: [] });
    },
  );

  it.each(LOCALES)(
    'every form validation message key has a non-empty %s value',
    (locale) => {
      const missing = VALIDATION_MESSAGE_KEYS.filter((key) => {
        const value = catalogs[locale][key];
        return typeof value !== 'string' || value.trim().length === 0;
      });
      expect({ locale, missing }).toEqual({ locale, missing: [] });
    },
  );

  it.each(LOCALES)('no contract key renders as its own raw key in %s', (locale) => {
    // The user-visible failure mode of a missing key: the UI shows "a.b.c".
    const raw = [...CONTRACT_KEYS, ...VALIDATION_MESSAGE_KEYS].filter(
      (key) => translate(locale, key) === key,
    );
    expect({ locale, rawKeysOnScreen: raw }).toEqual({
      locale,
      rawKeysOnScreen: [],
    });
  });
});

describe('locale catalogs: no duplicate keys (raw file, JSON.parse would hide them)', () => {
  it.each(LOCALES)('%s.json declares every key exactly once', (locale) => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'src', 'i18n', 'locales', `${locale}.json`),
      'utf8',
    );
    const keys = [...raw.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const key of keys) {
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
    expect({ locale, duplicates }).toEqual({ locale, duplicates: [] });
    // The raw scan must agree with the parsed catalog (catches formatting that
    // hides entries from the line-based scan).
    expect(keys.length).toBe(Object.keys(catalogs[locale]).length);
  });
});
