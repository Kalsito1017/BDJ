/**
 * StationsView behaviour: search/filter through the UI, list/map toggle,
 * loading / empty / offline states, detail selection, and the mandatory
 * demo labelling (rule 6). The map area falls back to the clearly-labelled
 * placeholder whenever the native map cannot render — these tests force
 * that path with `mapLibre={null}` (the map draws zero pixels in this
 * environment; the mocked-map behaviour lives in stations-map.test.tsx).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import { SEARCH_QUERY_MAX_LENGTH } from '../../src/features/stations/StationsView';
import { StationsViewHarness, makeTestStation } from './testSupport';

describe('StationsView — list, search and states', () => {
  it('renders every demo station row with a provenance label', async () => {
    await render(<StationsViewHarness />);

    expect(screen.getByTestId('stations-list')).toBeTruthy();
    for (const station of DEMO_STATIONS) {
      expect(screen.getByTestId(`stations-list-row-${station.id}`)).toBeTruthy();
    }
    // One provenance badge per row + one in the demo notice header block? No:
    // badges are per row; assert exactly one per station row.
    expect(screen.getAllByTestId('stations-provenance-badge')).toHaveLength(
      DEMO_STATIONS.length,
    );
  });

  it('filters the list as the user types Cyrillic', async () => {
    await render(<StationsViewHarness />);

    await fireEvent.changeText(screen.getByTestId('stations-search-input'), 'алфа');

    expect(screen.getByTestId('stations-list-row-demo-001')).toBeTruthy();
    expect(screen.queryByTestId('stations-list-row-demo-002')).toBeNull();
  });

  it('filters with Latin and mixed input too', async () => {
    await render(<StationsViewHarness />);

    await fireEvent.changeText(screen.getByTestId('stations-search-input'), 'gama');
    expect(screen.getByTestId('stations-list-row-demo-003')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('stations-search-input'), 'демо alpha');
    expect(screen.getByTestId('stations-list-row-demo-001')).toBeTruthy();
    expect(screen.queryByTestId('stations-list-row-demo-003')).toBeNull();
  });

  it('shows the empty state when nothing matches', async () => {
    await render(<StationsViewHarness />);

    await fireEvent.changeText(
      screen.getByTestId('stations-search-input'),
      'zzzz-no-match',
    );

    expect(screen.getByTestId('stations-list-empty')).toBeTruthy();
    expect(screen.getByText('No stations found')).toBeTruthy();
    expect(screen.queryByTestId('stations-list')).toBeNull();
  });

  it('shows the loading state instead of the list', async () => {
    await render(<StationsViewHarness status="loading" />);

    expect(screen.getByTestId('stations-list-loading')).toBeTruthy();
    expect(screen.getByText('Loading stations')).toBeTruthy();
    expect(screen.queryByTestId('stations-list')).toBeNull();
  });

  it('keeps the list usable and shows a banner when offline', async () => {
    await render(<StationsViewHarness networkStatus="offline" />);

    expect(screen.getByTestId('stations-offline-banner')).toBeTruthy();
    expect(screen.getByText('Offline, showing bundled demo data')).toBeTruthy();
    expect(screen.getByTestId('stations-list')).toBeTruthy();
    expect(screen.getByTestId('stations-list-row-demo-001')).toBeTruthy();
  });

  it('always shows the demo notice', async () => {
    await render(<StationsViewHarness />);

    expect(screen.getByTestId('stations-demo-notice')).toBeTruthy();
    // "Demo data" is rendered per row (provenance badges) and in the notice.
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Synthetic demo dataset, not real BDZ stations'),
    ).toBeTruthy();
  });
});

describe('StationsView — list/map toggle', () => {
  it('starts on the list and switches to the labelled map fallback and back', async () => {
    await render(<StationsViewHarness mapLibre={null} />);

    expect(screen.getByTestId('stations-list')).toBeTruthy();
    expect(screen.queryByTestId('stations-map-placeholder')).toBeNull();

    await fireEvent.press(screen.getByTestId('stations-toggle-map'));
    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('stations-list')).toBeNull();
    // The fallback must label itself honestly (native map unavailable here).
    expect(screen.getByText('Map unavailable in this build')).toBeTruthy();
    // And it must repeat the no-implication disclaimer (plan.md 17.5).
    expect(
      screen.getByText(
        'Station markers show demo data only. A marker does not mean a train is running.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stations-toggle-list'));
    expect(screen.getByTestId('stations-list')).toBeTruthy();
    expect(screen.queryByTestId('stations-map-placeholder')).toBeNull();
  });

  it('can start in map mode', async () => {
    await render(<StationsViewHarness initialViewMode="map" mapLibre={null} />);

    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('stations-list')).toBeNull();
  });
});

describe('StationsView — detail selection', () => {
  it('opens the detail card for a row and closes back to the list', async () => {
    await render(<StationsViewHarness />);

    await fireEvent.press(screen.getByTestId('stations-list-row-demo-004'));
    expect(screen.getByTestId('stations-detail-card')).toBeTruthy();
    expect(screen.queryByTestId('stations-list')).toBeNull();

    await fireEvent.press(screen.getByTestId('stations-detail-close'));
    expect(screen.queryByTestId('stations-detail-card')).toBeNull();
    expect(screen.getByTestId('stations-list')).toBeTruthy();
  });

  it('shows unknown for a station without coordinates', async () => {
    await render(
      <StationsViewHarness stations={[makeTestStation({ id: 'demo-nogeom' })]} />,
    );

    await fireEvent.press(screen.getByTestId('stations-list-row-demo-nogeom'));

    expect(screen.getAllByText('unknown').length).toBeGreaterThan(0);
  });
});

describe('StationsView — search input bounds (DEC-023 W3B-L1)', () => {
  it('bounds the search query length so oversized input never reaches the model', async () => {
    await render(<StationsViewHarness />);

    const input = screen.getByTestId('stations-search-input');
    expect(input.props.maxLength).toBe(SEARCH_QUERY_MAX_LENGTH);
  });
});

describe('StationsView — mapStationDiscovery gate', () => {
  it('keeps the list as the only surface when the map feature is disabled', async () => {
    await render(
      <StationsViewHarness mapEnabled={false} initialViewMode="map" mapLibre={null} />,
    );

    // No map toggle at all, and map mode is impossible — the accessible
    // list is the discovery surface (checklist 9).
    expect(screen.queryByTestId('stations-toggle-map')).toBeNull();
    expect(screen.queryByTestId('stations-toggle-list')).toBeNull();
    expect(screen.queryByTestId('stations-map-placeholder')).toBeNull();
    expect(screen.getByTestId('stations-list')).toBeTruthy();
  });
});
