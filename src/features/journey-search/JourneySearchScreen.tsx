/**
 * JourneySearchScreen — the Search tab (`/search`).
 *
 * Composes the form (react-hook-form + Zod) with the rule-6 demo notice and
 * routes to the station picker modal and the results screen. Works WITHOUT
 * sign-in (plan.md 17.2/17.7).
 *
 * Phase 5 additions (plan.md §3.5 / §9 Phase 5) — the saved-items surface:
 *  - recent searches are RECORDED on every successful submit
 *    (`recordSearch`, data-provider contract) and re-run on tap (tap
 *    navigates to results; it does not re-record);
 *  - favourites (route shortcuts, NOT tickets) are listed with delete
 *    confirmation and re-run on tap;
 *  - a tap re-runs the search for the recorded travel date, or for today
 *    when that date has already passed (the results route rejects past
 *    dates at its boundary — see journeySearchFromRouteParams);
 *  - the offline banner (useNetworkStatus) is shown above the form, with a
 *    REAL retry that re-fetches the station directory used for names;
 *  - station-name resolution failures replace the lists with an actionable
 *    error state whose retry really re-fetches (review M1/M2: a "Retry"
 *    button must never just navigate back).
 *
 * Empty policy: the recents section is HIDDEN entirely when there are no
 * recent searches (no clutter on the form); the favourites section shows an
 * honest empty state because saving a route is an action the user may be
 * looking for.
 */

import { useRouter } from 'expo-router';

import {
  DemoDataNotice,
  OfflineBanner,
  RequestErrorState,
  ScreenContainer,
} from '../../components';
import { formatDateInSofia, useTranslation } from '../../i18n';
import {
  useFavouriteRoutes,
  useNetworkStatus,
  useRecentSearches,
  useStationSearch,
} from '../../hooks';
import type { JourneySearch } from '../../types/journey';
import { FavouritesSection, RecentSearchesSection } from '../favourites';

import { JourneySearchForm } from './JourneySearchForm';
import { JOURNEY_SEARCH_KEYS } from './translationKeys';
import { JOURNEY_KEYS } from '../journey-results/translationKeys';
import { systemTodayIso } from './validation';

export interface JourneySearchScreenProps {
  testID?: string;
}

export function JourneySearchScreen({ testID }: JourneySearchScreenProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();

  // Station directory: display names for saved items (rule: names resolve
  // from data, never from the stored ids).
  const {
    stations,
    isLoading: directoryLoading,
    isError: directoryError,
    error: directoryFailure,
    refetch: refetchStations,
  } = useStationSearch('');
  const {
    recents,
    isLoading: recentsLoading,
    recordSearch,
    removeRecent,
    clearAll,
  } = useRecentSearches();
  const {
    favourites,
    isLoading: favouritesLoading,
    removeFavourite,
  } = useFavouriteRoutes();
  const { isOnline } = useNetworkStatus();

  const nameFor = (stationId: string): string => {
    const station = stations.find((candidate) => candidate.id === stationId);
    return station ? station.name : t(JOURNEY_KEYS.unknown);
  };

  const formatTravelDate = (isoDate: string): string =>
    formatDateInSofia(`${isoDate}T12:00:00Z`, locale, 'numeric');

  const openPicker = (field: 'from' | 'to') => {
    router.push({ pathname: '/search/station-picker', params: { field } });
  };

  const runSearch = (search: JourneySearch) => {
    router.push({
      pathname: '/search/results',
      params: {
        from: search.fromStationId,
        to: search.toStationId,
        date: search.date,
      },
    });
  };

  const runSearchToday = (search: JourneySearch) => {
    // A saved/recent route has no travel date of its own once its recorded
    // date has passed; re-running it means "this route, today".
    const today = systemTodayIso();
    runSearch({ ...search, date: search.date < today ? today : search.date });
  };

  const hasSavedItems =
    recents.length > 0 || favourites.length > 0 || recentsLoading || favouritesLoading;
  const savedItemsBlocked = directoryError && hasSavedItems;

  return (
    <ScreenContainer
      scroll
      testID={testID ?? 'screen-search'}
      title={t(JOURNEY_SEARCH_KEYS.title)}
    >
      <OfflineBanner
        onRetry={refetchStations}
        testID="screen-search-offline-banner"
        visible={!isOnline}
      />
      <JourneySearchForm
        onSelectFromStation={() => openPicker('from')}
        onSelectToStation={() => openPicker('to')}
        onSubmit={(search) => {
          // Successful submit = a search worth remembering (on-device only,
          // user-deletable — src/types/favourites.ts privacy note). Bookkeeping
          // must never block navigation: store input validation can reject
          // hostile values (P5-M1) — swallow, don't crash.
          try {
            recordSearch(search);
          } catch {
            /* ignored: the search itself continues below */
          }
          runSearch(search);
        }}
        t={t}
        testID="journey-search-form"
      />
      <DemoDataNotice testID="journey-search-demo-notice" />
      {savedItemsBlocked ? (
        <RequestErrorState
          error={directoryFailure}
          onRetry={refetchStations}
          testID="screen-search-saved-items-error"
        />
      ) : (
        <>
          <RecentSearchesSection
            formatTravelDate={formatTravelDate}
            loading={recentsLoading || directoryLoading}
            onDelete={removeRecent}
            onDeleteAll={clearAll}
            onSelect={(record) => runSearchToday(record.search)}
            recents={recents}
            stationName={nameFor}
            t={t}
            testID="screen-search-recents"
          />
          <FavouritesSection
            favourites={favourites}
            loading={favouritesLoading || directoryLoading}
            onDelete={removeFavourite}
            onSelect={(favourite) =>
              runSearchToday({
                fromStationId: favourite.fromStationId,
                toStationId: favourite.toStationId,
                date: systemTodayIso(),
              })
            }
            stationName={nameFor}
            t={t}
            testID="screen-search-favourites"
          />
        </>
      )}
    </ScreenContainer>
  );
}

export default JourneySearchScreen;
