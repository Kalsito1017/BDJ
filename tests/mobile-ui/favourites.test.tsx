/**
 * Favourites — behaviour tests (plan.md §3.5 / §9 Phase 5).
 *
 * Covers the saved-routes surface end to end:
 *   "Save this route" (idempotent, saved state) on results and details ->
 *   re-run on tap -> delete behind ConfirmDialog (checklist §10), plus the
 *   loading / empty states and the always-visible honesty notice (saved
 *   routes are route shortcuts, NOT tickets — rule 3 adjacency).
 *
 * The data-provider hook contract (src/hooks — `useFavouriteRoutes`) is
 * mocked at the contract boundary; everything else is the real UI.
 * Expectations are composed through the REAL translate function so they
 * stay valid before and after the lead merges the new `favourites.*` keys
 * (i18n-integrity.test.tsx).
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { JourneyDetailsScreen } from '../../src/features/journey-details/JourneyDetailsScreen';
import { JourneyResultsScreen } from '../../src/features/journey-results/JourneyResultsScreen';
import { FavouritesSection } from '../../src/features/favourites/FavouritesSection';
import { SaveRouteControl } from '../../src/features/favourites/SaveRouteControl';
import { addDaysIso, systemTodayIso } from '../../src/features/journey-search/validation';
import {
  useFavouriteRoutes,
  useJourney,
  useJourneySearch,
  useNetworkStatus,
  useRecentSearches,
  useStationSearch,
  useStoreNotices,
} from '../../src/hooks';
import { setI18nLocale, translate } from '../../src/i18n';
import type { FavouriteRoute } from '../../src/types/favourites';
import type { Journey, JourneySearchResult, TrainSegment } from '../../src/types/journey';
import type { Station } from '../../src/types/station';

// ConfirmDialog flows use async RNTL updates (states.test.tsx precedent).
jest.setTimeout(20000);

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../src/hooks', () => ({
  useFavouriteRoutes: jest.fn(),
  useJourney: jest.fn(),
  useJourneySearch: jest.fn(),
  useNetworkStatus: jest.fn(),
  useRecentSearches: jest.fn(),
  useStationSearch: jest.fn(),
  useStoreNotices: jest.fn(),
}));

const mockedUseJourney = jest.mocked(useJourney);
const mockedUseJourneySearch = jest.mocked(useJourneySearch);
const mockedUseStationSearch = jest.mocked(useStationSearch);
const mockedUseFavouriteRoutes = jest.mocked(useFavouriteRoutes);
const mockedUseRecentSearches = jest.mocked(useRecentSearches);
const mockedUseNetworkStatus = jest.mocked(useNetworkStatus);
const mockedUseStoreNotices = jest.mocked(useStoreNotices);

const addFavourite = jest.fn();
const removeFavourite = jest.fn();

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

const SOFIA = station('sofia', 'Демо Централна гара София');
const VARNA = station('varna', 'Демо гара Варна');

/** Inside the accepted travel-date window (DEC-022 route-boundary rules). */
const VALID_DATE = addDaysIso(systemTodayIso(), 7);

function favourite(id: string): FavouriteRoute {
  return {
    id,
    fromStationId: 'sofia',
    toStationId: 'varna',
    createdAt: '2026-10-24T08:00:00.000Z',
    sortOrder: 0,
  };
}

function train(overrides: Partial<TrainSegment> = {}): TrainSegment {
  return {
    kind: 'train',
    fromStationId: 'sofia',
    toStationId: 'varna',
    departureTime: '08:00',
    arrivalTime: '12:30',
    ...overrides,
  };
}

const DEMO_JOURNEY: Journey = {
  id: 'j1',
  legs: [train()],
  segments: [train()],
  durationMinutes: 270,
  provenance: { kind: 'demo', fetchedAt: '2026-10-24T06:00:00.000Z' },
};

function mockLocalData(
  options: {
    favourites?: readonly FavouriteRoute[];
    favouritesLoading?: boolean;
  } = {},
): void {
  mockedUseFavouriteRoutes.mockReturnValue({
    favourites: options.favourites ?? [],
    isLoading: options.favouritesLoading ?? false,
    addFavourite,
    removeFavourite,
    notices: [],
  });
  mockedUseRecentSearches.mockReturnValue({
    recents: [],
    isLoading: false,
    recordSearch: jest.fn(),
    removeRecent: jest.fn(),
    clearAll: jest.fn(),
    notices: [],
  });
  mockedUseNetworkStatus.mockReturnValue({
    isOnline: true,
    clearManualStatus: jest.fn(),
  });
}

function mockJourneyHooks(): void {
  const emptyResult: JourneySearchResult = {
    search: { fromStationId: 'sofia', toStationId: 'varna', date: VALID_DATE },
    journeys: [],
    fetchedAt: '2026-10-24T08:00:00.000Z',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T08:00:00.000Z' },
  };
  mockedUseJourneySearch.mockReturnValue({
    result: emptyResult,
    journeys: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isFetching: false,
    dataUpdatedAt: 0,
    isStale: false,
  });
  mockedUseJourney.mockReturnValue({
    journey: DEMO_JOURNEY,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockedUseStationSearch.mockReturnValue({
    stations: [SOFIA, VARNA],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(() => {
  // The store-notices banner is exercised in store-notices.test.tsx; these
  // tests run with a healthy store, so the hook contract reports no notices.
  mockedUseStoreNotices.mockReturnValue({ notices: [] });
});

describe('SaveRouteControl', () => {
  it('saves the route once and states that it is not a ticket', async () => {
    mockLocalData();
    await render(
      <SaveRouteControl fromStationId="sofia" toStationId="varna" testID="save-route" />,
    );

    expect(screen.getByTestId('save-route-save')).toBeTruthy();
    expect(screen.getByText(t('favourites.save_cta'))).toBeTruthy();
    expect(screen.getByTestId('save-route-notice')).toBeTruthy();
    expect(screen.getByText(t('favourites.notice'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('save-route-save'));
    expect(addFavourite).toHaveBeenCalledTimes(1);
    expect(addFavourite).toHaveBeenCalledWith({
      fromStationId: 'sofia',
      toStationId: 'varna',
    });
  });

  it('shows the saved state for an already-saved route (idempotent, no duplicate)', async () => {
    mockLocalData({ favourites: [favourite('f1')] });
    await render(
      <SaveRouteControl fromStationId="sofia" toStationId="varna" testID="save-route" />,
    );

    expect(screen.getByTestId('save-route-saved')).toBeTruthy();
    expect(screen.getByText(t('favourites.saved_label'))).toBeTruthy();
    expect(screen.queryByTestId('save-route-save')).toBeNull();
    expect(addFavourite).not.toHaveBeenCalled();
  });

  it('ignores favourites for other routes', async () => {
    mockLocalData({
      favourites: [{ ...favourite('f1'), toStationId: 'plovdiv' }],
    });
    await render(
      <SaveRouteControl fromStationId="sofia" toStationId="varna" testID="save-route" />,
    );

    expect(screen.queryByTestId('save-route-saved')).toBeNull();
    expect(screen.getByTestId('save-route-save')).toBeTruthy();
  });

  it('removes a saved route only after explicit confirmation', async () => {
    mockLocalData({ favourites: [favourite('f1')] });
    await render(
      <SaveRouteControl fromStationId="sofia" toStationId="varna" testID="save-route" />,
    );

    await fireEvent.press(screen.getByTestId('save-route-remove'));
    expect(screen.getByTestId('save-route-remove-confirm')).toBeTruthy();
    expect(screen.getByText(t('favourites.remove_confirm_title'))).toBeTruthy();
    expect(screen.getByText(t('favourites.remove_confirm_body'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('save-route-remove-confirm-cancel'));
    expect(removeFavourite).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('save-route-remove'));
    await fireEvent.press(screen.getByTestId('save-route-remove-confirm-confirm'));
    expect(removeFavourite).toHaveBeenCalledTimes(1);
    expect(removeFavourite).toHaveBeenCalledWith('f1');
  });

  it('offers no interaction while the saved list is still loading', async () => {
    mockLocalData({ favouritesLoading: true });
    await render(
      <SaveRouteControl fromStationId="sofia" toStationId="varna" testID="save-route" />,
    );

    expect(screen.queryByTestId('save-route-save')).toBeNull();
    expect(screen.queryByTestId('save-route-saved')).toBeNull();
    expect(addFavourite).not.toHaveBeenCalled();
  });
});

describe('FavouritesSection', () => {
  it('shows an honest empty state with the not-a-ticket notice', async () => {
    await render(
      <FavouritesSection
        favourites={[]}
        loading={false}
        onDelete={removeFavourite}
        onSelect={jest.fn()}
        stationName={(id) => (id === 'sofia' ? SOFIA.name : VARNA.name)}
        t={t}
        testID="favourites"
      />,
    );

    expect(screen.getByTestId('favourites-empty')).toBeTruthy();
    expect(screen.getByText(t('favourites.empty_title'))).toBeTruthy();
    expect(screen.getByText(t('favourites.empty_body'))).toBeTruthy();
    expect(screen.getByText(t('favourites.notice'))).toBeTruthy();
  });

  it('runs the route search on tap', async () => {
    const onSelect = jest.fn();
    await render(
      <FavouritesSection
        favourites={[favourite('f1')]}
        loading={false}
        onDelete={removeFavourite}
        onSelect={onSelect}
        stationName={(id) => (id === 'sofia' ? SOFIA.name : VARNA.name)}
        t={t}
        testID="favourites"
      />,
    );

    expect(screen.getByText(`${SOFIA.name} → ${VARNA.name}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('favourites-item-f1'));
    expect(onSelect).toHaveBeenCalledWith(favourite('f1'));
  });

  it('deletes a saved route only after explicit confirmation', async () => {
    const onDelete = jest.fn();
    await render(
      <FavouritesSection
        favourites={[favourite('f1')]}
        loading={false}
        onDelete={onDelete}
        onSelect={jest.fn()}
        stationName={(id) => (id === 'sofia' ? SOFIA.name : VARNA.name)}
        t={t}
        testID="favourites"
      />,
    );

    await fireEvent.press(screen.getByTestId('favourites-item-f1-delete'));
    expect(screen.getByTestId('favourites-remove-confirm')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('favourites-remove-confirm-cancel'));
    expect(onDelete).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('favourites-item-f1-delete'));
    await fireEvent.press(screen.getByTestId('favourites-remove-confirm-confirm'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('f1');
  });

  it('shows a loading state while the saved list is loading', async () => {
    await render(
      <FavouritesSection
        favourites={[]}
        loading
        onDelete={removeFavourite}
        onSelect={jest.fn()}
        stationName={() => SOFIA.name}
        t={t}
        testID="favourites"
      />,
    );

    expect(screen.getByTestId('favourites-loading')).toBeTruthy();
    expect(screen.queryByTestId('favourites-empty')).toBeNull();
  });
});

describe('save action wiring on the journey screens', () => {
  it('offers "Save this route" on the journey results screen', async () => {
    mockLocalData();
    mockJourneyHooks();
    mockParams = {
      from: 'sofia',
      to: 'varna',
      date: VALID_DATE,
    };

    await render(<JourneyResultsScreen testID="screen-search-results" />);

    expect(screen.getByTestId('screen-search-results-save-route-save')).toBeTruthy();
  });

  it('offers "Save this route" on the journey details screen using the journey endpoints', async () => {
    mockLocalData();
    mockJourneyHooks();
    mockParams = { id: 'j1' };

    await render(<JourneyDetailsScreen testID="screen-journey-details" />);

    expect(screen.getByTestId('screen-journey-details-save-route-save')).toBeTruthy();
    expect(addFavourite).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('screen-journey-details-save-route-save'));
    expect(addFavourite).toHaveBeenCalledWith({
      fromStationId: 'sofia',
      toStationId: 'varna',
    });
  });
});

describe('favourites honesty (rule 3 adjacency)', () => {
  it('never describes saved routes as trips, orders or tickets', async () => {
    mockLocalData({ favourites: [favourite('f1')] });
    await render(
      <SaveRouteControl fromStationId="sofia" toStationId="varna" testID="save-route" />,
    );

    await act(async () => {});
    expect(screen.queryByRole('button', { name: /buy|purchase|pay/i })).toBeNull();
  });
});
