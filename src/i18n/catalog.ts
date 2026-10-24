/**
 * Translation catalogs and the pure translation core (plan.md section 17.6).
 *
 * The catalogs are flat `key -> string` maps with dot-separated keys
 * (e.g. `common.retry`). Every key MUST exist in every locale with the same
 * placeholders; `tests/i18n/locale-parity.test.ts` fails the build otherwise.
 *
 * FALLBACK CHOICE (recorded in the i18n-a11y report):
 * - DEFAULT_LOCALE = 'bg' — BDZ passengers in Bulgaria are the primary
 *   audience; an undetectable/unsupported device locale gets Bulgarian as
 *   the market default.
 * - FALLBACK_LOCALE = 'en' — English is the international bridge language
 *   and the conventional i18n fallback. Key parity is enforced by tests, so
 *   the fallback path is a safety net for development-time mistakes only.
 *
 * This module is pure: no React, no React Native, no storage. It is safe to
 * use from tests, services and non-React code.
 */

import type { LocaleCode } from '../types/common';

import bgCatalog from './locales/bg.json';
import enCatalog from './locales/en.json';

/** Supported UI locales, in menu order (plan.md section 17.6: bg + en). */
export const SUPPORTED_LOCALES = ['bg', 'en'] as const satisfies readonly LocaleCode[];

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Locale used when device detection yields nothing usable. */
export const DEFAULT_LOCALE: Locale = 'bg';

/** Locale consulted when a key is missing from the active locale. */
export const FALLBACK_LOCALE: Locale = 'en';

export type Catalog = Readonly<Record<string, string>>;
export type Catalogs = Readonly<Record<Locale, Catalog>>;

/** The built-in catalogs. */
export const catalogs: Catalogs = { bg: bgCatalog, en: enCatalog };

export type TranslationParams = Readonly<Record<string, string | number>>;

export type TranslateFn = (
  locale: Locale,
  key: string,
  params?: TranslationParams,
) => string;

/** Narrow an arbitrary value (e.g. a stored setting) to a supported locale. */
export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Map a BCP-47-ish language tag (`bg-BG`, `en_US`, `BG`, ...) to a supported
 * locale, or `null` when the tag is not supported. Never throws.
 */
export function normalizeLocale(tag: string | null | undefined): Locale | null {
  if (typeof tag !== 'string') return null;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  return base === 'bg' ? 'bg' : base === 'en' ? 'en' : null;
}

/** Placeholder names used by a translation value, e.g. `['page', 'total']`. */
export function extractPlaceholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]);
}

/**
 * Replace `{name}` placeholders. Unknown placeholders are left verbatim so a
 * missing parameter is visible in QA instead of silently rendering blank.
 */
export function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Build a translate function over arbitrary catalogs. Missing key in the
 * active locale -> FALLBACK-like second catalog; missing everywhere -> the
 * key itself (never `undefined`, never a crash).
 */
export function createTranslator(
  allCatalogs: Readonly<Record<Locale, Catalog>>,
  fallbackLocale: Locale,
): TranslateFn {
  return (locale, key, params) => {
    const active = allCatalogs[locale];
    const value = active?.[key] ?? allCatalogs[fallbackLocale][key];
    if (value === undefined) return key;
    return interpolate(value, params);
  };
}

/** Translate with the built-in catalogs. Usable outside React. */
export const translate: TranslateFn = createTranslator(catalogs, FALLBACK_LOCALE);
