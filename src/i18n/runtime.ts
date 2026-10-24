/**
 * Locale runtime: current-locale state, persistence and the React hook.
 *
 * Contract (mobile-ui): `useTranslation()` returns `{ t, locale, setLocale }`
 * with `t(key, params?)`. There is no provider component: the module-level
 * default instance (see `src/i18n/index.ts`) is shared by all screens.
 *
 * Persistence: the user's choice is written through `settingsStorage`
 * (SETTINGS_KEYS.language, DEC-005) and re-read on next launch. Device-locale
 * detection runs only when no stored choice exists (plan.md 17.6). Storage is
 * untrusted input (DEC-006): failures never crash the app and never revert an
 * already-switched in-memory locale.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { SETTINGS_KEYS } from '../services/storage/settingsStorage';
import type { SettingsStorage } from '../services/storage/settingsStorage';

import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  normalizeLocale,
  translate as translateWithCatalogs,
} from './catalog';
import type { Locale, TranslationParams } from './catalog';

export type TFunction = (key: string, params?: TranslationParams) => string;

export interface UseTranslationResult {
  /** Translate in the currently rendered locale. */
  t: TFunction;
  locale: Locale;
  /** Switch language immediately and persist the choice. */
  setLocale: (locale: Locale) => void;
}

export interface I18n {
  useTranslation(): UseTranslationResult;
  getLocale(): Locale;
  setLocale(locale: Locale): void;
  /** Load the persisted choice (idempotent). Resolves with the active locale. */
  init(): Promise<Locale>;
  subscribe(listener: () => void): () => void;
}

export interface I18nDeps {
  storage: SettingsStorage;
  /** Returns a supported device locale or `null`; defaults to a real probe. */
  detectDeviceLocale?: () => Locale | null;
}

export function createI18n(deps: I18nDeps): I18n {
  let locale: Locale = deps.detectDeviceLocale?.() ?? DEFAULT_LOCALE;
  const listeners = new Set<() => void>();
  let initPromise: Promise<Locale> | null = null;
  let chosenByUser = false;

  function getLocale(): Locale {
    return locale;
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function setLocale(next: Locale): void {
    if (!isSupportedLocale(next) || next === locale) return;
    chosenByUser = true;
    locale = next;
    emit();
    void deps.storage.set(SETTINGS_KEYS.language, next).catch(() => {
      // Persistence failure must not crash the app (DEC-006). The switch
      // already took effect in memory; the device locale covers next launch.
    });
  }

  function init(): Promise<Locale> {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          const stored = await deps.storage.get(SETTINGS_KEYS.language, '');
          const fromStorage = normalizeLocale(stored);
          // A user choice made while init() was in flight wins over storage.
          if (fromStorage && !chosenByUser && fromStorage !== locale) {
            locale = fromStorage;
            emit();
          }
        } catch {
          // Unreadable storage: keep the detected/default locale (DEC-006).
        }
        return locale;
      })();
    }
    return initPromise;
  }

  function useTranslation(): UseTranslationResult {
    const current = useSyncExternalStore(subscribe, getLocale, getLocale);
    useEffect(() => {
      void init();
    }, []);
    const t = useCallback<TFunction>(
      (key, params) => translateWithCatalogs(current, key, params),
      [current],
    );
    return { t, locale: current, setLocale };
  }

  return { useTranslation, getLocale, setLocale, init, subscribe };
}
