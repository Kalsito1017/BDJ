/**
 * OnboardingFlow — the first-launch guide (plan.md 17.7).
 *
 * Behaviour:
 * - 4 skippable steps (ONBOARDING_STEPS) with visible Skip + Next actions, a
 *   page indicator, and a final "Start using the app" action.
 * - Completion is persisted through `settingsStorage` — both "Skip" and
 *   "Start using the app" mark the guide completed (it must not reappear on
 *   every launch), and it is replayable from Settings -> Help.
 * - NO permission prompts and NO consent collection of any kind happen here
 *   (plan.md 17.7, checklist §6/§10).
 * - The Tickets step explains the authorized purchase path only — this app
 *   has no purchase UI (ticketSales flag OFF, DEC-004).
 */
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ScreenContainer, StatusMessage } from '../../components';
import {
  SETTINGS_KEYS,
  settingsStorage as defaultSettingsStorage,
  type SettingsStorage,
} from '../../services/storage/settingsStorage';
import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';
import { ONBOARDING_STEPS } from './onboardingSteps';
import { PageIndicator } from './PageIndicator';

export interface OnboardingFlowProps {
  /** Injectable for tests; defaults to the app-wide settings storage. */
  storage?: SettingsStorage;
  /** Called after "Start using the app" persisted completion. */
  onComplete?: () => void;
  /** Called after "Skip" persisted completion. */
  onSkip?: () => void;
  testID?: string;
}

export function OnboardingFlow({
  storage = defaultSettingsStorage,
  onComplete,
  onSkip,
  testID,
}: OnboardingFlowProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;
  const { t } = useTranslation();

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  /** The action to re-run when a persist attempt failed (skip vs start). */
  const lastActionRef = useRef<(() => void) | undefined>(undefined);

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  /** Persists completion (checklist §10: "completion saved locally"). */
  const persistCompletion = useCallback(
    async (afterPersist: (() => void) | undefined) => {
      lastActionRef.current = afterPersist;
      setSaving(true);
      setSaveFailed(false);
      try {
        await storage.set(SETTINGS_KEYS.onboardingCompleted, 'true');
        afterPersist?.();
      } catch {
        // Local write failed (storage contract rejects): show an actionable
        // notice and let the user retry instead of silently losing the flag.
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [storage],
  );

  const handleSkip = useCallback(() => {
    void persistCompletion(onSkip);
  }, [persistCompletion, onSkip]);

  const handleStart = useCallback(() => {
    void persistCompletion(onComplete);
  }, [persistCompletion, onComplete]);

  const handleRetrySave = useCallback(() => {
    void persistCompletion(lastActionRef.current);
  }, [persistCompletion]);

  return (
    <ScreenContainer
      footer={
        <View style={[styles.footer, { gap: spacing.md }]}>
          {stepIndex > 0 ? (
            <Button
              label={t('common.back')}
              onPress={() => setStepIndex((index) => Math.max(0, index - 1))}
              testID={testID ? `${testID}-back` : undefined}
              variant="secondary"
            />
          ) : null}
          {isLastStep ? (
            <Button
              accessibilityHint={t('a11y.start_button_hint')}
              accessibilityLabel={t('a11y.start_button_label')}
              label={t('onboarding.start_cta')}
              loading={saving}
              onPress={handleStart}
              testID={testID ? `${testID}-start` : undefined}
            />
          ) : (
            <Button
              accessibilityHint={t('a11y.next_button_hint')}
              accessibilityLabel={t('a11y.next_button_label')}
              label={t('common.next')}
              loading={saving}
              onPress={() =>
                setStepIndex((index) => Math.min(ONBOARDING_STEPS.length - 1, index + 1))
              }
              testID={testID ? `${testID}-next` : undefined}
            />
          )}
        </View>
      }
      scroll
      testID={testID}
    >
      <View style={[styles.topRow, { marginBottom: spacing.sm }]}>
        <Button
          accessibilityHint={t('a11y.skip_button_hint')}
          accessibilityLabel={t('a11y.skip_button_label')}
          label={t('onboarding.skip')}
          onPress={handleSkip}
          testID={testID ? `${testID}-skip` : undefined}
          variant="ghost"
        />
      </View>

      <Text
        accessibilityRole="header"
        style={[type.display, { color: colors.textPrimary, marginBottom: spacing.md }]}
        testID={testID ? `${testID}-title` : undefined}
      >
        {t(step.titleKey)}
      </Text>
      <Text
        style={[type.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}
        testID={testID ? `${testID}-body` : undefined}
      >
        {t(step.bodyKey)}
      </Text>

      <PageIndicator
        current={stepIndex + 1}
        testID={testID ? `${testID}-page-indicator` : undefined}
        total={ONBOARDING_STEPS.length}
      />

      {saveFailed ? (
        <StatusMessage
          actionLabel={t('common.retry')}
          alert
          message={t('errors.unknown')}
          onAction={handleRetrySave}
          testID={testID ? `${testID}-save-error` : undefined}
          title={t('states.error')}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
  },
  footer: {
    alignSelf: 'stretch',
  },
});
