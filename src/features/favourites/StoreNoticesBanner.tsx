/**
 * StoreNoticesBanner — the visible local-store recovery notice (DEC-007
 * Appendix B.4 "visible notice"; DEC-026 Phase-7 blocker (a): store notices
 * must reach the UI; checklist §7 "error messages a user can act on").
 *
 * Behaviour:
 *  - shows the NEWEST notice only (`useStoreNotices` returns newest first)
 *    with actionable per-reason copy (`NOTICE_REASON_KEYS`) and a
 *    `common.close` dismissal;
 *  - renders NOTHING AT ALL when there is no notice (or the visible one was
 *    dismissed) — the happy path stays clutter-free;
 *  - dismissal is component-local and keyed by the notice's `at` (the store's
 *    notice history is append-only, so `at` identifies a notice for good —
 *    the `useStoreNotices` contract): a dismissed notice never re-appears,
 *    while a NEWER notice (e.g. a later write failure) is shown when it
 *    arrives.
 *
 * Honesty (rule 6): the copy only describes what this device did with local
 * saved items — nothing about services, schedules or data sources
 * (the claim-lexicon guards cover this surface).
 *
 * Accessibility: the notice text is ONE `accessibilityRole="alert"` +
 * `accessibilityLiveRegion` group so VoiceOver/TalkBack announce it when it
 * appears, while the close control stays OUTSIDE that group and individually
 * focusable (DemoDataNotice precedent).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components';
import { useTranslation } from '../../i18n';
import type { LocalStoreNotice } from '../../services/storage/localStore';
import { useTheme } from '../../theme';

import { NOTICE_KEYS, NOTICE_REASON_KEYS } from './translationKeys';

export interface StoreNoticesBannerProps {
  /** Local-store notices, NEWEST FIRST (`useStoreNotices` contract). */
  notices: readonly LocalStoreNotice[];
  testID?: string;
}

export function StoreNoticesBanner({ notices, testID }: StoreNoticesBannerProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();
  const [dismissedAt, setDismissedAt] = useState<readonly string[]>([]);

  const newest = notices[0];
  if (!newest || dismissedAt.includes(newest.at)) return null;

  return (
    <View
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
      <View
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        accessible
        style={[styles.alertGroup, { gap: spacing.xs }]}
      >
        <Text style={[type.label, { color: colors.textPrimary }]}>
          {t(NOTICE_KEYS.title)}
        </Text>
        <Text
          style={[type.bodySmall, { color: colors.textSecondary }]}
          testID={testID ? `${testID}-message` : undefined}
        >
          {t(NOTICE_REASON_KEYS[newest.reason])}
        </Text>
      </View>
      <Button
        label={t('common.close')}
        onPress={() => setDismissedAt((previous) => [...previous, newest.at])}
        testID={testID ? `${testID}-close` : undefined}
        variant="ghost"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'stretch',
    borderWidth: 1,
  },
  alertGroup: {
    alignSelf: 'stretch',
  },
});
