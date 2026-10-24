/* eslint-disable import/namespace, import/no-unresolved, import/no-duplicates --
 * The repository's ESLint import resolver cannot read package `exports`
 * subpaths (see tests/mobile-ui/navigation-shell.test.tsx): `npm run
 * typecheck` resolves `expo-router/testing-library` correctly. */

/**
 * Deep-link routes + journey-flow smoke (Phase 3/4 acceptance; plan.md §9
 * "deep links behave as users expect"; checklist §9/§14).
 *
 * Uses Expo Router's testing library against the REAL route files and the
 * REAL hooks + MockTrainDataProvider (DEC-002, demo-labelled), so this is
 * an integration smoke for search -> results -> details against the shared
 * data contract. Proposed route names (pending a DEC entry):
 *   /search, /search/results, /search/station-picker, /journey/[id]
 */
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { setI18nLocale, translate } from '../../src/i18n';
import { resetPendingStationSelection } from '../../src/features/station-picker/selection';
import { addDaysIso, systemTodayIso } from '../../src/features/journey-search/validation';

/** A travel date inside the accepted window (route rules, DEC-022 §2). */
const VALID_DATE = addDaysIso(systemTodayIso(), 7);

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

const FIND = { timeout: 8000 };

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(() => {
  resetPendingStationSelection();
});

describe('journey flow deep links (mock data only)', () => {
  it('resolves /search to the journey search form', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });
    expect(await screen.findByTestId('screen-search', FIND)).toBeTruthy();
    expect(screen.getByTestId('journey-search-form-submit')).toBeTruthy();
  });

  it('resolves /search/results and lists the demo journeys', async () => {
    await renderRouter('src/app', {
      initialUrl: `/search/results?from=demo-station-sofia-central&to=demo-station-varna&date=${VALID_DATE}`,
    });

    expect(await screen.findByTestId('screen-search-results', FIND)).toBeTruthy();
    expect(await screen.findByTestId('screen-search-results-card-0', FIND)).toBeTruthy();
    expect(screen.getByTestId('screen-search-results-card-1')).toBeTruthy();
    // Rule 6: demo labelling on the results, never unlabelled mock data.
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });

  it('opens journey details from a result card (search -> results -> details)', async () => {
    await renderRouter('src/app', {
      initialUrl: `/search/results?from=demo-station-sofia-central&to=demo-station-varna&date=${VALID_DATE}`,
    });

    await screen.findByTestId('screen-search-results-card-0', FIND);
    await fireEvent.press(screen.getByTestId('screen-search-results-card-0-details'));

    expect(await screen.findByTestId('screen-journey-details', FIND)).toBeTruthy();
    expect(await screen.findByTestId('screen-journey-details-leg-0', FIND)).toBeTruthy();
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();

    // Back to the results.
    await fireEvent.press(screen.getByTestId('screen-journey-details-back'));
    expect(await screen.findByTestId('screen-search-results', FIND)).toBeTruthy();
  });

  it('shows the empty state for a route with no journeys', async () => {
    await renderRouter('src/app', {
      initialUrl: `/search/results?from=demo-station-plovdiv&to=demo-station-latin&date=${VALID_DATE}`,
    });

    expect(await screen.findByTestId('screen-search-results-empty', FIND)).toBeTruthy();
    expect(screen.getByText(t('journey_results.empty_title'))).toBeTruthy();
  });

  it('handles broken results params without crashing', async () => {
    await renderRouter('src/app', { initialUrl: '/search/results' });
    expect(await screen.findByTestId('screen-search-results-error', FIND)).toBeTruthy();
    expect(screen.getByText(t('errors.not_found'))).toBeTruthy();
  });

  it('rejects out-of-window travel dates at the route boundary (review L1)', async () => {
    // A far-future date passes ISO shape checks but exceeds MAX_DAYS_AHEAD:
    // deep links obey the same rules as the form (DEC-022 §2).
    await renderRouter('src/app', {
      initialUrl:
        '/search/results?from=demo-station-sofia-central&to=demo-station-varna&date=2030-01-01',
    });

    expect(await screen.findByTestId('screen-search-results-error', FIND)).toBeTruthy();
  });

  it('maps unknown station ids in the results params to a not-found error state', async () => {
    await renderRouter('src/app', {
      initialUrl: `/search/results?from=no-such-station&to=also-nope&date=${VALID_DATE}`,
    });

    expect(await screen.findByTestId('screen-search-results-error', FIND)).toBeTruthy();
    expect(screen.getByText(t('errors.not_found'))).toBeTruthy();
  });

  it('maps an unknown journey id to a not-found error state without crashing', async () => {
    await renderRouter('src/app', { initialUrl: '/journey/does-not-exist' });

    expect(await screen.findByTestId('screen-journey-details-error', FIND)).toBeTruthy();
    expect(screen.getByText(t('errors.not_found'))).toBeTruthy();
  });
});

describe('station picker deep link + modal hand-off', () => {
  it('resolves /search/station-picker and loads the demo directory', async () => {
    await renderRouter('src/app', {
      initialUrl: '/search/station-picker?field=to',
    });

    expect(await screen.findByTestId('screen-station-picker', FIND)).toBeTruthy();
    expect(await screen.findByText('Демо Централна гара София', FIND)).toBeTruthy();
    expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
  });

  it('filters with Cyrillic, Latin and mixed input through the REAL hook and provider', async () => {
    // End-to-end through useStationSearch + MockTrainDataProvider (no stub):
    // query text -> debounced hook -> provider matching -> rows (checklist §8
    // "Cyrillic and Latin search both work (and mixed input)").
    await renderRouter('src/app', { initialUrl: '/search/station-picker?field=from' });
    const search = await screen.findByTestId('screen-station-picker-search', FIND);
    await screen.findByText('Демо Централна гара София', FIND);

    // Cyrillic: partial word.
    await fireEvent.changeText(search, 'Соф');
    await waitFor(
      () =>
        expect(screen.getByTestId('screen-station-picker-count').props.children).toBe(
          t('stations.result_count', { count: 1 }),
        ),
      FIND,
    );
    expect(screen.getByText('Демо Централна гара София')).toBeTruthy();
    expect(screen.queryByText('Демо гара Варна')).toBeNull();
    expect(screen.queryByText('Demo North Junction Halt')).toBeNull();

    // Latin: matches the Latin fixture name only.
    await fireEvent.changeText(search, 'junction');
    expect(await screen.findByText('Demo North Junction Halt', FIND)).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText('Демо Централна гара София')).toBeNull(),
    );

    // Mixed Cyrillic + Latin in one query.
    await fireEvent.changeText(search, 'смесен mixed');
    expect(await screen.findByText('Демо Mixed-Name Халт', FIND)).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText('Демо Централна гара София')).toBeNull(),
    );
    expect(screen.getByTestId('screen-station-picker-count').props.children).toBe(
      t('stations.result_count', { count: 1 }),
    );
  });

  it('hands a picked station back to the form (form -> picker modal -> form)', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });

    await screen.findByTestId('journey-search-form-from', FIND);
    await fireEvent.press(screen.getByTestId('journey-search-form-from'));

    expect(await screen.findByTestId('screen-station-picker', FIND)).toBeTruthy();
    await screen.findByText('Демо Централна гара София', FIND);
    await fireEvent.press(screen.getByText('Демо Централна гара София'));

    // Back on the form, the departure field carries the picked station.
    expect(await screen.findByTestId('journey-search-form-from', FIND)).toBeTruthy();
    expect(screen.getByTestId('journey-search-form-from').props.accessibilityLabel).toBe(
      `${t('journey_search.from_label')}: Демо Централна гара София`,
    );
  });
});
