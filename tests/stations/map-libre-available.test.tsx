/**
 * The lazy-require path with the module PRESENT: `jest.mock` supplies the
 * shared MapLibre mock (tests/stations/testSupport.tsx) and the surface must
 * draw the map through it without any explicit injection.
 *
 * This is still a MOCKED map: it draws zero pixels in this environment. The
 * native render requires an Expo dev build (`npx expo prebuild` / EAS
 * Build) — NOT RUN here (rules 5/8).
 */

import { render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import { loadMapLibre } from '../../src/features/stations/map/loadMapLibre';
import { StationsMapSurface } from '../../src/features/stations/map/StationsMapSurface';

jest.mock(
  '@maplibre/maplibre-react-native',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./testSupport').makeMapLibreMock().module,
);

describe('loadMapLibre — module present', () => {
  it('resolves the Map/Camera/Marker surface', () => {
    const module = loadMapLibre();
    expect(module).not.toBeNull();
    expect(typeof module?.Map).toBe('function');
    expect(typeof module?.Camera).toBe('function');
    expect(typeof module?.Marker).toBe('function');
  });
});

describe('map rendering — module resolved lazily', () => {
  it('draws the map and its markers through the lazily-required module', async () => {
    await render(
      <StationsMapSurface
        t={(key) => key}
        stations={DEMO_STATIONS}
        onSelectStation={() => {}}
      />,
    );

    expect(screen.getByTestId('stations-map-canvas')).toBeTruthy();
    expect(screen.getByTestId('stations-map-marker-demo-001')).toBeTruthy();
    // Stations without coordinates never get a marker.
    expect(screen.queryByTestId('stations-map-marker-demo-004')).toBeNull();
    // Attribution is part of the map area.
    expect(screen.getByTestId('stations-map-attribution')).toBeTruthy();
  });
});
