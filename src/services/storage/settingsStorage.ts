/**
 * Local settings persistence (DEC-005 `services/storage/`).
 *
 * Small typed key-value surface shared by the i18n layer (persisted language),
 * onboarding (completion flag) and later feature work. Features must go
 * through this module rather than touching AsyncStorage directly.
 *
 * Values are stored as strings. Local storage is untrusted input (DEC-006):
 * reads fall back to the caller's default instead of throwing, and callers
 * re-validate anything more structured than a string.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** The settings this app persists. Extend deliberately; values are strings. */
export const SETTINGS_KEYS = {
  /** App language tag, e.g. 'bg' | 'en'. The type lives in src/i18n. */
  language: 'settings.language',
  /** 'true' once onboarding is completed or skipped (plan.md 17.7). */
  onboardingCompleted: 'settings.onboardingCompleted',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export interface SettingsStorage {
  /** Returns the stored string, or `fallback` when missing or unreadable. */
  get(key: SettingsKey, fallback: string): Promise<string>;
  /** Persists a value. Rejects on write failure so callers can show a notice. */
  set(key: SettingsKey, value: string): Promise<void>;
}

/** In-memory implementation for tests and storybook-like previews. */
export function createMemorySettingsStorage(
  initial?: Readonly<Record<string, string>>,
): SettingsStorage {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    async get(key, fallback) {
      return store.get(key) ?? fallback;
    },
    async set(key, value) {
      store.set(key, value);
    },
  };
}

/** AsyncStorage-backed implementation used by the running app. */
export function createAsyncStorageSettingsStorage(): SettingsStorage {
  return {
    async get(key, fallback) {
      try {
        const value = await AsyncStorage.getItem(key);
        return value ?? fallback;
      } catch {
        // Corrupt or unreadable storage must never crash the app (DEC-006).
        return fallback;
      }
    },
    async set(key, value) {
      await AsyncStorage.setItem(key, value);
    },
  };
}

/** Default app-wide settings storage. */
export const settingsStorage: SettingsStorage = createAsyncStorageSettingsStorage();
