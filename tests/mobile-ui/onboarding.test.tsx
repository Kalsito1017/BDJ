/**
 * Onboarding flow tests (plan.md 17.7; addbeforerelease.txt §10).
 *
 * Covers: advancing through the four steps, the page indicator, skip,
 * completion persisted via settingsStorage (also when skipped), the
 * save-failure retry path, and the no-permission-prompts rule.
 * "Replay from Settings -> Help" is covered in navigation-shell.test.tsx.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  OnboardingFlow,
  OnboardingGate,
  ONBOARDING_STEPS,
} from '../../src/features/onboarding';
import {
  createMemorySettingsStorage,
  SETTINGS_KEYS,
  type SettingsStorage,
} from '../../src/services/storage/settingsStorage';
import { setI18nLocale, translate } from '../../src/i18n';

beforeAll(() => {
  setI18nLocale('en');
});

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

// Load-robustness (defect found in Docker verification 2026-10-24): these
// flows use async RNTL updates and exceeded Jest's 5s default when the whole
// suite runs on a CPU-constrained container. Bounded at 20s — still catches hangs.
jest.setTimeout(20000);

describe('OnboardingFlow', () => {
  it('walks through the four steps with a page indicator and back navigation', async () => {
    const storage = createMemorySettingsStorage();
    await render(<OnboardingFlow storage={storage} testID="ob" />);

    expect(screen.getByTestId('ob-title').props.children).toBe(
      t('onboarding.step1.title'),
    );
    expect(
      screen.getByText(t('onboarding.page_indicator', { page: 1, total: 4 })),
    ).toBeTruthy();
    expect(screen.queryByTestId('ob-back')).toBeNull();

    await fireEvent.press(screen.getByTestId('ob-next'));
    expect(screen.getByTestId('ob-title').props.children).toBe(
      t('onboarding.step2.title'),
    );
    expect(
      screen.getByText(t('onboarding.page_indicator', { page: 2, total: 4 })),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('ob-back'));
    expect(screen.getByTestId('ob-title').props.children).toBe(
      t('onboarding.step1.title'),
    );

    await fireEvent.press(screen.getByTestId('ob-next'));
    await fireEvent.press(screen.getByTestId('ob-next'));
    await fireEvent.press(screen.getByTestId('ob-next'));
    expect(screen.getByTestId('ob-title').props.children).toBe(
      t('onboarding.step4.title'),
    );
    // Final step shows the start CTA instead of Next.
    expect(screen.queryByTestId('ob-next')).toBeNull();
    expect(screen.getByTestId('ob-start')).toBeTruthy();
  });

  it('finishes with "Start using the app" and persists completion', async () => {
    const storage = createMemorySettingsStorage();
    const onComplete = jest.fn();
    await render(
      <OnboardingFlow onComplete={onComplete} storage={storage} testID="ob" />,
    );

    await fireEvent.press(screen.getByTestId('ob-next'));
    await fireEvent.press(screen.getByTestId('ob-next'));
    await fireEvent.press(screen.getByTestId('ob-next'));
    await fireEvent.press(screen.getByTestId('ob-start'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    await expect(storage.get(SETTINGS_KEYS.onboardingCompleted, 'false')).resolves.toBe(
      'true',
    );
  });

  it('skips at any point, persists completion and dismisses', async () => {
    const storage = createMemorySettingsStorage();
    const onSkip = jest.fn();
    await render(<OnboardingFlow onSkip={onSkip} storage={storage} testID="ob" />);

    await fireEvent.press(screen.getByTestId('ob-skip'));

    await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
    await expect(storage.get(SETTINGS_KEYS.onboardingCompleted, 'false')).resolves.toBe(
      'true',
    );
  });

  it('keeps skip available on every step', async () => {
    const storage = createMemorySettingsStorage();
    await render(<OnboardingFlow storage={storage} testID="ob" />);

    for (let step = 0; step < ONBOARDING_STEPS.length; step += 1) {
      expect(screen.getByTestId('ob-skip')).toBeTruthy();
      if (step < ONBOARDING_STEPS.length - 1) {
        await fireEvent.press(screen.getByTestId('ob-next'));
      }
    }
  });

  it('shows an actionable error and retries when persisting fails', async () => {
    let failing = true;
    const store = new Map<string, string>();
    const flaky: SettingsStorage = {
      async get(key, fallback) {
        return store.get(key) ?? fallback;
      },
      async set(key, value) {
        if (failing) throw new Error('synthetic write failure');
        store.set(key, value);
      },
    };

    await render(<OnboardingFlow storage={flaky} testID="ob" />);
    await fireEvent.press(screen.getByTestId('ob-skip'));

    await waitFor(() => expect(screen.getByTestId('ob-save-error')).toBeTruthy());
    expect(screen.getByText(t('states.error'))).toBeTruthy();
    expect(store.size).toBe(0);

    failing = false;
    await fireEvent.press(screen.getByRole('button', { name: t('common.retry') }));
    await waitFor(() =>
      expect(store.get(SETTINGS_KEYS.onboardingCompleted)).toBe('true'),
    );
  });
});

describe('OnboardingGate', () => {
  it('shows the guide on first launch and the app after it is completed', async () => {
    const storage = createMemorySettingsStorage();

    await render(
      <OnboardingGate storage={storage} testID="gate">
        <></>
      </OnboardingGate>,
    );

    // First launch: guide visible, app underneath.
    await waitFor(() => expect(screen.getByTestId('gate-flow')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('gate-flow-skip'));
    await waitFor(() => expect(screen.queryByTestId('gate-flow')).toBeNull());
    await expect(storage.get(SETTINGS_KEYS.onboardingCompleted, 'false')).resolves.toBe(
      'true',
    );
  });

  it('does not show the guide again once completed', async () => {
    const storage = createMemorySettingsStorage({
      [SETTINGS_KEYS.onboardingCompleted]: 'true',
    });

    await render(
      <OnboardingGate storage={storage} testID="gate">
        <></>
      </OnboardingGate>,
    );

    expect(screen.queryByTestId('gate-flow')).toBeNull();
  });
});

describe('onboarding permissions policy', () => {
  const featureDir = join(__dirname, '..', '..', 'src', 'features', 'onboarding');

  it('never asks for permissions during onboarding', () => {
    const offenders: string[] = [];
    for (const file of readdirSync(featureDir)) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const source = readFileSync(join(featureDir, file), 'utf8');
      for (const pattern of [
        'PermissionsAndroid',
        'requestPermission',
        'requestPermissions',
        'expo-location',
        'expo-notifications',
        'Linking.openSettings',
      ]) {
        if (source.includes(pattern)) offenders.push(`${file}: ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
