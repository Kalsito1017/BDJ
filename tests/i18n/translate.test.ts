/**
 * Translation behaviour: fallback for missing keys, interpolation, and long
 * translation values (plan.md section 17.6 "reliable fallback language";
 * plan.md section 8 "long station names / long translations").
 */

import {
  catalogs,
  createTranslator,
  extractPlaceholders,
  FALLBACK_LOCALE,
  interpolate,
  SUPPORTED_LOCALES,
  translate,
} from '../../src/i18n/catalog';

const EN_ONLY = { 'test.hello': 'Hello, {name}!', 'test.en_only': 'English only' };
const BG_ONLY = { 'test.hello': 'Здравей, {name}!', 'test.bg_only': 'Само на български' };

const synthetic = createTranslator({ bg: BG_ONLY, en: EN_ONLY }, 'en');

describe('createTranslator: fallback for missing keys', () => {
  it('uses the active locale when the key exists', () => {
    expect(synthetic('bg', 'test.hello', { name: 'Иво' })).toBe('Здравей, Иво!');
    expect(synthetic('en', 'test.hello', { name: 'Ivo' })).toBe('Hello, Ivo!');
  });

  it('falls back to the fallback locale when the key is missing in the active one', () => {
    // Synthetic fallback locale is 'en' here.
    expect(synthetic('bg', 'test.en_only')).toBe('English only');
    // With 'bg' as fallback locale the mirror case works too.
    const bgFallback = createTranslator({ bg: BG_ONLY, en: EN_ONLY }, 'bg');
    expect(bgFallback('en', 'test.bg_only')).toBe('Само на български');
    // Without the fallback the key itself is rendered — the documented
    // behavior of the real catalogs (fallback locale 'en').
    expect(synthetic('en', 'test.bg_only')).toBe('test.bg_only');
  });

  it('renders the key itself when it is missing everywhere', () => {
    expect(synthetic('bg', 'test.missing_everywhere')).toBe('test.missing_everywhere');
    expect(synthetic('en', 'test.missing_everywhere')).toBe('test.missing_everywhere');
  });

  it('never throws on odd input', () => {
    expect(synthetic('bg', '')).toBe('');
    expect(synthetic('bg', 'test.hello')).toBe('Здравей, {name}!');
  });
});

describe('interpolation', () => {
  it('replaces named placeholders', () => {
    expect(interpolate('a {x} b {y}', { x: 1, y: 'две' })).toBe('a 1 b две');
  });

  it('leaves unknown placeholders visible instead of blanking them', () => {
    expect(interpolate('a {x} b {y}', { x: 1 })).toBe('a 1 b {y}');
  });

  it('coerces numeric params', () => {
    expect(interpolate('Екран {page} от {total}', { page: 2, total: 4 })).toBe(
      'Екран 2 от 4',
    );
  });

  it('treats a prototype-inherited name as absent', () => {
    expect(interpolate('hi {toString}', {})).toBe('hi {toString}');
  });
});

describe('long translation values', () => {
  const longValue = 'З'.repeat(1000);

  it('interpolates very long values and params without truncation', () => {
    expect(interpolate('{v}', { v: longValue })).toBe(longValue);
  });

  it('falls back correctly for long values too', () => {
    const translator = createTranslator(
      { bg: {}, en: { 'test.long': longValue } },
      FALLBACK_LOCALE,
    );
    expect(translator('bg', 'test.long')).toBe(longValue);
  });
});

describe('built-in catalogs through translate()', () => {
  it('translates known keys per locale', () => {
    expect(translate('bg', 'common.ok')).toBe('Добре');
    expect(translate('en', 'common.ok')).toBe('OK');
  });

  it('substitutes real-catalog placeholders identically in both locales', () => {
    expect(translate('bg', 'onboarding.page_indicator', { page: 1, total: 4 })).toBe(
      'Екран 1 от 4',
    );
    expect(translate('en', 'onboarding.page_indicator', { page: 1, total: 4 })).toBe(
      'Page 1 of 4',
    );
  });

  it('renders every catalog key in every locale without throwing', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of Object.keys(catalogs[locale])) {
        const params = Object.fromEntries(
          extractPlaceholders(catalogs[locale][key]).map((name) => [name, 1]),
        );
        expect(typeof translate(locale, key, params)).toBe('string');
      }
    }
  });
});
