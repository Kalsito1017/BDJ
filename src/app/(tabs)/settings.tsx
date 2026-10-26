/**
 * Settings tab.
 *
 * Contains the Help entry that replays the first-launch guide
 * (plan.md 17.7 "Let users reopen the guide from Settings -> Help") and the
 * language switch (plan.md 17.6 / checklist §8: device-locale detection on
 * first launch, user choice persisted via `settingsStorage`).
 */
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, PlaceholderScreen } from '../../components';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme';

export interface SettingsScreenProps {
  /** Injectable for tests; defaults to navigating to /onboarding. */
  onReplayOnboarding?: () => void;
}

export default function SettingsScreen({ onReplayOnboarding }: SettingsScreenProps) {
  const { t, locale, setLocale } = useTranslation();
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
        {/* Language names are shown in their own language (parity allow-list). */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            accessibilityLabel={t('settings.language_option_bg')}
            accessibilityState={{ selected: locale === 'bg' }}
            label={t('settings.language_option_bg')}
            onPress={() => setLocale('bg')}
            testID="screen-settings-language-bg"
            variant={locale === 'bg' ? 'primary' : 'secondary'}
          />
          <Button
            accessibilityLabel={t('settings.language_option_en')}
            accessibilityState={{ selected: locale === 'en' }}
            label={t('settings.language_option_en')}
            onPress={() => setLocale('en')}
            testID="screen-settings-language-en"
            variant={locale === 'en' ? 'primary' : 'secondary'}
          />
        </View>
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
