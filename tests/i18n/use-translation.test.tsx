/**
 * The `useTranslation()` React hook (mobile-ui's only entry point).
 *
 * API contract: `{ t, locale, setLocale }` with `t(key, params?)`.
 *
 * RNTL v14 notes (learned the hard way — see the smoke test's note):
 * `renderHook` is async and `result.current` is assigned in an effect, so
 * updates must go through `await act(async () => ...)`.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  createMemorySettingsStorage,
  SETTINGS_KEYS,
} from '../../src/services/storage/settingsStorage';
import type { Locale } from '../../src/i18n/catalog';
import { createI18n } from '../../src/i18n/runtime';

function makeI18n(options?: { stored?: string; detect?: () => Locale | null }) {
  const storage = createMemorySettingsStorage(
    options?.stored === undefined ? {} : { [SETTINGS_KEYS.language]: options.stored },
  );
  const i18n = createI18n({
    storage,
    detectDeviceLocale: options?.detect ?? (() => null),
  });
  return { i18n, storage };
}

describe('useTranslation', () => {
  it('returns t, locale and setLocale translating in the active locale', async () => {
    const { i18n } = makeI18n();
    const { result } = await renderHook(() => i18n.useTranslation());

    expect(result.current?.locale).toBe('bg');
    expect(result.current?.t('common.ok')).toBe('Добре');
    expect(result.current?.t('onboarding.page_indicator', { page: 2, total: 4 })).toBe(
      'Екран 2 от 4',
    );

    await act(async () => {
      result.current?.setLocale('en');
    });

    expect(result.current?.locale).toBe('en');
    expect(result.current?.t('common.ok')).toBe('OK');
    expect(result.current?.t('onboarding.page_indicator', { page: 2, total: 4 })).toBe(
      'Page 2 of 4',
    );
  });

  it('persists the chosen language through settingsStorage', async () => {
    const { i18n, storage } = makeI18n();
    const { result } = await renderHook(() => i18n.useTranslation());

    await act(async () => {
      result.current?.setLocale('en');
    });

    await waitFor(async () => {
      await expect(storage.get(SETTINGS_KEYS.language, '')).resolves.toBe('en');
    });
  });

  it('loads the persisted choice after mount (overriding device detection)', async () => {
    const { i18n } = makeI18n({ stored: 'en', detect: () => 'bg' });
    const { result } = await renderHook(() => i18n.useTranslation());

    await waitFor(() => {
      expect(result.current?.locale).toBe('en');
    });
    expect(result.current?.t('states.loading')).toBe('Loading…');
  });

  it('renders missing keys as the key itself (never blank, never throws)', async () => {
    const { i18n } = makeI18n();
    const { result } = await renderHook(() => i18n.useTranslation());

    expect(result.current?.t('does.not.exist')).toBe('does.not.exist');
  });
});
