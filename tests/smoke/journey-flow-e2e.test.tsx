/* eslint-disable import/namespace, import/no-unresolved, import/no-duplicates --
 * The repository's ESLint import resolver cannot read package `exports`
 * subpaths (see tests/mobile-ui/journey-routes.test.tsx): `npm run
 * typecheck` resolves `expo-router/testing-library` correctly. */

/**
 * In-app end-to-end smoke — "search → results → details → favourites"
 * (plan.md §9 Phase 6: "end-to-end smoke tests for the main journey-search
 * flow"; §11 "platform smoke tests: app launch, search, result selection,
 * navigation, and persistence").
 *
 * ONE continuous user flow against the REAL route tree (expo-router testing
 * library), the REAL hooks, the REAL local store logic and the REAL
 * MockTrainDataProvider (DEC-002 — demo data only):
 *
 *   search form (station picker hand-off + travel date) → submit →
 *   results (demo journeys, rule-6 demo labels) → open details (legs) →
 *   "Save route" (favourite, saved state) → back → back to search →
 *   the saved route appears in recents AND favourites →
 *   re-running the favourite lands on results again.
 *
 * Storage seam: the root layout mounts the AsyncStorage-backed `localStore`
 * singleton with no injection point, so this test swaps THAT ONE module
 * export for the documented memory store (`createMemoryLocalStore` — the
 * same seam tests/storage/localStore-contract.test.ts and
 * tests/hooks/testSupport.tsx drive). Nothing else is stubbed: screens,
 * hooks, store behaviour and provider are the real code.
 *
 * Rule 6 throughout: results/details must carry the demo provenance labels
 * (`provenance.demo` / `provenance.demo_desc`); the favourites surface must
 * carry the "not tickets" honesty notice. All expected strings come from the
 * REAL translate function, never hard-coded copy.
 *
 * Tolerances (honest): this is the IN-APP flow on the test renderer. It
 * does not prove device behaviour — gestures, Android back, VoiceOver /
 * TalkBack, focus order, fonts/contrast are NOT RUN here (checklist §10;
 * docs/voiceover-talkback-scripts.md remain manual).
 */

import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { addDaysIso, systemTodayIso } from '../../src/features/journey-search/validation';
import { resetPendingStationSelection } from '../../src/features/station-picker/selection';
import { setI18nLocale, translate } from '../../src/i18n';
import { localStore } from '../../src/services/storage/localStore';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// Memory-store seam: replace ONLY the app-wide singleton export (see header).
jest.mock('../../src/services/storage/localStore', () => {
  const actual =
    jest.requireActual<typeof import('../../src/services/storage/localStore')>(
      '../../src/services/storage/localStore',
    );
  return { ...actual, localStore: actual.createMemoryLocalStore() };
});

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

/** findBy* third-argument form (the 2nd-argument timeout is deprecated). */
const WAIT = { timeout: 8000 };

/** Inside the accepted travel-date window (DEC-022 route rules). */
const VALID_DATE = addDaysIso(systemTodayIso(), 7);

const SOFIA_ID = 'demo-station-sofia-central';
const VARNA_ID = 'demo-station-varna';
const SOFIA_NAME = 'Демо Централна гара София';
const VARNA_NAME = 'Демо гара Варна';

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(() => {
  resetPendingStationSelection();
});

describe('journey flow end-to-end (demo data only)', () => {
  it('search → results → details → save route → favourites/recents → re-run', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });
    expect(await screen.findByTestId('screen-search', {}, WAIT)).toBeTruthy();

    /* 1. Search form: pick both stations through the picker modal. */
    await fireEvent.press(screen.getByTestId('journey-search-form-from'));
    expect(await screen.findByText(SOFIA_NAME, {}, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByText(SOFIA_NAME));
    expect(await screen.findByTestId('journey-search-form-from', {}, WAIT)).toBeTruthy();
    expect(screen.getByTestId('journey-search-form-from').props.accessibilityLabel).toBe(
      `${t('journey_search.from_label')}: ${SOFIA_NAME}`,
    );

    await fireEvent.press(screen.getByTestId('journey-search-form-to'));
    expect(await screen.findByText(VARNA_NAME, {}, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByText(VARNA_NAME));
    expect(await screen.findByTestId('journey-search-form-to', {}, WAIT)).toBeTruthy();
    expect(screen.getByTestId('journey-search-form-to').props.accessibilityLabel).toBe(
      `${t('journey_search.to_label')}: ${VARNA_NAME}`,
    );

    /* 2. Travel date + submit. */
    await fireEvent.changeText(screen.getByTestId('journey-search-form-date'), VALID_DATE);
    await fireEvent.press(screen.getByTestId('journey-search-form-submit'));

    /* 3. Results: demo journeys, rule-6 demo labelling. */
    expect(await screen.findByTestId('screen-search-results', {}, WAIT)).toBeTruthy();
    expect(await screen.findByTestId('screen-search-results-card-0', {}, WAIT)).toBeTruthy();
    expect(screen.getByTestId('screen-search-results-card-1')).toBeTruthy();
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();

    /* 4. Details: the legs are visible and still demo-labelled. */
    await fireEvent.press(screen.getByTestId('screen-search-results-card-0-details'));
    expect(await screen.findByTestId('screen-journey-details', {}, WAIT)).toBeTruthy();
    expect(await screen.findByTestId('screen-journey-details-leg-0', {}, WAIT)).toBeTruthy();
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();

    /* 5. Save the route from details (saved state + honesty notice). */
    expect(await screen.findByTestId('screen-journey-details-save-route-save', {}, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('screen-journey-details-save-route-save'));
    expect(
      await screen.findByTestId('screen-journey-details-save-route-saved', {}, WAIT),
    ).toBeTruthy();
    // Rule 3 adjacency: a saved route is a shortcut, NOT a ticket.
    expect(screen.getByTestId('screen-journey-details-save-route-notice')).toBeTruthy();
    expect(screen.getByText(t('favourites.notice'))).toBeTruthy();

    /* 6. Back to results, then "Change search" back to the form. */
    await fireEvent.press(screen.getByTestId('screen-journey-details-back'));
    expect(await screen.findByTestId('screen-search-results', {}, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('screen-search-results-change-search'));
    expect(await screen.findByTestId('screen-search', {}, WAIT)).toBeTruthy();

    /* 7. The flow left user-visible traces: one recorded search and one
     *    saved route, both rendered as rows on the search screen. */
    await localStore.hydrate();
    const favourites = localStore.getSnapshot().snapshot.favouriteRoutes;
    const recents = localStore.getSnapshot().snapshot.recentSearches;
    expect(favourites).toHaveLength(1);
    expect(recents).toHaveLength(1);

    // "Save this route" saved exactly the searched endpoints.
    expect(favourites[0].fromStationId).toBe(SOFIA_ID);
    expect(favourites[0].toStationId).toBe(VARNA_ID);

    const favouriteRow = await screen.findByTestId(
      `screen-search-favourites-item-${favourites[0].id}`,
      {},
      WAIT,
    );
    expect(favouriteRow).toBeTruthy();
    expect(favouriteRow.props.accessibilityLabel).toBe(
      t('favourites.item_a11y', { from: SOFIA_NAME, to: VARNA_NAME }),
    );
    // The route text is resolved to station NAMES, never raw ids.
    expect(
      within(screen.getByTestId('screen-search-favourites')).getByText(
        `${SOFIA_NAME} → ${VARNA_NAME}`,
      ),
    ).toBeTruthy();
    // Rule 3 adjacency on the favourites surface too.
    expect(screen.getByTestId('screen-search-favourites-notice')).toBeTruthy();

    const recentRow = await screen.findByTestId(
      `screen-search-recents-item-${recents[0].id}`,
      {},
      WAIT,
    );
    expect(recentRow).toBeTruthy();
    expect(recents[0].search.fromStationId).toBe(SOFIA_ID);
    expect(recents[0].search.toStationId).toBe(VARNA_ID);
    expect(recents[0].search.date).toBe(VALID_DATE);

    /* 8. Re-run the saved route from favourites: lands on results again. */
    await fireEvent.press(favouriteRow);
    expect(await screen.findByTestId('screen-search-results', {}, WAIT)).toBeTruthy();
    expect(await screen.findByTestId('screen-search-results-card-0', {}, WAIT)).toBeTruthy();
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });
});
