/**
 * PageIndicator — onboarding progress ("Page 2 of 4").
 *
 * `a11y.page_indicator` carries the accessible announcement and
 * `onboarding.page_indicator` the visible text (both with {page}/{total}
 * params per the i18n contract); the dots are decorative and hidden from
 * screen readers to avoid double announcement.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { useTranslation } from '../../i18n';

export interface PageIndicatorProps {
  /** 1-based current page. */
  current: number;
  total: number;
  testID?: string;
}

export function PageIndicator({ current, total, testID }: PageIndicatorProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();

  const safeTotal = Math.max(1, Math.floor(total));
  const safePage = Math.min(Math.max(1, Math.floor(current)), safeTotal);

  return (
    <View
      accessibilityLabel={t('a11y.page_indicator', { page: safePage, total: safeTotal })}
      accessible
      style={[styles.wrapper, { gap: spacing.xs }]}
      testID={testID}
    >
      <Text style={[type.label, { color: colors.textSecondary }]}>
        {t('onboarding.page_indicator', { page: safePage, total: safeTotal })}
      </Text>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.dots, { gap: spacing.xs }]}
      >
        {Array.from({ length: safeTotal }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === safePage - 1 ? colors.primary : colors.border,
                borderRadius: radii.pill,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
  },
});
