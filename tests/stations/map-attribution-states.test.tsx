/**
 * DEC-012 attribution — rendered in EVERY map state (reviewer-qa, Phase 5
 * review).
 *
 * DEC-012 (human owner, 2026-10-24) prescribes the attribution wording
 * verbatim and addbeforerelease.txt §9 requires "Required map attribution
 * displayed". MapAttribution.tsx states the intent: "The attribution is
 * rendered inside the map area in EVERY map state (map drawn or fallback)".
 *
 * This suite pins that invariant across the state matrix:
 *  - map state (native module present, mocked here — zero pixels),
 *  - fallback state (module absent/unusable: Expo Go, web, old devices),
 * so the required wording can never silently disappear from one of them.
 *
 * The native map itself requires an Expo dev build (`expo prebuild` / EAS)
 * — NOT RUN here (rules 5/8); the module is mocked and draws zero pixels.
 */

import { render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import {
  ATTRIBUTION_OSM_ODBL,
  ATTRIBUTION_OPENFREEMAP,
  MapAttribution,
} from '../../src/features/stations/map/MapAttribution';
import { StationsMapSurface } from '../../src/features/stations/map/StationsMapSurface';
import type { MapLibreModule } from '../../src/features/stations/map/loadMapLibre';
import { makeMapLibreMock, fakeTranslate } from './testSupport';

const MAP_STATES: readonly [string, MapLibreModule | null][] = [
  ['map rendered (native module present)', makeMapLibreMock().module],
  ['fallback placeholder (native module absent)', null],
];

describe.each(MAP_STATES)('DEC-012 attribution — %s', (_label, mapLibre) => {
  it('renders the required attribution wording verbatim', async () => {
    await render(
      <StationsMapSurface
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={() => {}}
        mapLibre={mapLibre}
      />,
    );

    expect(screen.getByText(ATTRIBUTION_OPENFREEMAP)).toBeTruthy();
    expect(screen.getByText(ATTRIBUTION_OSM_ODBL)).toBeTruthy();
  });

  it('labels the attribution block accessibly in every state', async () => {
    await render(
      <StationsMapSurface
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={() => {}}
        mapLibre={mapLibre}
      />,
    );

    // The block's accessible name comes from `map.attribution_label` (i18n).
    expect(screen.getByTestId('stations-map-attribution')).toBeTruthy();
    expect(screen.getByTestId('stations-map-attribution').props.accessibilityLabel).toBe(
      fakeTranslate('map.attribution_label'),
    );
  });
});

describe('fallback robustness — a native map that throws at render', () => {
  it('degrades to the labelled placeholder instead of crashing the screen', async () => {
    const ThrowingMap = (): never => {
      throw new Error('simulated native render failure');
    };
    const brokenModule: MapLibreModule = {
      Map: ThrowingMap,
      Camera: () => null,
      Marker: () => null,
    };

    // The error boundary must swallow the native failure (checklist §7).
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await render(
        <StationsMapSurface
          t={fakeTranslate}
          stations={DEMO_STATIONS}
          onSelectStation={() => {}}
          mapLibre={brokenModule}
        />,
      );
    } finally {
      spy.mockRestore();
    }

    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('stations-map-canvas')).toBeNull();
    // The rule-6 furniture survives the fallback.
    expect(screen.getByTestId('stations-demo-notice')).toBeTruthy();
  });
});

describe('DEC-012 attribution constants', () => {
  it('match the DEC-012 wording exactly (both lines)', () => {
    expect(ATTRIBUTION_OPENFREEMAP).toBe(
      'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
    );
    expect(ATTRIBUTION_OSM_ODBL).toBe(
      '© OpenStreetMap contributors — data available under the Open Database License (ODbL), https://www.openstreetmap.org/copyright',
    );
  });

  it('renders the block standalone without inventing copy', async () => {
    await render(<MapAttribution t={fakeTranslate} />);
    expect(screen.getByText(ATTRIBUTION_OPENFREEMAP)).toBeTruthy();
    expect(screen.getByText(ATTRIBUTION_OSM_ODBL)).toBeTruthy();
  });
});
