/**
 * Loader — indeterminate loading indicator with an accessible label.
 *
 * `states.loading` is the visible message (checklist §7: loading states are
 * visible on every screen); `a11y.loading` is the screen-reader label.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';

export interface LoaderProps {
  /** Overrides the visible message (still announced via a11y.loading). */
  message?: string;
  testID?: string;
}

export function Loader({ message, testID }: LoaderProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;
  const { t } = useTranslation();
  const loadingLabel = t('states.loading');

  return (
    <View
      accessibilityLabel={loadingLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessible
      style={[styles.wrapper, { padding: spacing.lg }]}
      testID={testID}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      <Text
        style={[
          type.body,
          { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
        ]}
      >
        {message ?? loadingLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
