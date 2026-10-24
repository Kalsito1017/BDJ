/**
 * Public API surface of `src/i18n` (the module mobile-ui and services
 * import). Locks the contract from the i18n brief: `useTranslation`,
 * `translate`, `formatDateInSofia`, `formatTimeInSofia`, `formatNumber`,
 * `formatMoney` (integer minor units, BGN | EUR), `SUPPORTED_LOCALES`,
 * `DEFAULT_LOCALE`, `FALLBACK_LOCALE`.
 */

import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  formatDateInSofia,
  formatMoney,
  formatNumber,
  formatTimeInSofia,
  getI18nLocale,
  initI18n,
  setI18nLocale,
  SUPPORTED_LOCALES,
  translate,
  useTranslation,
} from '../../src/i18n';

const NBSP = '\u00A0';

describe('src/i18n public surface', () => {
  it('exports the documented locale constants', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['bg', 'en']);
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
    expect(SUPPORTED_LOCALES).toContain(FALLBACK_LOCALE);
  });

  it('exports useTranslation as a function', () => {
    expect(typeof useTranslation).toBe('function');
  });

  it('translate() works outside React in both locales', () => {
    expect(translate('bg', 'nav.search')).toBe('Търсене');
    expect(translate('en', 'nav.search')).toBe('Search');
    expect(translate('bg', 'stations.no_results', { query: 'София' })).toBe(
      'Няма резултати за „София“',
    );
  });

  it('formats time and date in Europe/Sofia', () => {
    expect(formatTimeInSofia('2026-10-23T21:34:00Z')).toBe('00:34');
    expect(formatDateInSofia('2026-10-23T21:34:00Z', 'bg')).toBe('24.10.2026 г.');
  });

  it('formatDateInSofia/formatNumber/formatMoney default to the active locale', () => {
    const before = getI18nLocale();
    try {
      setI18nLocale('en');
      expect(getI18nLocale()).toBe('en');
      expect(formatDateInSofia('2026-10-23T21:34:00Z')).toBe('24/10/2026');
      expect(formatNumber(1234.5, undefined, { maximumFractionDigits: 1 })).toBe(
        '1,234.5',
      );
      expect(formatMoney(1250, 'BGN')).toBe(`BGN${NBSP}12.50`);

      setI18nLocale('bg');
      expect(formatDateInSofia('2026-10-23T21:34:00Z')).toBe('24.10.2026 г.');
      expect(formatNumber(1234.5, undefined, { maximumFractionDigits: 1 })).toBe(
        `1${NBSP}234,5`,
      );
      expect(formatMoney(1250, 'BGN')).toBe(`12,50${NBSP}лв.`);
    } finally {
      setI18nLocale(before);
    }
  });

  it('formatMoney accepts the domain Money object too', () => {
    expect(formatMoney({ amountMinor: 1250, currency: 'EUR' }, 'en')).toBe('€12.50');
    expect(formatMoney({ amountMinor: 1250, currency: 'BGN' }, 'bg')).toBe(
      `12,50${NBSP}лв.`,
    );
  });

  it('initI18n resolves with a supported locale', async () => {
    await expect(initI18n()).resolves.toEqual(expect.stringMatching(/^(bg|en)$/));
  });
});
