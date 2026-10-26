/**
 * Interactive map behaviour through the MOCKED MapLibre module (the mock
 * lives in tests/stations/testSupport.tsx). The map draws ZERO PIXELS in
 * this environment: these tests assert what the feature asks the map to
 * draw (style, camera, markers, overlays) — never a rendered map claim.
 * The native map requires an Expo dev build (`npx expo prebuild` / EAS
 * Build) which is NOT run here (Linux host — rules 5/8).
 *
 * Rule 6 / DEC-012 invariants under test: markers only for stations that
 * have coordinates, no route lines between stations, the mandatory
 * attribution + demo disclaimer visible ON the map, and marker taps only
 * open the (demo-labelled) station detail card.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import {
  ATTRIBUTION_OPENFREEMAP,
  ATTRIBUTION_OSM_ODBL,
} from '../../src/features/stations/map/MapAttribution';
import {
  BULGARIA_CENTER,
  MAP_STYLE_URL,
  StationsMap,
} from '../../src/features/stations/map/StationsMap';
import { StationsMapSurface } from '../../src/features/stations/map/StationsMapSurface';
import type { MapLibreModule } from '../../src/features/stations/map/loadMapLibre';
import {
  fakeTranslate,
  makeMapLibreMock,
  makeTestStation,
  StationsViewHarness,
} from './testSupport';

const onSelectStation = jest.fn();

describe('StationsMap — what the map is asked to draw', () => {
  it('uses the OpenFreeMap style (no key) centred on Bulgaria', async () => {
    const mock = makeMapLibreMock();
    await render(
      <StationsMap
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={onSelectStation}
        mapLibre={mock.module}
      />,
    );

    // DEC-012: OpenFreeMap public instance, liberty style, NO API key.
    expect(MAP_STYLE_URL).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(mock.calls.mapStyle).toEqual([MAP_STYLE_URL]);

    const camera = mock.calls.cameraStops[0];
    expect(camera).toBeDefined();
    const [longitude, latitude] = camera?.center as [number, number];
    expect(longitude).toBe(BULGARIA_CENTER[0]);
    expect(latitude).toBe(BULGARIA_CENTER[1]);
    // Bulgaria in plain bounds checks (lng 22–29, lat 41–44.5).
    expect(longitude).toBeGreaterThan(22);
    expect(longitude).toBeLessThan(29);
    expect(latitude).toBeGreaterThan(41);
    expect(latitude).toBeLessThan(44.5);
    expect(typeof camera?.zoom).toBe('number');
  });

  it('puts a marker only on stations that have coordinates', async () => {
    const mock = makeMapLibreMock();
    await render(
      <StationsMap
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={onSelectStation}
        mapLibre={mock.module}
      />,
    );

    const expected = DEMO_STATIONS.filter((station) => station.location).map(
      (station) => station.id,
    );
    expect(mock.calls.markerIds).toEqual(expected);
    // demo-004 has no coordinates on purpose: no marker, ever invented.
    expect(screen.queryByTestId('stations-map-marker-demo-004')).toBeNull();
  });

  it('never draws route lines — markers only (rule 6 / plan.md 17.5)', async () => {
    const mock = makeMapLibreMock();
    await render(
      <StationsMap
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={onSelectStation}
        mapLibre={mock.module}
      />,
    );

    // Every map child must be the camera or a marker; a line layer, GeoJSON
    // route source or any other child would show up as 'other' and fail.
    for (const kinds of mock.calls.childKinds) {
      expect(kinds.filter((kind) => kind === 'other')).toEqual([]);
      expect(kinds).toContain('camera');
      expect(kinds).toContain('marker');
    }
  });

  it('shows the required DEC-012 attribution and the rule-6 disclaimer on the map', async () => {
    const mock = makeMapLibreMock();
    await render(
      <StationsMap
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={onSelectStation}
        mapLibre={mock.module}
      />,
    );

    // DEC-012 attribution, verbatim, rendered as part of the map area.
    const attribution = screen.getByTestId('stations-map-attribution');
    expect(attribution.props.accessibilityLabel).toBe(
      fakeTranslate('map.attribution_label'),
    );
    expect(screen.getByText(ATTRIBUTION_OPENFREEMAP)).toBeTruthy();
    expect(screen.getByText(ATTRIBUTION_OSM_ODBL)).toBeTruthy();

    // Rule 6: a marker never implies operational service.
    expect(screen.getByTestId('stations-map-disclaimer')).toBeTruthy();
    expect(
      screen.getByText(
        'Station markers show demo data only. A marker does not mean a train is running.',
      ),
    ).toBeTruthy();
  });

  it('lists stations without coordinates below the map and keeps them tappable', async () => {
    const mock = makeMapLibreMock();
    await render(
      <StationsMap
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={onSelectStation}
        mapLibre={mock.module}
      />,
    );

    expect(screen.getByTestId('stations-map-unmapped-list')).toBeTruthy();
    expect(screen.getByTestId('stations-map-unmapped-demo-004')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stations-map-unmapped-demo-004'));
    expect(onSelectStation).toHaveBeenCalledWith(
      DEMO_STATIONS.find((station) => station.id === 'demo-004'),
    );
  });
});

describe('StationsMapSurface — marker taps and graceful fallback', () => {
  it('opens the station detail card when a marker is tapped', async () => {
    const mock = makeMapLibreMock();
    await render(<StationsViewHarness initialViewMode="map" mapLibre={mock.module} />);

    await fireEvent.press(screen.getByTestId('stations-map-marker-demo-001'));

    expect(screen.getByTestId('stations-detail-card')).toBeTruthy();
    expect(screen.queryByTestId('stations-map')).toBeNull();

    await fireEvent.press(screen.getByTestId('stations-detail-close'));
    expect(screen.getByTestId('stations-map')).toBeTruthy();
    expect(screen.queryByTestId('stations-detail-card')).toBeNull();
  });

  it('falls back to the labelled placeholder when the native map throws on render', async () => {
    // Simulates a native map that loads but fails at render time (old
    // devices / driver bugs): the screen must degrade, never crash.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      function ThrowingMap(): never {
        throw new Error('simulated native map render failure');
      }
      const brokenModule: MapLibreModule = {
        Map: ThrowingMap as unknown as MapLibreModule['Map'],
        Camera: () => null,
        Marker: () => null,
      };

      await render(
        <StationsMapSurface
          t={fakeTranslate}
          stations={[makeTestStation({ id: 'demo-x' })]}
          onSelectStation={onSelectStation}
          mapLibre={brokenModule}
        />,
      );

      expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
      expect(screen.getByText('Map unavailable in this build')).toBeTruthy();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('shows the placeholder when no map module is injected at all (mapLibre=null)', async () => {
    await render(
      <StationsMapSurface
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={onSelectStation}
        mapLibre={null}
      />,
    );

    expect(screen.getByTestId('stations-map-placeholder')).toBeTruthy();
    expect(screen.getByTestId('stations-demo-notice')).toBeTruthy();
  });
});
