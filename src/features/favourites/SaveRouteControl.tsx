/**
 * SaveRouteControl — "Save this route" on journey results and journey
 * details (plan.md §3.5 / §9 Phase 5).
 *
 * Smart, self-contained control: it binds the shared hooks contract
 * (`useFavouriteRoutes` — src/hooks, data-provider workstream) and the
 * shared ConfirmDialog. Screens drop it in with just the route endpoints.
 *
 * Behaviour:
 *  - not saved yet -> "Save this route"; saving calls `addFavourite` and is
 *    IDEMPOTENT — if the same from/to pair is already saved the control
 *    renders the saved state and never creates a duplicate;
 *  - already saved -> the "Saved" state plus a remove action whose
 *    destructive result is confirmed first (checklist §10);
 *  - while the saved list is hydrating (`isLoading`) the control renders
 *    nothing at all: no interaction is possible and no state is claimed;
 *  - `favourites.notice` is always visible — a saved route is a shortcut
 *    for planning journeys, NOT a ticket (rule 3 adjacency).
 *
 * Honesty (rule 6): nothing here claims availability of anything — it only
 * saves a from/to pair on this device.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmDialog } from '../../components';
import { useFavouriteRoutes } from '../../hooks';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme';

import { FAVOURITES_KEYS } from './translationKeys';

export interface SaveRouteControlProps {
  fromStationId: string;
  toStationId: string;
  testID?: string;
}

export function SaveRouteControl({
  fromStationId,
  toStationId,
  testID,
}: SaveRouteControlProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;
  const { t } = useTranslation();
  const { favourites, isLoading, addFavourite, removeFavourite } = useFavouriteRoutes();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const saved =
    favourites.find(
      (favourite) =>
        favourite.fromStationId === fromStationId &&
        favourite.toStationId === toStationId,
    ) ?? null;

  return (
    <View style={[styles.control, { gap: spacing.sm }]} testID={testID}>
      {isLoading ? null : saved ? (
        <View style={[styles.savedRow, { gap: spacing.sm }]}>
          <Text
            accessibilityRole="text"
            style={[type.label, { color: colors.textSecondary }]}
            testID={testID ? `${testID}-saved` : undefined}
          >
            {t(FAVOURITES_KEYS.savedLabel)}
          </Text>
          <Button
            label={t(FAVOURITES_KEYS.removeCta)}
            onPress={() => setConfirmRemove(true)}
            testID={testID ? `${testID}-remove` : undefined}
            variant="ghost"
          />
        </View>
      ) : (
        <Button
          label={t(FAVOURITES_KEYS.saveCta)}
          onPress={() => {
            // Idempotent: a save that raced another entry for the same route
            // must not create a duplicate.
            if (saved) return;
            try {
              addFavourite({ fromStationId, toStationId });
            } catch {
              // Defence (P5-M1): store input validation rejects hostile ids
              // from deep links (LocalStoreInputError). The route boundary
              // filters those first — never let a press handler crash.
            }
          }}
          testID={testID ? `${testID}-save` : undefined}
          variant="secondary"
        />
      )}
      <Text
        style={[type.caption, { color: colors.textSecondary }]}
        testID={testID ? `${testID}-notice` : undefined}
      >
        {t(FAVOURITES_KEYS.notice)}
      </Text>
      <ConfirmDialog
        destructive
        message={t(FAVOURITES_KEYS.removeConfirmBody)}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          if (saved) removeFavourite(saved.id);
        }}
        testID={testID ? `${testID}-remove-confirm` : undefined}
        title={t(FAVOURITES_KEYS.removeConfirmTitle)}
        visible={confirmRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    alignSelf: 'stretch',
  },
  savedRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
