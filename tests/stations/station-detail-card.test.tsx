/**
 * Station detail card — verified-fields-only behaviour (plan.md 17.5:
 * "Station detail cards showing only verified data"; missing data renders
 * as "unknown", never invented) and mandatory demo labelling (rule 6).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { StationDetailCard } from '../../src/features/stations/components/StationDetailCard';
import { fakeTranslate, makeTestStation } from './testSupport';

describe('StationDetailCard', () => {
  it('shows "unknown" for every missing field and never invents values', async () => {
    const sparse = makeTestStation({
      id: 'demo-sparse',
      name: 'Демо гара Празна',
      // no alternateName, no aliases, no kind, no location
    });

    await render(<StationDetailCard t={fakeTranslate} station={sparse} />);

    // Six field rows in total.
    expect(screen.getAllByTestId('stations-detail-value')).toHaveLength(6);
    // Four of them are missing from the dataset -> exactly four "unknown".
    expect(screen.getAllByText('unknown')).toHaveLength(4);
    // Name and country are verified fixture data and are shown as such
    // (the name appears as the card title and in the Name field row).
    expect(screen.getAllByText('Демо гара Празна')).toHaveLength(2);
    expect(screen.getByText('BG')).toBeTruthy();
    // No coordinate-looking text appears for the missing location.
    expect(screen.queryByText(/\d+\.\d+, \d+\.\d+/)).toBeNull();
  });

  it('shows every field when the dataset provides them', async () => {
    const full = makeTestStation({
      id: 'demo-full',
      name: 'Демо гара Пълна',
      alternateName: 'Demo Station Full',
      aliases: ['Демо Пълна Център', 'Demo Full Central'],
      kind: 'demo-station',
      location: { latitude: 42.5, longitude: 23.25 },
    });

    await render(<StationDetailCard t={fakeTranslate} station={full} />);

    expect(screen.queryByText('unknown')).toBeNull();
    expect(screen.getByText('Demo Station Full')).toBeTruthy();
    expect(screen.getByText('Демо Пълна Център, Demo Full Central')).toBeTruthy();
    expect(screen.getByText('demo-station')).toBeTruthy();
    expect(screen.getByText('42.5000, 23.2500')).toBeTruthy();
  });

  it('always shows the provenance label and the demo notice (rule 6)', async () => {
    await render(
      <StationDetailCard
        t={fakeTranslate}
        station={makeTestStation({ id: 'demo-badge' })}
      />,
    );

    expect(screen.getByTestId('stations-provenance-badge')).toBeTruthy();
    // "Demo data" appears in the provenance badge and the demo notice title.
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(0);
    expect(screen.getByTestId('stations-demo-notice')).toBeTruthy();
    expect(
      screen.getByText('Synthetic demo dataset, not real BDZ stations'),
    ).toBeTruthy();
  });

  it('invokes onClose from the close control', async () => {
    const onClose = jest.fn();
    await render(
      <StationDetailCard
        t={fakeTranslate}
        station={makeTestStation({ id: 'demo-close' })}
        onClose={onClose}
      />,
    );

    await fireEvent.press(screen.getByTestId('stations-detail-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
