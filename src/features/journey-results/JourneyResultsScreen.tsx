/**
 * JourneyResultsScreen — route-level wiring for `/search/results`.
 *
 * Reads the typed `JourneySearch` from the route params (the deep-link
 * contract: `from`, `to`, `date`), fetches through the shared hooks contract
 * (src/hooks — data-provider workstream, NOT owned here):
 *   useJourneySearch(input | null) -> { result, journeys, isLoading, isError,
 *     error, refetch, isFetching, dataUpdatedAt }
 *   useStationSearch('')          -> full demo directory (name resolution)
 *
 * Honesty rules: `dataUpdatedAt` renders as "results loaded at HH:mm" (query
 * cache freshness — never data provenance); every journey renders its own
 * provenance badge and the demo notice is always visible (rule 6). Journey
 * search works WITHOUT sign-in (plan.md 17.2).
 */

import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { RequestErrorState } from '../../components';
import { formatDateInSofia, formatTimeInSofia, useTranslation } from '../../i18n';
import { useJourneySearch, useStationSearch } from '../../hooks';
import type { JourneySearch } from '../../types/journey';
import type { Station } from '../../types/station';

import { JourneyResultsView } from './JourneyResultsView';
import { JOURNEY_KEYS } from './translationKeys';
import { journeySearchFromRouteParams } from '../journey-search/validation';

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

export interface JourneyResultsScreenProps {
  testID?: string;
}

export function JourneyResultsScreen({ testID }: JourneyResultsScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; to?: string; date?: string }>();

  const fromStationId = firstParam(params.from);
  const toStationId = firstParam(params.to);
  const date = firstParam(params.date);
  // Route-boundary validation (review L1): same rules as the search form —
  // computed in a memo so the wall-clock read stays out of the render path.
  const input: JourneySearch | null = useMemo(
    () =>
      journeySearchFromRouteParams({
        from: fromStationId,
        to: toStationId,
        date,
      }),
    [fromStationId, toStationId, date],
  );

  const { journeys, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } =
    useJourneySearch(input);
  const { stations } = useStationSearch('');
  const nameFor = useMemo(
    () => stationNameLookup(stations, t(JOURNEY_KEYS.unknown)),
    [stations, t],
  );

  const fetchedAtTime =
    typeof dataUpdatedAt === 'number' && dataUpdatedAt > 0
      ? formatTimeInSofia(new Date(dataUpdatedAt).toISOString())
      : null;

  if (!input) {
    // Broken/missing or out-of-window route params: not a provider failure —
    // say so. There is nothing to retry (review M2), so no misleading "Retry"
    // button; the stack back action returns to a working search.
    return (
      <RequestErrorState
        error={{ code: 'not_found', message: 'invalid search params' }}
        testID="screen-search-results-error"
      />
    );
  }

  return (
    <JourneyResultsView
      dateLabel={formatDateInSofia(`${input.date}T12:00:00Z`, undefined, 'numeric')}
      error={isError ? error : null}
      fetchedAtTime={fetchedAtTime}
      fromName={nameFor(input.fromStationId)}
      journeys={journeys}
      loading={isLoading}
      onChangeSearch={() => router.back()}
      onRefresh={() => void refetch()}
      onRetry={() => void refetch()}
      onSelectJourney={(journey) =>
        router.push({ pathname: '/journey/[id]', params: { id: journey.id } })
      }
      refreshing={isFetching}
      t={t}
      testID={testID ?? 'screen-search-results'}
      toName={nameFor(input.toStationId)}
    />
  );
}

export default JourneyResultsScreen;
