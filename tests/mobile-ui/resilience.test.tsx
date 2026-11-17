/**
 * Resilience polish — offline banner and "may be out of date" hint
 * (plan.md §9 Phase 5; addbeforerelease.txt §7 offline/stale states).
 *
 * Covers:
 *  - the offline banner per `useNetworkStatus().isOnline` on the Search and
 *    Results screens, with a REAL retry that calls the query refetch (review
 *    M1/M2: a "Retry" button must never just navigate back);
 *  - the stale hint per `useJourneySearch().isStale` on the results list —
 *    informational copy only, never provenance labelling (rule 6);
 *  - the shared OfflineBanner primitive's own states.
 *
 * The data-provider hook contract (src/hooks) is mocked at the contract
 * boundary; everything else is the real UI. Expectations are composed
 * through the REAL translate function (unmerged keys render as their key —
 * see i18n-integrity.test.tsx).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { OfflineBanner } from '../../src/components';
import { JourneyResultsScreen } from '../../src/features/journey-results/JourneyResultsScreen';
import { JourneyResultsView } from '../../src/features/journey-results/JourneyResultsView';
import { JOURNEY_RESULTS_KEYS } from '../../src/features/journey-results/translationKeys';
import { JourneySearchScreen } from '../../src/features/journey-search/JourneySearchScreen';
import {
  useFavouriteRoutes,
  useJourneySearch,
  useNetworkStatus,
  useRecentSearches,
  useStationSearch,
  useStoreNotices,
} from '../../src/hooks';
import { addDaysIso, systemTodayIso } from '../../src/features/journey-search/validation';
import { setI18nLocale, translate } from '../../src/i18n';
import type { JourneySearchResult, TrainSegment } from '../../src/types/journey';
import type { Station } from '../../src/types/station';

jest.setTimeout(20000);

// A hard-coded travel date expires: `2026-11-01` became "in the past" on
// 2026-11-02, so the results screen correctly treated every mocked deep link
// as invalid and rendered its error state (DEC-029). Compute a date the app's
// own rules still accept, inside the factory to stay hoisting-safe.
const VALID_DATE = addDaysIso(systemTodayIso(), 7);

jest.mock('expo-router', () => {
  const { addDaysIso: addDays, systemTodayIso: today } = jest.requireActual<
    typeof import('../../src/features/journey-search/validation')
  >('../../src/features/journey-search/validation');
  const validDate = addDays(today(), 7);
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({ from: 'sofia', to: 'varna', date: validDate }),
  };
});

jest.mock('../../src/hooks', () => ({
  useFavouriteRoutes: jest.fn(),
  useJourneySearch: jest.fn(),
  useNetworkStatus: jest.fn(),
  useRecentSearches: jest.fn(),
  useStationSearch: jest.fn(),
  useStoreNotices: jest.fn(),
}));

const mockedUseJourneySearch = jest.mocked(useJourneySearch);
const mockedUseNetworkStatus = jest.mocked(useNetworkStatus);
const mockedUseStationSearch = jest.mocked(useStationSearch);
const mockedUseRecentSearches = jest.mocked(useRecentSearches);
const mockedUseFavouriteRoutes = jest.mocked(useFavouriteRoutes);
const mockedUseStoreNotices = jest.mocked(useStoreNotices);

const refetch = jest.fn();
const refetchStations = jest.fn();

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

function station(id: string, name: string): Station {
  return {
    id,
    name,
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  };
}

function train(): TrainSegment {
  return {
    kind: 'train',
    fromStationId: 'sofia',
    toStationId: 'varna',
    departureTime: '08:00',
    arrivalTime: '12:30',
  };
}

const DEMO_RESULT: JourneySearchResult = {
  search: { fromStationId: 'sofia', toStationId: 'varna', date: VALID_DATE },
  journeys: [],
  fetchedAt: '2026-10-24T08:00:00.000Z',
  provenance: { kind: 'demo', fetchedAt: '2026-10-24T08:00:00.000Z' },
};

function mockHooks(options: { isOnline?: boolean; isStale?: boolean } = {}): void {
  mockedUseStationSearch.mockReturnValue({
    stations: [station('sofia', 'Демо Централна гара София')],
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchStations,
  });
  // The store-notices banner is exercised in store-notices.test.tsx; here the
  // store is healthy, so the hook contract reports no notices.
  mockedUseStoreNotices.mockReturnValue({ notices: [] });
  mockedUseRecentSearches.mockReturnValue({
    recents: [],
    isLoading: false,
    recordSearch: jest.fn(),
    removeRecent: jest.fn(),
    clearAll: jest.fn(),
    notices: [],
  });
  mockedUseFavouriteRoutes.mockReturnValue({
    favourites: [],
    isLoading: false,
    addFavourite: jest.fn(),
    removeFavourite: jest.fn(),
    notices: [],
  });
  mockedUseNetworkStatus.mockReturnValue({
    isOnline: options.isOnline ?? true,
    clearManualStatus: jest.fn(),
  });
  mockedUseJourneySearch.mockReturnValue({
    result: DEMO_RESULT,
    journeys: DEMO_RESULT.journeys,
    isLoading: false,
    isError: false,
    error: null,
    refetch,
    isFetching: false,
    dataUpdatedAt: 0,
    isStale: options.isStale ?? false,
  });
}

beforeAll(() => {
  setI18nLocale('en');
});

describe('OfflineBanner primitive', () => {
  it('renders nothing while connected', async () => {
    await render(<OfflineBanner testID="banner" visible={false} />);
    expect(screen.queryByTestId('banner')).toBeNull();
  });

  it('shows the offline copy and a real retry while disconnected', async () => {
    const onRetry = jest.fn();
    await render(<OfflineBanner onRetry={onRetry} testID="banner" visible />);

    expect(screen.getByText(t('states.offline'))).toBeTruthy();
    expect(screen.getByText(t('errors.offline'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('banner-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers no retry button when the caller has nothing to retry', async () => {
    await render(<OfflineBanner testID="banner" visible />);
    expect(screen.queryByTestId('banner-retry')).toBeNull();
  });
});

describe('offline awareness on the screens', () => {
  it('shows the banner on the search screen only while offline', async () => {
    mockHooks({ isOnline: false });
    await render(<JourneySearchScreen testID="screen-search" />);
    expect(screen.getByTestId('screen-search-offline-banner')).toBeTruthy();

    mockHooks({ isOnline: true });
    await render(<JourneySearchScreen testID="screen-search" />);
    expect(screen.queryByTestId('screen-search-offline-banner')).toBeNull();
  });

  it('retries the station lookup for real from the search banner', async () => {
    mockHooks({ isOnline: false });
    await render(<JourneySearchScreen testID="screen-search" />);

    await fireEvent.press(screen.getByTestId('screen-search-offline-banner-retry'));
    expect(refetchStations).toHaveBeenCalledTimes(1);
  });

  it('shows the banner on the results screen with a real refetch retry', async () => {
    mockHooks({ isOnline: false });
    await render(<JourneyResultsScreen testID="screen-search-results" />);

    expect(screen.getByTestId('screen-search-results-offline-banner')).toBeTruthy();
    await fireEvent.press(
      screen.getByTestId('screen-search-results-offline-banner-retry'),
    );
    expect(refetch).toHaveBeenCalledTimes(1);

    mockHooks({ isOnline: true });
    await render(<JourneyResultsScreen testID="screen-search-results" />);
    expect(screen.queryByTestId('screen-search-results-offline-banner')).toBeNull();
  });
});

describe('stale-data hint on the results', () => {
  it('renders the "may be out of date" hint when the query is stale', async () => {
    await render(
      <JourneyResultsView
        dateLabel="24/10/2026"
        error={null}
        fromName="Демо Централна гара София"
        journeys={[]}
        loading={false}
        stale
        t={t}
        testID="results"
        toName="Демо гара Варна"
      />,
    );

    expect(screen.getByTestId('results-stale-hint')).toBeTruthy();
    expect(screen.getByText(t(JOURNEY_RESULTS_KEYS.staleHint))).toBeTruthy();
  });

  it('shows no hint while the query is fresh', async () => {
    await render(
      <JourneyResultsView
        dateLabel="24/10/2026"
        error={null}
        fromName="Демо Централна гара София"
        journeys={[]}
        loading={false}
        stale={false}
        t={t}
        testID="results"
        toName="Демо гара Варна"
      />,
    );

    expect(screen.queryByTestId('results-stale-hint')).toBeNull();
    expect(screen.queryByText(t(JOURNEY_RESULTS_KEYS.staleHint))).toBeNull();
  });

  it('follows the useJourneySearch isStale flag on the results screen', async () => {
    mockHooks({ isStale: true });
    await render(<JourneyResultsScreen testID="screen-search-results" />);
    expect(screen.getByTestId('screen-search-results-stale-hint')).toBeTruthy();

    mockHooks({ isStale: false });
    await render(<JourneyResultsScreen testID="screen-search-results" />);
    expect(screen.queryByTestId('screen-search-results-stale-hint')).toBeNull();
  });

  it('never renders the hint as provenance (rule 6)', async () => {
    mockHooks({ isStale: true });
    await render(<JourneyResultsScreen testID="screen-search-results" />);

    // The hint is plain freshness copy; the reserved provenance category
    // label may not appear (nothing here is real-time or cached-stale data).
    expect(screen.queryByText(t('provenance.cached_stale'))).toBeNull();
    expect(screen.queryByText(t('provenance.real_time'))).toBeNull();
    expect(screen.getByText(t('provenance.demo'))).toBeTruthy();
  });
});

describe('demo labelling stays intact with resilience copy', () => {
  it('keeps the demo notice visible next to the stale hint', async () => {
    mockHooks({ isStale: true });
    await render(<JourneyResultsScreen testID="screen-search-results" />);

    expect(screen.getByTestId('screen-search-results-stale-hint')).toBeTruthy();
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });
});

// Keeps the `train` fixture referenced for future journey-populated cases.
void train;
