/**
 * StationRow — one selectable station in the picker.
 *
 * Rule 6: EVERY row is demo-labelled — the row renders the station's own
 * provenance badge (the demo directory is `demo` provenance throughout,
 * DEC-002/DEC-006) so mock results can never appear unlabelled.
 *
 * Display names stay exactly as the data source supplies them (checklist
 * §8: official station display names kept); `alternateName` is shown only
 * when the dataset provides one (plan.md §3.4 — never invented).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProvenanceBadge } from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { Station } from '../../types/station';

import { STATION_PICKER_KEYS } from './translationKeys';

export interface StationRowProps {
  t: TFunction;
  station: Station;
  onSelect: (station: Station) => void;
  testID?: string;
}

export function StationRow({ t, station, onSelect, testID }: StationRowProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;

  return (
    <Pressable
      accessibilityLabel={t(STATION_PICKER_KEYS.rowA11y, { name: station.name })}
      accessibilityRole="button"
      onPress={() => onSelect(station)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
          borderRadius: radii.sm,
          padding: spacing.md,
          gap: spacing.xs,
        },
      ]}
      testID={testID}
    >
      <View style={styles.nameBlock}>
        <Text style={[type.body, { color: colors.textPrimary }]}>{station.name}</Text>
        {station.alternateName ? (
          <Text style={[type.bodySmall, { color: colors.textSecondary }]}>
            {station.alternateName}
          </Text>
        ) : null}
      </View>
      <ProvenanceBadge provenance={station.provenance} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameBlock: {
    flexShrink: 1,
    gap: 2,
  },
});
