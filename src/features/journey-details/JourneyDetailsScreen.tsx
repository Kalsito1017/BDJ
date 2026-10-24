/**
 * JourneyDetailsScreen — route-level wiring for `/journey/[id]`.
 *
 * Fetches through the shared hooks contract (src/hooks — data-provider
 * workstream, NOT owned here):
 *   useJourney(journeyId)  -> { journey, isLoading, isError, error }
 *   useStationSearch('')   -> full demo directory (station-name resolution
 *                             for the timeline's leg endpoints)
 *
 * The journey id is an opaque route param (DEC-006): never parsed or given
 * invented meaning. Works WITHOUT sign-in (plan.md 17.2).
 */

import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from '../../i18n';
import { useJourney, useStationSearch } from '../../hooks';
import type { Station } from '../../types/station';

import { JourneyDetailsView } from './JourneyDetailsView';
import { JOURNEY_KEYS } from '../journey-results/translationKeys';

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function stationNameLookup(
  stations: readonly Station[],
  unknownLabel: string,
): (stationId: string) => string {
  const byId = new Map(stations.map((station) => [station.id, station.name]));
  return (stationId) => byId.get(stationId) ?? unknownLabel;
}

export interface JourneyDetailsScreenProps {
  testID?: string;
}

export function JourneyDetailsScreen({ testID }: JourneyDetailsScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const journeyId = firstParam(params.id) ?? '';

  const { journey, isLoading, isError, error, refetch } = useJourney(journeyId);
  const { stations } = useStationSearch('');
  const nameFor = useMemo(
    () => stationNameLookup(stations, t(JOURNEY_KEYS.unknown)),
    [stations, t],
  );

  return (
    <JourneyDetailsView
      error={isError ? error : null}
      journey={journey ?? null}
      loading={isLoading}
      onBack={() => router.back()}
      onRetry={refetch}
      stationName={nameFor}
      t={t}
      testID={testID ?? 'screen-journey-details'}
    />
  );
}

export default JourneyDetailsScreen;
