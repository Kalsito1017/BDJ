/**
 * OnboardingGate — shows the first-launch guide until it is completed.
 *
 * - Reads `SETTINGS_KEYS.onboardingCompleted` from settings storage once;
 *   when it is 'true' the app renders normally (plan.md 17.7: "do not show it
 *   every launch").
 * - Until the guide is completed it is presented in a modal above the app, so
 *   the navigation tree stays mounted underneath and deep links behave.
 * - No permission prompts, no consent screens (plan.md 17.7).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal } from 'react-native';

import {
  SETTINGS_KEYS,
  settingsStorage as defaultSettingsStorage,
  type SettingsStorage,
} from '../../services/storage/settingsStorage';
import { OnboardingFlow } from './OnboardingFlow';

export interface OnboardingGateProps {
  /** Injectable for tests; defaults to the app-wide settings storage. */
  storage?: SettingsStorage;
  children: ReactNode;
  testID?: string;
}

export function OnboardingGate({
  storage = defaultSettingsStorage,
  children,
  testID,
}: OnboardingGateProps) {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void storage.get(SETTINGS_KEYS.onboardingCompleted, 'false').then((value) => {
      if (alive) {
        setCompleted(value === 'true');
      }
    });
    return () => {
      alive = false;
    };
  }, [storage]);

  const handleDone = useCallback(() => {
    setCompleted(true);
  }, []);

  // Nothing renders until the flag is read: no flash of the wrong screen.
  if (completed === null) {
    return null;
  }

  return (
    <>
      {children}
      <Modal animationType="fade" onRequestClose={handleDone} visible={!completed}>
        <OnboardingFlow
          onComplete={handleDone}
          onSkip={handleDone}
          storage={storage}
          testID={testID ? `${testID}-flow` : 'onboarding-gate-flow'}
        />
      </Modal>
    </>
  );
}
