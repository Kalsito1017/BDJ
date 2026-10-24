/**
 * ListSkeleton — placeholder rows for lists that are loading.
 *
 * Static blocks on purpose: no shimmer animation (predictable on low-end
 * devices, checklist §7 performance) and a single screen-reader label so
 * TalkBack/VoiceOver announce "loading" once instead of N empty boxes.
 */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';

export interface ListSkeletonProps {
  /** Number of placeholder rows. */
  rows?: number;
  testID?: string;
}

export function ListSkeleton({ rows = 3, testID }: ListSkeletonProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const { t } = useTranslation();

  const count = Math.max(1, Math.floor(rows));

  return (
    <View
      accessibilityLabel={t('states.loading')}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessible
      style={[styles.wrapper, { padding: spacing.lg, gap: spacing.md }]}
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.row,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: radii.sm,
              padding: spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.bar,
              styles.barPrimary,
              { backgroundColor: colors.border, borderRadius: radii.sm },
            ]}
          />
          <View
            style={[
              styles.bar,
              styles.barSecondary,
              { backgroundColor: colors.border, borderRadius: radii.sm },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  row: {
    alignSelf: 'stretch',
    borderWidth: 1,
    gap: 8,
  },
  bar: {
    height: 12,
  },
  barPrimary: {
    width: '70%',
  },
  barSecondary: {
    width: '45%',
  },
});
