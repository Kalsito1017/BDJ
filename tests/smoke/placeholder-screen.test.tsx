import { render, screen } from '@testing-library/react-native';

import PlaceholderScreen from '../../src/app/index';

/**
 * Phase 1 smoke test: the placeholder route renders and claims no train data.
 * Real feature tests belong to Waves 3+ (plan.md §11).
 *
 * Note: React Native Testing Library v14 `render` is async — always await it.
 */
describe('scaffold placeholder screen', () => {
  it('renders the placeholder and states that no timetable data exists yet', async () => {
    await render(<PlaceholderScreen />);

    expect(screen.getByText('BDZ Train Companion')).toBeTruthy();
    expect(
      screen.getByText(
        'Project scaffold placeholder. No timetable data is available in the app yet.',
      ),
    ).toBeTruthy();
  });

  it('makes no live-data, delay or official-BDZ claims', async () => {
    await render(<PlaceholderScreen />);

    // Rule 6: the scaffold must not claim live positions, delays or official
    // status. Wave 3+ screens must keep provenance labels (DEC-006).
    expect(screen.queryByText(/real[-\s]?time/i)).toBeNull();
    expect(screen.queryByText(/live (train|position|delay)/i)).toBeNull();
    expect(screen.queryByText(/official BDZ/i)).toBeNull();
    expect(screen.queryByText(/delay/i)).toBeNull();
  });
});
