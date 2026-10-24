/**
 * Locale runtime: device detection, persisted choice (settingsStorage),
 * fallback behaviour and subscription updates.
 *
 * Storage in these tests is `createMemorySettingsStorage`
 * (src/services/storage/settingsStorage.ts) plus purpose-built fakes for
 * failure/race cases — no AsyncStorage, no network, nothing invented.
 */

import {
  createMemorySettingsStorage,
  SETTINGS_KEYS,
  type SettingsStorage,
} from '../../src/services/storage/settingsStorage';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  normalizeLocale,
} from '../../src/i18n/catalog';
import type { Locale } from '../../src/i18n/catalog';
import { detectDeviceLocale } from '../../src/i18n/detect';
import { createI18n } from '../../src/i18n/runtime';

describe('normalizeLocale / isSupportedLocale', () => {
  it('accepts bg/en tags with any region and case', () => {
    expect(normalizeLocale('bg')).toBe('bg');
    expect(normalizeLocale('BG')).toBe('bg');
    expect(normalizeLocale('bg-BG')).toBe('bg');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('en_US')).toBe('en');
    expect(normalizeLocale(' en-GB ')).toBe('en');
  });

  it('rejects anything else without throwing', () => {
    expect(normalizeLocale('fr-FR')).toBeNull();
    expect(normalizeLocale('')).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
    expect(normalizeLocale(undefined)).toBeNull();
    expect(normalizeLocale(42 as unknown as string)).toBeNull();
  });

  it('narrows stored settings safely', () => {
    expect(isSupportedLocale('bg')).toBe(true);
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale(7)).toBe(false);
  });
});

describe('detectDeviceLocale', () => {
  it('returns a supported locale or null, never throws', () => {
    // The actual value depends on the test runtime's locale settings; the
    // contract is "supported locale or null".
    const detected = detectDeviceLocale();
    expect(detected === 'bg' || detected === 'en' || detected === null).toBe(true);
  });
});

describe('createI18n: initial locale', () => {
  it('falls back to DEFAULT_LOCALE when nothing is detected or stored', async () => {
    const i18n = createI18n({
      storage: createMemorySettingsStorage(),
      detectDeviceLocale: () => null,
    });
    expect(i18n.getLocale()).toBe(DEFAULT_LOCALE);
    await expect(i18n.init()).resolves.toBe(DEFAULT_LOCALE);
  });

  it('uses the detected device locale on first launch', async () => {
    const i18n = createI18n({
      storage: createMemorySettingsStorage(),
      detectDeviceLocale: () => 'en',
    });
    expect(i18n.getLocale()).toBe('en');
    await expect(i18n.init()).resolves.toBe('en');
  });

  it('prefers the persisted user choice over the device locale', async () => {
    const storage = createMemorySettingsStorage({ [SETTINGS_KEYS.language]: 'en' });
    const i18n = createI18n({ storage, detectDeviceLocale: () => 'bg' });
    expect(i18n.getLocale()).toBe('bg'); // until init() reads storage
    await expect(i18n.init()).resolves.toBe('en');
    expect(i18n.getLocale()).toBe('en');
  });

  it('ignores an unsupported stored value and keeps the detected locale', async () => {
    const storage = createMemorySettingsStorage({ [SETTINGS_KEYS.language]: 'fr' });
    const i18n = createI18n({ storage, detectDeviceLocale: () => 'bg' });
    await expect(i18n.init()).resolves.toBe('bg');
  });

  it('init() is idempotent', async () => {
    const storage = createMemorySettingsStorage({ [SETTINGS_KEYS.language]: 'en' });
    const i18n = createI18n({ storage, detectDeviceLocale: () => null });
    const [first, second] = await Promise.all([i18n.init(), i18n.init()]);
    expect(first).toBe('en');
    expect(second).toBe('en');
  });
});

describe('createI18n: setLocale', () => {
  it('switches locale, notifies subscribers and persists the choice', async () => {
    const storage = createMemorySettingsStorage();
    const i18n = createI18n({ storage, detectDeviceLocale: () => 'bg' });
    const seen: Locale[] = [];
    const unsubscribe = i18n.subscribe(() => seen.push(i18n.getLocale()));

    i18n.setLocale('en');

    expect(i18n.getLocale()).toBe('en');
    expect(seen).toEqual(['en']);
    await expect(storage.get(SETTINGS_KEYS.language, '')).resolves.toBe('en');
    unsubscribe();
  });

  it('ignores unsupported locales', () => {
    const storage = createMemorySettingsStorage();
    const i18n = createI18n({ storage, detectDeviceLocale: () => 'bg' });
    i18n.setLocale('de' as unknown as Locale);
    expect(i18n.getLocale()).toBe('bg');
  });

  it('a user choice made during init() wins over stale storage', async () => {
    // Storage is slow to answer and still holds 'bg'; the user taps 'en'.
    let releaseGet!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGet = resolve;
    });
    const slowStorage: SettingsStorage = {
      async get() {
        await gate;
        return 'bg';
      },
      async set() {},
    };
    const i18n = createI18n({ storage: slowStorage, detectDeviceLocale: () => null });

    const initPromise = i18n.init();
    i18n.setLocale('en');
    releaseGet();
    await initPromise;

    expect(i18n.getLocale()).toBe('en');
  });

  it('survives a failing storage write (DEC-006: storage never crashes the app)', () => {
    const failingStorage: SettingsStorage = {
      async get(_key, fallback) {
        return fallback;
      },
      async set() {
        throw new Error('disk full');
      },
    };
    const i18n = createI18n({ storage: failingStorage, detectDeviceLocale: () => 'bg' });
    expect(() => i18n.setLocale('en')).not.toThrow();
    expect(i18n.getLocale()).toBe('en');
  });

  it('survives a failing storage read', async () => {
    const failingStorage: SettingsStorage = {
      async get() {
        throw new Error('corrupt');
      },
      async set() {},
    };
    const i18n = createI18n({ storage: failingStorage, detectDeviceLocale: () => 'bg' });
    await expect(i18n.init()).resolves.toBe('bg');
    expect(i18n.getLocale()).toBe('bg');
  });

  it('stops notifying after unsubscribe', () => {
    const i18n = createI18n({
      storage: createMemorySettingsStorage(),
      detectDeviceLocale: () => 'bg',
    });
    let calls = 0;
    const unsubscribe = i18n.subscribe(() => {
      calls += 1;
    });
    unsubscribe();
    i18n.setLocale('en');
    expect(calls).toBe(0);
  });
});
