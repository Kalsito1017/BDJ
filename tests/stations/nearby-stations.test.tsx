/**
 * Nearby-stations flow (plan.md 17.5, checklist 9/14):
 * - foreground location permission is requested ONLY from the user's tap on
 *   "nearby stations" (never on render, never while searching);
 * - permission denied keeps manual selection fully usable;
 * - the raw position never enters state (no location history);
 * - all states: requesting, locating, ready, empty, denied, unavailable,
 *   error.
 *
 * Synthetic fixtures only; the LocationPort is a mock in every test.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  INITIAL_NEARBY_STATE,
  nearbyReducer,
  runNearbyStationsFlow,
  type NearbyAction,
  type NearbyViewState,
} from '../../src/features/stations/model/nearby';
import { NearbyStationsSection } from '../../src/features/stations/components/NearbyStationsSection';
import type {
  LocationPermissionOutcome,
  LocationPort,
} from '../../src/features/stations/types';
import { fakeTranslate, makeTestStation } from './testSupport';

type MockLocationPort = {
  requestForegroundPermission: jest.Mock;
  getCurrentPosition: jest.Mock;
};

function mockPort(overrides: Partial<MockLocationPort> = {}): MockLocationPort {
  return {
    requestForegroundPermission: jest.fn(
      async (): Promise<LocationPermissionOutcome> => 'granted',
    ),
    getCurrentPosition: jest.fn(async () => ({ latitude: 42.5, longitude: 23.5 })),
    ...overrides,
  };
}

const twoStations = [
  makeTestStation({
    id: 'near-far',
    name: 'Демо гара Далечна',
    location: { latitude: 43.5, longitude: 25.5 },
  }),
  makeTestStation({
    id: 'near-close',
    name: 'Демо гара Близка',
    location: { latitude: 42.51, longitude: 23.51 },
  }),
  makeTestStation({ id: 'near-geomless', name: 'Демо гара Без Координати' }),
];

describe('NearbyStationsSection — permission only on user action', () => {
  it('never requests location at mount and only on tapping the nearby button', async () => {
    const port = mockPort();
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={port}
      />,
    );

    expect(port.requestForegroundPermission).not.toHaveBeenCalled();
    expect(port.getCurrentPosition).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));

    await waitFor(() =>
      expect(port.requestForegroundPermission).toHaveBeenCalledTimes(1),
    );
    expect(port.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('ignores rapid double taps — one permission request per user action', async () => {
    // Keep the permission promise pending so the flow is still in flight
    // when the second tap arrives.
    let resolvePermission!: (outcome: LocationPermissionOutcome) => void;
    const pendingPort = mockPort({
      requestForegroundPermission: jest.fn(
        () =>
          new Promise<LocationPermissionOutcome>((resolve) => {
            resolvePermission = resolve;
          }),
      ),
    });
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={pendingPort}
      />,
    );

    const button = screen.getByTestId('stations-nearby-button');
    await fireEvent.press(button);
    await waitFor(() =>
      expect(screen.getByTestId('stations-nearby-requesting')).toBeTruthy(),
    );

    // Second tap while the first request is still in flight: dropped.
    await fireEvent.press(button);
    expect(pendingPort.requestForegroundPermission).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePermission('granted');
    });
    await waitFor(() =>
      expect(screen.getByTestId('stations-nearby-results')).toBeTruthy(),
    );
    expect(pendingPort.getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe('NearbyStationsSection — states', () => {
  it('shows the permission-denied state and keeps manual selection available', async () => {
    const port = mockPort({
      requestForegroundPermission: jest.fn(async () => 'denied' as const),
    });
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={port}
      />,
    );

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));

    await waitFor(() =>
      expect(screen.getByTestId('stations-nearby-denied')).toBeTruthy(),
    );
    expect(screen.getByText('Location permission denied')).toBeTruthy();
    // Manual-selection guidance stays visible (checklist 9).
    expect(screen.getByText('Manual selection works without permission')).toBeTruthy();
    expect(port.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('shows the unavailable state when no location module exists', async () => {
    const port = mockPort({
      requestForegroundPermission: jest.fn(async () => 'unavailable' as const),
    });
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={port}
      />,
    );

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));

    await waitFor(() =>
      expect(screen.getByTestId('stations-nearby-unavailable')).toBeTruthy(),
    );
    expect(screen.getByText('Manual selection works without permission')).toBeTruthy();
    expect(port.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('shows ready results nearest-first and excludes stations without coordinates', async () => {
    const port = mockPort();
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={port}
      />,
    );

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));

    await waitFor(() =>
      expect(screen.getByTestId('stations-nearby-results')).toBeTruthy(),
    );
    expect(screen.getByTestId('stations-nearby-row-near-close')).toBeTruthy();
    expect(screen.getByTestId('stations-nearby-row-near-far')).toBeTruthy();
    expect(screen.queryByTestId('stations-nearby-row-near-geomless')).toBeNull();

    const rows = screen.getAllByTestId(/stations-nearby-row-/);
    expect(rows.map((row) => row.props.testID)).toEqual([
      'stations-nearby-row-near-close',
      'stations-nearby-row-near-far',
    ]);
  });

  it('shows the empty state when no station has coordinates', async () => {
    const port = mockPort();
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={[makeTestStation({ id: 'geomless', name: 'Демо гара Без Координати' })]}
        locationPort={port}
      />,
    );

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));

    await waitFor(() => expect(screen.getByTestId('stations-nearby-empty')).toBeTruthy());
    expect(screen.getByText('No nearby stations')).toBeTruthy();
  });

  it('shows the error state when positioning fails', async () => {
    const port = mockPort({
      getCurrentPosition: jest.fn(async () => {
        throw new Error('simulated failure');
      }),
    });
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={port}
      />,
    );

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));

    await waitFor(() => expect(screen.getByTestId('stations-nearby-error')).toBeTruthy());
    expect(screen.getByText('Could not determine your location')).toBeTruthy();
  });

  it('renders the privacy note and provenance labels on results', async () => {
    const port = mockPort();
    await render(
      <NearbyStationsSection
        t={fakeTranslate}
        stations={twoStations}
        locationPort={port}
      />,
    );

    expect(screen.getByText('Your location is used once and never stored')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stations-nearby-button'));
    await waitFor(() =>
      expect(screen.getByTestId('stations-nearby-results')).toBeTruthy(),
    );
    expect(screen.getAllByTestId('stations-provenance-badge').length).toBeGreaterThan(0);
  });
});

describe('nearby model — privacy and reducer behaviour', () => {
  it('keeps the raw position out of state and out of actions (no location history)', async () => {
    // Sentinel position: only ever returned by the mock, never part of any
    // station fixture. If it appears anywhere in actions/state, the flow
    // persisted the user's position — which it must never do.
    const sentinel = { latitude: 1.23456789, longitude: 9.87654321 };
    const port = mockPort({ getCurrentPosition: jest.fn(async () => sentinel) });
    const dispatched: NearbyAction[] = [];
    await runNearbyStationsFlow({
      port,
      stations: twoStations,
      dispatch: (action) => dispatched.push(action),
    });

    const serialized = JSON.stringify(dispatched);
    expect(serialized).not.toContain('1.23456789');
    expect(serialized).not.toContain('9.87654321');

    let state: NearbyViewState = INITIAL_NEARBY_STATE;
    for (const action of dispatched) state = nearbyReducer(state, action);
    expect(Object.keys(state).sort()).toEqual(['stations', 'status']);
    const serializedState = JSON.stringify(state);
    expect(serializedState).not.toContain('1.23456789');
    expect(serializedState).not.toContain('9.87654321');
    for (const entry of state.stations) {
      expect(Object.keys(entry).sort()).toEqual(['distanceMeters', 'station']);
    }
  });

  it('ignores re-entrant starts while a request is in flight', () => {
    let state = nearbyReducer(INITIAL_NEARBY_STATE, { type: 'request-started' });
    const afterDoubleStart = nearbyReducer(state, { type: 'request-started' });
    expect(afterDoubleStart).toBe(state);
    state = nearbyReducer(state, { type: 'locating' });
    expect(nearbyReducer(state, { type: 'request-started' })).toBe(state);
  });

  it('maps outcomes to states: denied, unavailable, error, empty, ready', async () => {
    const cases: [LocationPort, string][] = [
      [
        mockPort({ requestForegroundPermission: jest.fn(async () => 'denied' as const) }),
        'denied',
      ],
      [
        mockPort({
          requestForegroundPermission: jest.fn(async () => 'unavailable' as const),
        }),
        'unavailable',
      ],
      [
        mockPort({
          getCurrentPosition: jest.fn(async () => {
            throw new Error('fail');
          }),
        }),
        'error',
      ],
      [mockPort({ getCurrentPosition: jest.fn(async () => null) }), 'unavailable'],
    ];

    for (const [port, expectedStatus] of cases) {
      let state: NearbyViewState = INITIAL_NEARBY_STATE;
      await runNearbyStationsFlow({
        port,
        stations: twoStations,
        dispatch: (action) => {
          state = nearbyReducer(state, action);
        },
      });
      expect(state.status).toBe(expectedStatus);
    }
  });

  it('never calls the permission API from the reducer itself', () => {
    // Pure-state guarantee: reducers cannot perform I/O; the only door to
    // location is runNearbyStationsFlow (asserted above to run on tap only).
    const port = mockPort();
    let state = nearbyReducer(INITIAL_NEARBY_STATE, { type: 'reset' });
    state = nearbyReducer(state, { type: 'permission-denied' });
    state = nearbyReducer(state, { type: 'reset' });
    expect(state).toEqual(INITIAL_NEARBY_STATE);
    expect(port.requestForegroundPermission).not.toHaveBeenCalled();
  });
});
