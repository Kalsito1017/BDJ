/**
 * ProvenanceBadge — the visible trust label for any travel information
 * (DEC-006; plan.md §8 "avoid false precision"; rule 6).
 *
 * Every data-driven UI element MUST render this badge with the provenance of
 * the data it shows. `demo` is styled to be unmissable on purpose
 * (addbeforerelease.txt §1: mock provider output is labelled "demo data"
 * everywhere it is shown).
 *
 * Labels/descriptions come from the i18n `PROVENANCE_*_KEYS` maps
 * (src/i18n/keys.ts) so key parity stays a compile-time property of the
 * i18n layer; the badge never invents wording of its own.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { InformationProvenance } from '../types/provenance';
import {
  PROVENANCE_DESCRIPTION_KEYS,
  PROVENANCE_LABEL_KEYS,
  useTranslation,
} from '../i18n';
import { useTheme } from '../theme';

export interface ProvenanceBadgeProps {
  provenance: InformationProvenance;
  /** Renders the one-line explanation below the pill. */
  showDescription?: boolean;
  testID?: string;
}

export function ProvenanceBadge({
  provenance,
  showDescription = false,
  testID,
}: ProvenanceBadgeProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();

  const labelText = t(PROVENANCE_LABEL_KEYS[provenance.kind]);
  const descriptionText = t(PROVENANCE_DESCRIPTION_KEYS[provenance.kind]);
  const isDemo = provenance.kind === 'demo';

  return (
    <View
      accessibilityHint={t('a11y.provenance_badge_hint')}
      accessibilityLabel={t('a11y.provenance_badge', { label: labelText })}
      accessible
      style={[styles.wrapper, { gap: spacing.xs }]}
      testID={testID}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDemo ? colors.demoBg : colors.surfaceAlt,
            borderColor: isDemo ? colors.demoBorder : colors.borderStrong,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
          },
        ]}
      >
        <Text
          style={[type.caption, { color: isDemo ? colors.demoText : colors.textPrimary }]}
        >
          {labelText}
        </Text>
      </View>
      {showDescription ? (
        <Text style={[type.bodySmall, { color: colors.textSecondary }]}>
          {descriptionText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
});
