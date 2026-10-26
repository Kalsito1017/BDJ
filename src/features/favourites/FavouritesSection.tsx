/**
 * FavouritesSection — saved routes on the Search screen (plan.md §3.5 /
 * §9 Phase 5).
 *
 * Presentational: records, formatters and callbacks are injected (the
 * screen binds the data-provider hook contract via ../data/localDataHooks).
 * Behaviour:
 *  - loading -> skeleton;
 *  - empty   -> honest empty state ("no saved routes yet");
 *  - tap row -> run that route's search (the caller navigates to results);
 *  - per-row delete -> ConfirmDialog (checklist §10: destructive actions
 *    ask for confirmation; the deletion cannot be undone).
 *
 * Honesty (rule 3 adjacency): `favourites.notice` is ALWAYS visible — saved
 * routes are shortcuts for planning journeys, NOT tickets, and the labelling
 * must never read like "my trips"/orders (the My trips/Tickets tab is a
 * separate surface and stays as-is).
 *
 * Store notices (DEC-007 App. B.4): the section also mounts the
 * `StoreNoticesBanner` over the `useStoreNotices` contract (src/hooks,
 * data-provider workstream) — the visible local-store corruption/write
 * notice. It renders nothing at all when the store is healthy.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmDialog, ListSkeleton, StatusMessage } from '../../components';
import { useStoreNotices } from '../../hooks';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { FavouriteRoute } from '../../types/favourites';

import { JOURNEY_KEYS } from '../journey-results/translationKeys';
import { StoreNoticesBanner } from './StoreNoticesBanner';
import { FAVOURITES_KEYS } from './translationKeys';

export interface FavouritesSectionProps {
  t: TFunction;
  favourites: readonly FavouriteRoute[];
  loading: boolean;
  /** Resolves a station id to its display name (screen-level lookup). */
  stationName: (stationId: string) => string;
  /** Run the route's search (the caller navigates to results). */
  onSelect: (favourite: FavouriteRoute) => void;
  onDelete: (id: string) => void;
  testID?: string;
}

export function FavouritesSection({
  t,
  favourites,
  loading,
  stationName,
  onSelect,
  onDelete,
  testID,
}: FavouritesSectionProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const [pendingDelete, setPendingDelete] = useState<FavouriteRoute | null>(null);
  const { notices } = useStoreNotices();

  const routeText = (favourite: FavouriteRoute): string =>
    t(JOURNEY_KEYS.routeA11y, {
      from: stationName(favourite.fromStationId),
      to: stationName(favourite.toStationId),
    });

  return (
    <View style={[styles.section, { gap: spacing.md }]} testID={testID}>
      <StoreNoticesBanner
        notices={notices}
        testID={testID ? `${testID}-store-notices` : undefined}
      />
      <Text
        accessibilityRole="header"
        style={[type.heading, { color: colors.textPrimary }]}
      >
        {t(FAVOURITES_KEYS.title)}
      </Text>
      <Text
        style={[type.caption, { color: colors.textSecondary }]}
        testID={testID ? `${testID}-notice` : undefined}
      >
        {t(FAVOURITES_KEYS.notice)}
      </Text>
      {loading ? (
        <ListSkeleton rows={2} testID={testID ? `${testID}-loading` : undefined} />
      ) : favourites.length === 0 ? (
        <StatusMessage
          message={t(FAVOURITES_KEYS.emptyBody)}
          testID={testID ? `${testID}-empty` : undefined}
          title={t(FAVOURITES_KEYS.emptyTitle)}
        />
      ) : (
        favourites.map((favourite) => (
          <View
            key={favourite.id}
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
              accessibilityLabel={t(FAVOURITES_KEYS.itemA11y, {
                from: stationName(favourite.fromStationId),
                to: stationName(favourite.toStationId),
              })}
              accessibilityRole="button"
              onPress={() => onSelect(favourite)}
              style={({ pressed }) => [
                styles.rowMain,
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}
              testID={testID ? `${testID}-item-${favourite.id}` : undefined}
            >
              {favourite.label ? (
                <Text style={[type.body, { color: colors.textPrimary }]}>
                  {favourite.label}
                </Text>
              ) : null}
              <Text style={[type.body, { color: colors.textPrimary }]}>
                {`${stationName(favourite.fromStationId)} → ${stationName(
                  favourite.toStationId,
                )}`}
              </Text>
            </Pressable>
            <Button
              accessibilityLabel={t(FAVOURITES_KEYS.deleteItemLabel, {
                route: routeText(favourite),
              })}
              label={t('common.delete')}
              onPress={() => setPendingDelete(favourite)}
              testID={testID ? `${testID}-item-${favourite.id}-delete` : undefined}
              variant="ghost"
            />
          </View>
        ))
      )}
      <ConfirmDialog
        destructive
        message={t(FAVOURITES_KEYS.removeConfirmBody)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const favourite = pendingDelete;
          setPendingDelete(null);
          if (favourite) onDelete(favourite.id);
        }}
        testID={testID ? `${testID}-remove-confirm` : undefined}
        title={t(FAVOURITES_KEYS.removeConfirmTitle)}
        visible={pendingDelete !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
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
