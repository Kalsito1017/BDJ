/**
 * Settings tab (placeholder shell).
 *
 * Contains the Help entry that replays the first-launch guide
 * (plan.md 17.7 "Let users reopen the guide from Settings -> Help") and a
 * language entry placeholder — the language switch itself is owned by the
 * i18n workstream (src/i18n).
 */
import { Text } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, PlaceholderScreen } from '../../components';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme';

export interface SettingsScreenProps {
  /** Injectable for tests; defaults to navigating to /onboarding. */
  onReplayOnboarding?: () => void;
}

export default function SettingsScreen({ onReplayOnboarding }: SettingsScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  const handleReplay = onReplayOnboarding ?? (() => router.push('/onboarding'));

  return (
    <PlaceholderScreen testID="screen-settings" title={t('nav.settings')}>
      <Card testID="screen-settings-language">
        <Text
          accessibilityRole="header"
          style={[type.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}
        >
          {t('settings.language')}
        </Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>
          {t('scaffold.coming_soon')}
        </Text>
      </Card>
      <Card testID="screen-settings-help">
        <Text
          accessibilityRole="header"
          style={[type.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}
        >
          {t('settings.help')}
        </Text>
        <Button
          accessibilityHint={t('settings.replay_onboarding_hint')}
          label={t('settings.replay_onboarding')}
          onPress={handleReplay}
          testID="screen-settings-replay"
          variant="secondary"
        />
      </Card>
    </PlaceholderScreen>
  );
}
