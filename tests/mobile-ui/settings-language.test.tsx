/**
 * Settings language switch (plan.md 17.6 / checklist §8: "language switch in
 * Settings" — closed 2026-10-25; the screen previously showed a placeholder).
 *
 * Asserts user-visible behaviour: both language options are offered in their
 * own language, switching changes the UI language, the choice is persisted
 * via `settingsStorage`, and the selected option is announced to
 * screen readers.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SettingsScreen from '../../src/app/(tabs)/settings';
import { setI18nLocale, translate } from '../../src/i18n';
import { SETTINGS_KEYS } from '../../src/services/storage/settingsStorage';

beforeEach(() => {
  setI18nLocale('en');
});

afterEach(() => {
  setI18nLocale('en');
});

describe('Settings — language switch', () => {
  it('offers both languages in their own language', async () => {
    await render(<SettingsScreen />);

    // Language names are shown in their own language (parity allow-list).
    expect(screen.getByText('Български')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });

  it('switches the UI language when a language is chosen', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText(translate('en', 'nav.settings'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('screen-settings-language-bg'));

    expect(screen.getByText(translate('bg', 'nav.settings'))).toBeTruthy();
    expect(screen.queryByText(translate('en', 'nav.settings'))).toBeNull();
  });

  it('persists the chosen language for the next launch', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId('screen-settings-language-bg'));

    await expect(AsyncStorage.getItem(SETTINGS_KEYS.language)).resolves.toBe('bg');
  });

  it('announces the selected language to screen readers', async () => {
    await render(<SettingsScreen />);

    expect(
      screen.getByTestId('screen-settings-language-en').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId('screen-settings-language-bg').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });
});
