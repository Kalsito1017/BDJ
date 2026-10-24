/**
 * Device locale detection (plan.md section 17.6: "detect device locale on
 * first launch").
 *
 * No new dependency is introduced for this (expo-localization /
 * react-native-localize would be the robust choices — reported as a
 * follow-up in the i18n-a11y report). Instead several cheap, guarded probes
 * are tried in order and the first supported tag wins. Detection never
 * throws and never blocks rendering; a failure simply means the app falls
 * back to DEFAULT_LOCALE.
 */

import { NativeModules } from 'react-native';

import type { Locale } from './catalog';
import { normalizeLocale } from './catalog';

type NavigatorWithLanguages = {
  language?: string;
  languages?: readonly string[];
};

type SettingsManagerModule = {
  settings?: { AppleLocale?: string; AppleLanguages?: readonly string[] };
};

type I18nManagerModule = { localeIdentifier?: string };

function candidateTags(): string[] {
  const tags: string[] = [];
  try {
    const nav = (globalThis as { navigator?: NavigatorWithLanguages }).navigator;
    if (nav?.languages?.length) tags.push(...nav.languages);
    if (nav?.language) tags.push(nav.language);
  } catch {
    // Some runtimes expose a restricted navigator; ignore.
  }
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
    }
  } catch {
    // Intl missing or partial (possible on Hermes) — ignore.
  }
  try {
    const settings = NativeModules.SettingsManager as SettingsManagerModule | undefined;
    if (settings?.settings?.AppleLanguages?.length) {
      tags.push(...settings.settings.AppleLanguages);
    }
    if (settings?.settings?.AppleLocale) tags.push(settings.settings.AppleLocale);
  } catch {
    // iOS native hint unavailable — ignore.
  }
  try {
    const i18nManager = NativeModules.I18nManager as I18nManagerModule | undefined;
    if (i18nManager?.localeIdentifier) tags.push(i18nManager.localeIdentifier);
  } catch {
    // Android native hint unavailable — ignore.
  }
  return tags;
}

/**
 * Best-effort device locale, or `null` when the device language is not
 * supported (`bg` / `en`). Callers map `null` to DEFAULT_LOCALE.
 */
export function detectDeviceLocale(): Locale | null {
  for (const tag of candidateTags()) {
    const locale = normalizeLocale(tag);
    if (locale) return locale;
  }
  return null;
}
