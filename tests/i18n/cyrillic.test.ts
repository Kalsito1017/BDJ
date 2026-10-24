/**
 * Cyrillic rendering and layout-expansion guards (plan.md section 8:
 * "Support Cyrillic, long station names, small screens, and dynamic text
 * sizing"; addbeforerelease.txt section 8: long translations tested).
 *
 * These checks protect the two failure modes this app is most likely to hit:
 * a bg string left in Latin script ("untranslated"), and a runaway label that
 * cannot fit a tab bar / button in either language.
 */

import { interpolate } from '../../src/i18n/catalog';
import bg from '../../src/i18n/locales/bg.json';
import en from '../../src/i18n/locales/en.json';

const catalogs = { bg: bg as Record<string, string>, en: en as Record<string, string> };

const CYRILLIC = /[\u0400-\u04FF]/;

/** bg values legitimately without Cyrillic (brand names, English endonyms). */
const BG_LATIN_ALLOW_LIST = new Set([
  'common.app_name', // working product name — see review.common.app_name
  'settings.language_option_en', // "English" shown in its own language
]);

/** en values legitimately containing Cyrillic. */
const EN_CYRILLIC_ALLOW_LIST = new Set([
  'settings.language_option_bg', // "Български" shown in its own language
]);

function isReviewKey(key: string): boolean {
  return key.startsWith('review.');
}

describe('Cyrillic rendering', () => {
  it('renders Bulgarian text as real Cyrillic characters', () => {
    expect(CYRILLIC.test('Добре')).toBe(true);
    expect(catalogs.bg['common.ok']).toMatch(CYRILLIC);
  });

  it('writes every bg value in Cyrillic outside the allow-list', () => {
    const latin = Object.entries(catalogs.bg)
      .filter(
        ([key, value]) =>
          !CYRILLIC.test(value) && !BG_LATIN_ALLOW_LIST.has(key) && !isReviewKey(key), // review notes are English metadata for humans
      )
      .map(([key]) => key);
    expect(latin).toEqual([]);
  });

  it('keeps English values free of Cyrillic outside the allow-list', () => {
    const cyrillic = Object.entries(catalogs.en)
      .filter(([key, value]) => CYRILLIC.test(value) && !EN_CYRILLIC_ALLOW_LIST.has(key))
      .map(([key]) => key);
    expect(cyrillic).toEqual([]);
  });

  it('handles mixed Cyrillic/Latin/emoji input in placeholders', () => {
    // Station names may be Cyrillic, Latin, accented or contain apostrophes
    // (addbeforerelease.txt section 2).
    const name = "Централна гара София / Sofia Central – O'Hara😀";
    expect(interpolate('Гара {name}', { name })).toBe(`Гара ${name}`);
  });
});

describe('length guards (layout expansion)', () => {
  const controlKey = /^(common\.|nav\.)/;
  const labelKey = /(_label|_cta|_placeholder|_title|\.title)$/;

  it.each(['bg', 'en'] as const)('%s control strings stay tab-sized', (locale) => {
    const tooLong = Object.entries(catalogs[locale])
      .filter(([key, value]) => controlKey.test(key) && value.length > 24)
      .map(([key, value]) => `${key} (${value.length} chars)`);
    expect(tooLong).toEqual([]);
  });

  it.each(['bg', 'en'] as const)('%s label/title strings stay button-sized', (locale) => {
    const tooLong = Object.entries(catalogs[locale])
      .filter(
        ([key, value]) => labelKey.test(key) && value.length > 48 && !isReviewKey(key),
      )
      .map(([key, value]) => `${key} (${value.length} chars)`);
    expect(tooLong).toEqual([]);
  });

  it.each(['bg', 'en'] as const)(
    '%s values are bounded so layouts can expand',
    (locale) => {
      const tooLong = Object.entries(catalogs[locale])
        .filter(([, value]) => value.length > 400)
        .map(([key, value]) => `${key} (${value.length} chars)`);
      expect(tooLong).toEqual([]);
    },
  );

  it('keeps bg within a sane expansion factor of en (no runaway copy)', () => {
    const suspicious = Object.entries(catalogs.bg)
      .filter(([key, value]) => {
        const enValue = catalogs.en[key];
        return enValue !== undefined && value.length > enValue.length * 4 + 30;
      })
      .map(([key]) => key);
    expect(suspicious).toEqual([]);
  });
});
