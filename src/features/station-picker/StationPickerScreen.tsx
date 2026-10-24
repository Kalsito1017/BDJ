/**
 * StationPickerScreen — route-level wiring for the station picker modal
 * (`/search/station-picker`).
 *
 * Data comes from the shared hooks contract (src/hooks, delivered by the
 * data-provider workstream — NOT owned here):
 *   useStationSearch(query) -> { stations, isLoading, isError, error }
 * The query is free text (Cyrillic / Latin / mixed) and an empty query
 * returns the full directory. Nothing here requests location permission.
 *
 * Selecting a station publishes it through the pending-selection store and
 * returns to the form (`router.back()`); the mounted form consumes it.
 */

import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from '../../i18n';
import { useStationSearch } from '../../hooks';
import type { Station } from '../../types/station';

import { setPendingStationSelection, type StationField } from './selection';
import { StationPickerView } from './StationPickerView';

function toStationField(value: unknown): StationField {
  return value === 'to' ? 'to' : 'from';
}

export interface StationPickerScreenProps {
  testID?: string;
}

export function StationPickerScreen({ testID }: StationPickerScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ field?: string }>();
  const field = toStationField(params.field);
  const [query, setQuery] = useState('');

  const { stations, isLoading, isError, error, refetch } = useStationSearch(query);

  const selectStation = (station: Station) => {
    setPendingStationSelection({ field, station });
    router.back();
  };

  return (
    <StationPickerView
      error={isError ? error : null}
      loading={isLoading}
      onClose={() => router.back()}
      onRetry={refetch}
      onSelectStation={selectStation}
      onQueryChange={setQuery}
      query={query}
      stations={stations}
      t={t}
      testID={testID ?? 'screen-station-picker'}
    />
  );
}

export default StationPickerScreen;
