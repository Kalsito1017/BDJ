/**
 * OfflineBanner — compact "no connection" banner (checklist §7: offline
 * state on every screen; plan.md §9 Phase 5 resilience).
 *
 * Unlike `OfflineState` (a full-screen state) this is a persistent hint
 * shown ABOVE screen content while the device reports no connectivity, so
 * cached/labelled content can stay on screen honestly. The optional action
 * is a REAL retry supplied by the caller (e.g. the journey-search refetch)
 * — never a back-navigation wearing a "Retry" label (review M1/M2).
 *
 * Copy reuses the existing `states.offline` / `errors.offline` keys; no new
 * strings (the stations feature's `stations.offline.banner` talks about
 * station data specifically and is not reused here).
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

import { Button } from './Button';

export interface OfflineBannerProps {
  /** Renders nothing when false — the banner appears only while offline. */
  visible: boolean;
  /** Real retry action (refetch); hidden when omitted. */
  onRetry?: () => void;
  testID?: string;
}

export function OfflineBanner({ visible, onRetry, testID }: OfflineBannerProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      accessible
      style={[
        styles.banner,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.borderStrong,
          borderRadius: radii.md,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
      testID={testID}
    >
      <Text style={[type.label, { color: colors.textPrimary }]}>
        {t('states.offline')}
      </Text>
      <Text style={[type.bodySmall, { color: colors.textSecondary }]}>
        {t('errors.offline')}
      </Text>
      {onRetry ? (
        <Button
          label={t('common.retry')}
          onPress={onRetry}
          testID={testID ? `${testID}-retry` : undefined}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'stretch',
    borderWidth: 1,
  },
});
