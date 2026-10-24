/**
 * PlaceholderScreen — shared body for Phase 2 placeholder routes.
 *
 * Every placeholder screen shows (Phase 2 acceptance, plan.md §9 Phase 2):
 * - i18n-keyed copy only (DEC-014 finding M2: no hard-coded English),
 * - the visible demo-data disclaimer (checklist §1, DEC-006),
 * - the UI-states preview (loading/empty/error/timeout/offline + retry).
 *
 * Replace this body per screen as real features land (Phases 3-5).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { DemoDataNotice } from './DemoDataNotice';
import { ScreenContainer } from './ScreenContainer';
import { ScreenStatesPreview } from './ScreenStatesPreview';

export interface PlaceholderScreenProps {
  /** Screen title (nav.* key value). */
  title: string;
  /** Body copy; defaults to scaffold.coming_soon. */
  body?: string;
  /** Extra content rendered below the demo notice. */
  children?: ReactNode;
  testID?: string;
}

export function PlaceholderScreen({
  title,
  body,
  children,
  testID,
}: PlaceholderScreenProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;
  const { t } = useTranslation();

  return (
    <ScreenContainer testID={testID} title={title}>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {body ?? t('scaffold.coming_soon')}
      </Text>
      <DemoDataNotice testID={testID ? `${testID}-demo-notice` : undefined} />
      {children ? (
        <View style={[styles.extra, { gap: spacing.md }]}>{children}</View>
      ) : null}
      <ScreenStatesPreview testID={testID ? `${testID}-states` : undefined} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  extra: {
    alignSelf: 'stretch',
  },
});
