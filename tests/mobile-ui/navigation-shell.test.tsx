/* eslint-disable import/namespace, import/no-unresolved, import/no-duplicates --
 * The repository's ESLint import resolver cannot read package `exports`
 * subpaths: it throws "Resolve error: typescript with invalid interface
 * loaded as resolver" for `expo-router/testing-library`. `npm run typecheck`
 * resolves this import correctly. Fixing the resolver configuration is a
 * follow-up for the lint-tooling owner. */

/**
 * Navigation-shell tests (plan.md 17.7 core navigation: Search | Map |
 * My trips/Tickets | Settings; DEC-005 route names are the deep-link
 * contract).
 *
 * Uses Expo Router's testing library against the REAL route files in
 * src/app, so file placement and route names are part of what is tested.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import {
  SETTINGS_KEYS,
  settingsStorage,
} from '../../src/services/storage/settingsStorage';
import { setI18nLocale, translate } from '../../src/i18n';

// Official react-native-safe-area-context Jest mock (the native module is
// not present in tests). babel-plugin-jest-hoist lifts jest.mock above the
// imports at transpile time, so its position here is intentional.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(async () => {
  await AsyncStorage.clear();
  // The guide is completed: the shell tests start at the app itself.
  await AsyncStorage.setItem(SETTINGS_KEYS.onboardingCompleted, 'true');
});

describe('tab shell', () => {
  it('renders the four tabs with their accessible labels and no sign-in wall', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });

    await screen.findByTestId('screen-search');
    expect(screen.getByLabelText(t('a11y.tab_search_label'))).toBeTruthy();
    expect(screen.getByLabelText(t('a11y.tab_map_label'))).toBeTruthy();
    expect(screen.getByLabelText(t('a11y.tab_my_trips_label'))).toBeTruthy();
    expect(screen.getByLabelText(t('a11y.tab_settings_label'))).toBeTruthy();

    // Search, Map and My trips/Tickets must work without an account
    // (plan.md 17.2/17.7): no sign-in prompts anywhere in the shell.
    const text = JSON.stringify(screen.toJSON());
    expect(text).not.toMatch(/sign[\s-]?(in|up)|log[\s-]?in|password/i);
  });

  it('switches between the tabs without any account', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });
    await screen.findByTestId('screen-search');

    await fireEvent.press(screen.getByLabelText(t('a11y.tab_map_label')));
    await screen.findByTestId('screen-map');

    await fireEvent.press(screen.getByLabelText(t('a11y.tab_my_trips_label')));
    await screen.findByTestId('screen-trips');
    expect(screen.getByText(t('nav.tickets'))).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(t('a11y.tab_settings_label')));
    await screen.findByTestId('screen-settings');
    expect(screen.getByText(t('settings.language'))).toBeTruthy();
    expect(screen.getByText(t('settings.help'))).toBeTruthy();
  });

  it.each([
    ['Search', 'a11y.tab_search_label', 'screen-search'],
    ['Map', 'a11y.tab_map_label', 'screen-map'],
    ['My trips', 'a11y.tab_my_trips_label', 'screen-trips'],
    ['Settings', 'a11y.tab_settings_label', 'screen-settings'],
  ] as const)(
    'shows the demo-data disclaimer on the %s tab',
    async (_name, tabLabelKey, testID) => {
      await renderRouter('src/app', { initialUrl: '/search' });
      await fireEvent.press(screen.getByLabelText(t(tabLabelKey)));
      await screen.findByTestId(testID);
      if (testID === 'screen-map') {
        // The Map tab renders the stations feature: its rule-6 demo labelling
        // is the stations.demo badge + notice instead of provenance.demo_desc.
        expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
        expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
      } else {
        expect(screen.getByText(t('provenance.demo'))).toBeTruthy();
        expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
      }
    },
  );
});

describe('Settings -> Help', () => {
  it('replays the first-launch guide from the Help entry', async () => {
    await renderRouter('src/app', { initialUrl: '/settings' });

    await screen.findByTestId('screen-settings');
    await fireEvent.press(screen.getByText(t('settings.replay_onboarding')));

    await screen.findByTestId('onboarding-screen');
    expect(screen.getByTestId('onboarding-screen-title').props.children).toBe(
      t('onboarding.step1.title'),
    );
  });
});

describe('first launch', () => {
  it('presents the guide over the app and persists completion on skip', async () => {
    await AsyncStorage.clear();
    await renderRouter('src/app', { initialUrl: '/' });

    await screen.findByTestId('onboarding-gate-flow');
    await fireEvent.press(screen.getByTestId('onboarding-gate-flow-skip'));

    await screen.findByTestId('placeholder-screen');
    await expect(
      settingsStorage.get(SETTINGS_KEYS.onboardingCompleted, 'false'),
    ).resolves.toBe('true');
  });
});
