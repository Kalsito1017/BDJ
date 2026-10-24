/**
 * DemoDataNotice — the always-visible demo-data disclaimer
 * (addbeforerelease.txt §1: "Mock provider clearly labelled 'demo data'
 * everywhere it is shown"; DEC-002/DEC-006).
 *
 * Render this on every screen that shows mock/demo content. It reuses the
 * demo provenance label plus its short description, so the wording lives in
 * exactly one place (provenance.* keys).
 *
 * The notice is not wrapped in a single `accessible` element on purpose:
 * the pill and the description stay individually focusable for screen
 * readers (the badge carries the a11y.provenance_badge label).
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { ProvenanceBadge } from './ProvenanceBadge';

export interface DemoDataNoticeProps {
  testID?: string;
}

export function DemoDataNotice({ testID }: DemoDataNoticeProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.demoBg,
          borderColor: colors.demoBorder,
          borderRadius: radii.sm,
          padding: spacing.md,
          gap: spacing.xs,
        },
      ]}
      testID={testID}
    >
      <ProvenanceBadge
        provenance={{ kind: 'demo', fetchedAt: '1970-01-01T00:00:00.000Z' }}
      />
      <Text style={[type.bodySmall, { color: colors.demoText }]}>
        {t('provenance.demo_desc')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    borderWidth: 1,
  },
});
