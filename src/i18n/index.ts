/**
 * Public i18n API (plan.md section 17.6; addbeforerelease.txt section 8).
 *
 * Usage in React (mobile-ui):
 *   const { t, locale, setLocale } = useTranslation();
 *   t('common.retry') / t('onboarding.page_indicator', { page: 2, total: 4 })
 *
 * Usage outside React (services, tests):
 *   translate('bg', 'common.ok')
 *   formatTimeInSofia('2026-10-23T21:34:00Z') // 'HH:mm', Europe/Sofia
 *   formatDateInSofia(iso, locale)            // dd.mm.yyyy г. | dd/mm/yyyy
 *   formatNumber(1234.5, locale)
 *   formatMoney(1250, 'BGN', locale)          // integer minor units (DEC-006)
 *
 * Fallback policy: DEFAULT_LOCALE = 'bg' (primary audience: BDZ passengers
 * in Bulgaria); FALLBACK_LOCALE = 'en' (international bridge language; key
 * parity is enforced by tests so the fallback is a safety net only). Missing
 * keys render the key itself — never blank, never a crash.
 *
 * Formatting is deterministic and does not depend on `Intl` (Hermes Intl
 * support is platform-dependent and unverified on-device here); see
 * `src/i18n/formatting.ts` and the i18n-a11y report for the exact rules and
 * the `Intl` cross-checks that run in `tests/i18n/formatting.test.ts`.
 */

import { settingsStorage } from '../services/storage/settingsStorage';
import type { CurrencyCode, Money } from '../types/common';

import {
  catalogs,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  isSupportedLocale,
  normalizeLocale,
  SUPPORTED_LOCALES,
  translate,
  createTranslator,
} from './catalog';
import type { Catalog, Locale, TranslateFn, TranslationParams } from './catalog';
import { detectDeviceLocale } from './detect';
import {
  formatDateInSofia as formatDateInSofiaPure,
  formatMoney as formatMoneyPure,
  formatNumber as formatNumberPure,
  formatTimeInSofia,
} from './formatting';
import type { DateFormatStyle, NumberFormatOptions } from './formatting';
import {
  ERROR_MESSAGE_KEYS,
  ORDER_STATE_LABEL_KEYS,
  PROVENANCE_DESCRIPTION_KEYS,
  PROVENANCE_LABEL_KEYS,
  TICKET_STATUS_LABEL_KEYS,
  TRANSLATION_REVIEW_KEYS,
} from './keys';
import { createI18n } from './runtime';
import type { I18n, TFunction, UseTranslationResult } from './runtime';

export {
  catalogs,
  createTranslator,
  DEFAULT_LOCALE,
  detectDeviceLocale,
  ERROR_MESSAGE_KEYS,
  FALLBACK_LOCALE,
  formatTimeInSofia,
  isSupportedLocale,
  normalizeLocale,
  ORDER_STATE_LABEL_KEYS,
  PROVENANCE_DESCRIPTION_KEYS,
  PROVENANCE_LABEL_KEYS,
  SUPPORTED_LOCALES,
  TICKET_STATUS_LABEL_KEYS,
  translate,
  TRANSLATION_REVIEW_KEYS,
};
export type {
  Catalog,
  DateFormatStyle,
  I18n,
  Locale,
  NumberFormatOptions,
  TFunction,
  TranslateFn,
  TranslationParams,
  UseTranslationResult,
};

/** App-wide locale runtime (persisted choice + device detection). */
export const i18n: I18n = createI18n({ storage: settingsStorage, detectDeviceLocale });

/** React hook: `{ t, locale, setLocale }`. No provider needed. */
export function useTranslation(): UseTranslationResult {
  return i18n.useTranslation();
}

/** Currently active UI locale (usable outside React). */
export function getI18nLocale(): Locale {
  return i18n.getLocale();
}

/** Switch the app language and persist the choice (Settings screen). */
export function setI18nLocale(locale: Locale): void {
  i18n.setLocale(locale);
}

/** Load the persisted language choice (idempotent). */
export function initI18n(): Promise<Locale> {
  return i18n.init();
}

/**
 * Date in Europe/Sofia for the given locale (defaults to the active one).
 * Styles: `numeric` -> `24.10.2026 г.` | `24/10/2026`;
 *         `long`    -> `24 октомври 2026 г.` | `24 October 2026`.
 */
export function formatDateInSofia(
  iso: string,
  locale?: Locale,
  style?: DateFormatStyle,
): string {
  return formatDateInSofiaPure(iso, locale ?? i18n.getLocale(), style);
}

/** Locale number formatting (defaults to the active locale). */
export function formatNumber(
  value: number,
  locale?: Locale,
  options?: NumberFormatOptions,
): string {
  return formatNumberPure(value, locale ?? i18n.getLocale(), options);
}

/**
 * Money from INTEGER MINOR UNITS (DEC-006: BGN | EUR), e.g.
 * `formatMoney(1250, 'BGN', 'bg')` -> `12,50 лв.`
 */
export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode,
  locale?: Locale,
): string;
/** Same, accepting the domain `Money` object: `formatMoney(money, locale?)`. */
export function formatMoney(money: Money, locale?: Locale): string;
export function formatMoney(
  amountOrMoney: number | Money,
  currencyOrLocale?: CurrencyCode | Locale,
  locale?: Locale,
): string {
  if (typeof amountOrMoney === 'object') {
    return formatMoneyPure(
      amountOrMoney.amountMinor,
      amountOrMoney.currency,
      isSupportedLocale(currencyOrLocale) ? currencyOrLocale : i18n.getLocale(),
    );
  }
  return formatMoneyPure(
    amountOrMoney,
    currencyOrLocale as CurrencyCode,
    locale ?? i18n.getLocale(),
  );
}
