/**
 * RecentSearchesSection — recent JourneySearch list on the Search screen
 * (plan.md §3.5 / §9 Phase 5).
 *
 * Presentational: the records, the station-name and date formatters and the
 * callbacks are injected (the screen binds them to the data-provider hook
 * contract via ../data/localDataHooks). Behaviour:
 *  - loading  -> skeleton;
 *  - empty    -> the whole section is HIDDEN (no clutter on the search form);
 *  - tap row  -> re-run that search (the caller navigates to results);
 *  - per-row delete and "clear all" -> ConfirmDialog (checklist §10:
 *    destructive actions ask for confirmation; these deletions cannot be
 *    undone).
 *
 * Privacy (src/types/favourites.ts): recent searches reveal travel intent,
 * stay on-device and are user-deletable — every row exposes its own delete
 * and the section exposes "clear all".
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmDialog, ListSkeleton } from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { RecentSearchRecord } from '../../types/favourites';

import { JOURNEY_KEYS } from '../journey-results/translationKeys';
import { RECENTS_KEYS } from './translationKeys';

export interface RecentSearchesSectionProps {
  t: TFunction;
  recents: readonly RecentSearchRecord[];
  loading: boolean;
  /** Resolves a station id to its display name (screen-level lookup). */
  stationName: (stationId: string) => string;
  /** Localized travel date for a `YYYY-MM-DD` value. */
  formatTravelDate: (isoDate: string) => string;
  /** Re-run the search (navigate to results). */
  onSelect: (record: RecentSearchRecord) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  testID?: string;
}

export function RecentSearchesSection({
  t,
  recents,
  loading,
  stationName,
  formatTravelDate,
  onSelect,
  onDelete,
  onDeleteAll,
  testID,
}: RecentSearchesSectionProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const [pendingDelete, setPendingDelete] = useState<RecentSearchRecord | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (loading) {
    return <ListSkeleton rows={2} testID={testID ? `${testID}-loading` : undefined} />;
  }

  // Hidden entirely when empty (no clutter on the search form).
  if (recents.length === 0) return null;

  const routeText = (record: RecentSearchRecord): string =>
    t(JOURNEY_KEYS.routeA11y, {
      from: stationName(record.search.fromStationId),
      to: stationName(record.search.toStationId),
    });

  return (
    <View style={[styles.section, { gap: spacing.md }]} testID={testID}>
      <View style={[styles.header, { gap: spacing.sm }]}>
        <Text
          accessibilityRole="header"
          style={[type.heading, { color: colors.textPrimary, flexShrink: 1 }]}
        >
          {t(RECENTS_KEYS.title)}
        </Text>
        <Button
          label={t(RECENTS_KEYS.clearAllCta)}
          onPress={() => setConfirmClearAll(true)}
          testID={testID ? `${testID}-clear-all` : undefined}
          variant="ghost"
        />
      </View>
      {recents.map((record) => (
        <View
          key={record.id}
          style={[
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              gap: spacing.sm,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={t(RECENTS_KEYS.itemA11y, {
              from: stationName(record.search.fromStationId),
              to: stationName(record.search.toStationId),
              date: formatTravelDate(record.search.date),
            })}
            accessibilityRole="button"
            onPress={() => onSelect(record)}
            style={({ pressed }) => [
              styles.rowMain,
              pressed && { backgroundColor: colors.surfaceAlt },
            ]}
            testID={testID ? `${testID}-item-${record.id}` : undefined}
          >
            <Text style={[type.body, { color: colors.textPrimary }]}>
              {`${stationName(record.search.fromStationId)} → ${stationName(
                record.search.toStationId,
              )}`}
            </Text>
            <Text style={[type.caption, { color: colors.textSecondary }]}>
              {formatTravelDate(record.search.date)}
            </Text>
          </Pressable>
          <Button
            accessibilityLabel={t(RECENTS_KEYS.deleteItemLabel, {
              route: routeText(record),
            })}
            label={t('common.delete')}
            onPress={() => setPendingDelete(record)}
            testID={testID ? `${testID}-item-${record.id}-delete` : undefined}
            variant="ghost"
          />
        </View>
      ))}
      <ConfirmDialog
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const record = pendingDelete;
          setPendingDelete(null);
          if (record) onDelete(record.id);
        }}
        testID={testID ? `${testID}-remove-confirm` : undefined}
        title={t(RECENTS_KEYS.removeConfirmTitle)}
        visible={pendingDelete !== null}
      />
      <ConfirmDialog
        destructive
        message={t(RECENTS_KEYS.clearConfirmBody)}
        onCancel={() => setConfirmClearAll(false)}
        onConfirm={() => {
          setConfirmClearAll(false);
          onDeleteAll();
        }}
        testID={testID ? `${testID}-clear-confirm` : undefined}
        title={t(RECENTS_KEYS.clearConfirmTitle)}
        visible={confirmClearAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  row: {
    alignSelf: 'stretch',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
});
