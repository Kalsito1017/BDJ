/**
 * Fallback path: the MapLibre native module cannot be loaded AT ALL (Expo
 * Go, React Native for Web, unit tests, old devices). The app must show the
 * clearly-labelled MapPlaceholder with an honest label — never a broken
 * half-map, never a crash.
 *
 * The native map itself requires an Expo dev build (`npx expo prebuild` /
 * EAS Build) — NOT RUN here (Linux host, rules 5/8). The map renders zero
 * pixels in this environment and no test claims otherwise.
 */

import { render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import { loadMapLibre } from '../../src/features/stations/map/loadMapLibre';
import { StationsMapSurface } from '../../src/features/stations/map/StationsMapSurface';
import { fakeTranslate, StationsViewHarness } from './testSupport';

jest.mock('@maplibre/maplibre-react-native', () => {
  throw new Error('simulated missing native module');
});

describe('loadMapLibre — module absent', () => {
  it('resolves to null instead of throwing', () => {
    expect(loadMapLibre()).toBeNull();
  });
});

describe('map fallback — native module absent', () => {
  it('renders the clearly-labelled placeholder with an honest label', async () => {
    await render(
      <StationsMapSurface
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={() => {}}
      />,
    );

    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    // Honest label: the map is unavailable in THIS build, with the reason.
    expect(screen.getByText('Map unavailable in this build')).toBeTruthy();
    // The placeholder keeps the rule-6 furniture: demo notice, disclaimer,
    // reserved attribution area.
    expect(screen.getByTestId('stations-demo-notice')).toBeTruthy();
    expect(screen.getByText('Map attribution will be shown here')).toBeTruthy();
    expect(
      screen.getByText(
        'Station markers show demo data only. A marker does not mean a train is running.',
      ),
    ).toBeTruthy();
    // No half-map may appear.
    expect(screen.queryByTestId('stations-map-canvas')).toBeNull();
    expect(screen.queryByTestId('stations-map')).toBeNull();
  });

  it('keeps the screen usable: map mode degrades to the placeholder end to end', async () => {
    await render(<StationsViewHarness initialViewMode="map" />);

    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    expect(screen.getByText('Map unavailable in this build')).toBeTruthy();
    // The list alternative and the demo labelling remain intact (the notice
    // renders in the header and inside the placeholder).
    expect(screen.getAllByTestId('stations-demo-notice').length).toBeGreaterThan(0);
    expect(screen.getByTestId('stations-toggle-list')).toBeTruthy();
  });
});
