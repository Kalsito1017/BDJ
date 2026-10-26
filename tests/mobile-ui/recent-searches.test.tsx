/**
 * Recent searches — behaviour tests (plan.md §3.5 / §9 Phase 5).
 *
 * Covers the full recents contract on the Search screen:
 *   record on successful submit -> re-run on tap -> per-item delete ->
 *   "clear all", both deletions behind ConfirmDialog (checklist §10), plus
 *   the empty (hidden) / loading / error+retry states (checklist §7).
 *
 * The data-provider hook contract (src/hooks — `useRecentSearches` et al.)
 * is mocked at the contract boundary so these tests exercise the real
 * screen wiring. Route navigation is mocked; the form is filled through the
 * real pending-selection store and the real validation (system "today", so
 * no injected clock is needed).
 *
 * Expectations are composed through the REAL translate function, so they
 * stay valid before and after the lead merges the new `recents.*` keys
 * (unmerged keys render as their key — see i18n-integrity.test.tsx).
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SearchScreen from '../../src/app/(tabs)/search';
import { JourneySearchScreen } from '../../src/features/journey-search/JourneySearchScreen';
import { addDaysIso, systemTodayIso } from '../../src/features/journey-search/validation';
import {
  setPendingStationSelection,
  resetPendingStationSelection,
} from '../../src/features/station-picker/selection';
import {
  useFavouriteRoutes,
  useNetworkStatus,
  useRecentSearches,
  useStationSearch,
  useStoreNotices,
} from '../../src/hooks';
import { formatDateInSofia, setI18nLocale, translate } from '../../src/i18n';
import type { FavouriteRoute, RecentSearchRecord } from '../../src/types/favourites';
import type { Station } from '../../src/types/station';

// ConfirmDialog flows use async RNTL updates (states.test.tsx precedent).
jest.setTimeout(20000);

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('../../src/hooks', () => ({
  useFavouriteRoutes: jest.fn(),
  useNetworkStatus: jest.fn(),
  useRecentSearches: jest.fn(),
  useStationSearch: jest.fn(),
  useStoreNotices: jest.fn(),
}));

const mockedUseStationSearch = jest.mocked(useStationSearch);
const mockedUseRecentSearches = jest.mocked(useRecentSearches);
const mockedUseFavouriteRoutes = jest.mocked(useFavouriteRoutes);
const mockedUseNetworkStatus = jest.mocked(useNetworkStatus);
const mockedUseStoreNotices = jest.mocked(useStoreNotices);

const recordSearch = jest.fn();
const removeRecent = jest.fn();
const clearAll = jest.fn();
const removeFavourite = jest.fn();
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

const SOFIA = station('sofia', 'Демо Централна гара София');
const VARNA = station('varna', 'Демо гара Варна');
const DIRECTORY: readonly Station[] = [SOFIA, VARNA];

const FUTURE_DATE = addDaysIso(systemTodayIso(), 5);
const PAST_DATE = '2024-03-01';

function recent(id: string, date: string): RecentSearchRecord {
  return {
    id,
    search: { fromStationId: 'sofia', toStationId: 'varna', date },
    searchedAt: '2026-10-24T08:00:00.000Z',
  };
}

interface LocalDataOptions {
  recents?: readonly RecentSearchRecord[];
  recentsLoading?: boolean;
  favourites?: readonly FavouriteRoute[];
  favouritesLoading?: boolean;
  isOnline?: boolean;
  directoryError?: boolean;
}

function mockScreen(options: LocalDataOptions = {}): void {
  mockedUseStationSearch.mockReturnValue({
    stations: options.directoryError ? [] : DIRECTORY,
    isLoading: false,
    isError: options.directoryError === true,
    error: options.directoryError
      ? { code: 'network', message: 'synthetic', retryable: true, occurredAt: '' }
      : null,
    refetch: refetchStations,
  });
  mockedUseRecentSearches.mockReturnValue({
    recents: options.recents ?? [],
    isLoading: options.recentsLoading ?? false,
    recordSearch,
    removeRecent,
    clearAll,
    notices: [],
  });
  mockedUseFavouriteRoutes.mockReturnValue({
    favourites: options.favourites ?? [],
    isLoading: options.favouritesLoading ?? false,
    addFavourite: jest.fn(),
    removeFavourite,
    notices: [],
  });
  mockedUseNetworkStatus.mockReturnValue({
    isOnline: options.isOnline ?? true,
    clearManualStatus: jest.fn(),
  });
}

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(() => {
  resetPendingStationSelection();
  // The store-notices banner is exercised in store-notices.test.tsx; these
  // tests run with a healthy store, so the hook contract reports no notices.
  mockedUseStoreNotices.mockReturnValue({ notices: [] });
});

describe('recording recent searches', () => {
  it('records the search on a successful submit and opens the results', async () => {
    mockScreen();
    await render(<JourneySearchScreen testID="screen-search" />);

    await act(async () => {
      setPendingStationSelection({ field: 'from', station: SOFIA });
    });
    await act(async () => {
      setPendingStationSelection({ field: 'to', station: VARNA });
    });
    await fireEvent.changeText(
      screen.getByTestId('journey-search-form-date'),
      FUTURE_DATE,
    );
    await fireEvent.press(screen.getByTestId('journey-search-form-submit'));

    expect(recordSearch).toHaveBeenCalledWith({
      fromStationId: 'sofia',
      toStationId: 'varna',
      date: FUTURE_DATE,
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search/results',
      params: { from: 'sofia', to: 'varna', date: FUTURE_DATE },
    });
  });

  it('records nothing when the form rejects the submit', async () => {
    mockScreen();
    await render(<JourneySearchScreen testID="screen-search" />);

    // Empty submit: validation fails before onSubmit (and before recordSearch).
    await fireEvent.press(screen.getByTestId('journey-search-form-submit'));

    expect(recordSearch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('re-running a recent search', () => {
  it('re-runs the recorded search on tap without re-recording it', async () => {
    mockScreen({ recents: [recent('r1', FUTURE_DATE)] });
    await render(<JourneySearchScreen testID="screen-search" />);

    await fireEvent.press(screen.getByTestId('screen-search-recents-item-r1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search/results',
      params: { from: 'sofia', to: 'varna', date: FUTURE_DATE },
    });
    expect(recordSearch).not.toHaveBeenCalled();
  });

  it('re-runs it for today when the recorded travel date has passed', async () => {
    mockScreen({ recents: [recent('r1', PAST_DATE)] });
    await render(<JourneySearchScreen testID="screen-search" />);

    await fireEvent.press(screen.getByTestId('screen-search-recents-item-r1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search/results',
      params: { from: 'sofia', to: 'varna', date: systemTodayIso() },
    });
  });

  it('shows the route via station names and the localized travel date', async () => {
    mockScreen({ recents: [recent('r1', FUTURE_DATE)] });
    await render(<JourneySearchScreen testID="screen-search" />);

    expect(screen.getByText(`${SOFIA.name} → ${VARNA.name}`)).toBeTruthy();
    expect(
      screen.getByText(formatDateInSofia(`${FUTURE_DATE}T12:00:00Z`, 'en', 'numeric')),
    ).toBeTruthy();
  });
});

describe('deleting recent searches (checklist §10)', () => {
  it('removes one search only after explicit confirmation', async () => {
    mockScreen({ recents: [recent('r1', FUTURE_DATE)] });
    await render(<JourneySearchScreen testID="screen-search" />);

    await fireEvent.press(screen.getByTestId('screen-search-recents-item-r1-delete'));
    expect(screen.getByTestId('screen-search-recents-remove-confirm')).toBeTruthy();
    expect(screen.getByText(t('recents.remove_confirm_title'))).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId('screen-search-recents-remove-confirm-cancel'),
    );
    expect(removeRecent).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('screen-search-recents-item-r1-delete'));
    await fireEvent.press(
      screen.getByTestId('screen-search-recents-remove-confirm-confirm'),
    );
    expect(removeRecent).toHaveBeenCalledTimes(1);
    expect(removeRecent).toHaveBeenCalledWith('r1');
  });

  it('clears all searches only after explicit confirmation', async () => {
    mockScreen({ recents: [recent('r1', FUTURE_DATE), recent('r2', PAST_DATE)] });
    await render(<JourneySearchScreen testID="screen-search" />);

    await fireEvent.press(screen.getByTestId('screen-search-recents-clear-all'));
    expect(screen.getByTestId('screen-search-recents-clear-confirm')).toBeTruthy();
    expect(screen.getByText(t('recents.clear_confirm_title'))).toBeTruthy();
    expect(screen.getByText(t('recents.clear_confirm_body'))).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId('screen-search-recents-clear-confirm-cancel'),
    );
    expect(clearAll).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('screen-search-recents-clear-all'));
    await fireEvent.press(
      screen.getByTestId('screen-search-recents-clear-confirm-confirm'),
    );
    expect(clearAll).toHaveBeenCalledTimes(1);
  });
});

describe('recents screen states (checklist §7)', () => {
  it('hides the section entirely when there are no recent searches', async () => {
    mockScreen();
    await render(<JourneySearchScreen testID="screen-search" />);

    expect(screen.queryByTestId('screen-search-recents')).toBeNull();
    // The search form itself stays fully usable.
    expect(screen.getByTestId('journey-search-form-submit')).toBeTruthy();
  });

  it('shows a loading state while the recents are loading', async () => {
    mockScreen({ recentsLoading: true });
    await render(<JourneySearchScreen testID="screen-search" />);

    expect(screen.getByTestId('screen-search-recents-loading')).toBeTruthy();
    expect(screen.queryByTestId('screen-search-recents')).toBeNull();
  });

  it('shows an actionable error with a REAL retry when names cannot be resolved', async () => {
    mockScreen({ recents: [recent('r1', FUTURE_DATE)], directoryError: true });
    await render(<JourneySearchScreen testID="screen-search" />);

    expect(screen.getByTestId('screen-search-saved-items-error')).toBeTruthy();
    expect(screen.queryByTestId('screen-search-recents')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: t('common.retry') }));
    expect(refetchStations).toHaveBeenCalledTimes(1);
  });

  it('renders the real tab route through the same saved-items surface', async () => {
    mockScreen({ recents: [recent('r1', FUTURE_DATE)] });
    await render(<SearchScreen />);

    expect(screen.getByTestId('screen-search-recents-item-r1')).toBeTruthy();
  });
});
