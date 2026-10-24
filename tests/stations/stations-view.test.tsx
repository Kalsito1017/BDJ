/**
 * StationsView behaviour: search/filter through the UI, list/map toggle,
 * loading / empty / offline states, detail selection, and the mandatory
 * demo labelling (rule 6). The map area must render the DEC-012 pending
 * placeholder — no map SDK exists in this wave.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
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
  it('starts on the list and switches to the labelled map placeholder and back', async () => {
    await render(<StationsViewHarness />);

    expect(screen.getByTestId('stations-list')).toBeTruthy();
    expect(screen.queryByTestId('stations-map-placeholder')).toBeNull();

    await fireEvent.press(screen.getByTestId('stations-toggle-map'));
    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('stations-list')).toBeNull();
    // The placeholder must state the pending human decision (DEC-012).
    expect(screen.getByText('map SDK pending DEC-012 — human decision')).toBeTruthy();
    // And it must repeat the no-implication disclaimer (plan.md 17.5).
    expect(
      screen.getByText(
        'A map line never implies an operational route or real-time service',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stations-toggle-list'));
    expect(screen.getByTestId('stations-list')).toBeTruthy();
    expect(screen.queryByTestId('stations-map-placeholder')).toBeNull();
  });

  it('can start in map mode', async () => {
    await render(<StationsViewHarness initialViewMode="map" />);

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
