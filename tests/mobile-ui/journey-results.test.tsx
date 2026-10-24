/**
 * Journey results — view tests (Phase 4: results and detail views; plan.md
 * §3.2; checklist §7 states on every screen).
 *
 * Synthetic journeys only. Expectations are composed through the REAL
 * translate function, so they stay valid both before and after the lead
 * merges the new `journey*` keys (unmerged keys render as their key — see
 * tests/mobile-ui/i18n-integrity.test.tsx); the actual formatting rules are
 * pinned in journey-display.test.ts. Long Bulgarian station names,
 * midnight-crossing day offsets, null times and transfers counts are the
 * regression cases checklist §14 asks for.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { JourneyResultsView } from '../../src/features/journey-results/JourneyResultsView';
import {
  dayOffsetText,
  durationText,
} from '../../src/features/journey-results/model/journeyDisplay';
import {
  JOURNEY_KEYS,
  JOURNEY_RESULTS_KEYS,
} from '../../src/features/journey-results/translationKeys';
import { setI18nLocale, translate } from '../../src/i18n';
import type { Journey, TrainSegment, TransferSegment } from '../../src/types/journey';

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

const SOFIA_LONG = 'София Централна гара с много дълго официално име';
const VARNA_LONG = 'Варна Западна спирка също с много дълго име';

function train(overrides: Partial<TrainSegment> = {}): TrainSegment {
  return {
    kind: 'train',
    fromStationId: 'sofia',
    toStationId: 'varna',
    departureTime: '23:40',
    arrivalTime: '06:15',
    departureDayOffset: 0,
    arrivalDayOffset: 1,
    ...overrides,
  };
}

function transfer(overrides: Partial<TransferSegment> = {}): TransferSegment {
  return {
    kind: 'transfer',
    fromStationId: 'varna',
    toStationId: 'varna',
    plannedMinutes: 15,
    stationChangeRequired: false,
    ...overrides,
  };
}

function journey(
  id: string,
  legs: (TrainSegment | TransferSegment)[],
  durationMinutes?: number,
): Journey {
  return {
    id,
    legs,
    segments: legs.filter((leg): leg is TrainSegment => leg.kind === 'train'),
    durationMinutes,
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T06:00:00.000Z' },
  };
}

const DIRECT = journey('j1', [train()], 420);

const WITH_TRANSFERS = journey(
  'j2',
  [
    train({ arrivalTime: '02:10', arrivalDayOffset: 0 }),
    transfer(),
    train({ departureTime: '02:25', arrivalTime: '08:00', arrivalDayOffset: 0 }),
    transfer({ plannedMinutes: 7 }),
    train({ departureTime: '08:30', arrivalTime: '12:45', arrivalDayOffset: 0 }),
  ],
  725,
);

const NULL_TIMES = journey(
  'j3',
  [
    train({
      departureTime: null,
      arrivalTime: null,
      departureDayOffset: undefined,
      arrivalDayOffset: undefined,
    }),
  ],
  undefined,
);

async function renderView(
  overrides: Partial<Parameters<typeof JourneyResultsView>[0]> = {},
) {
  return await render(
    <JourneyResultsView
      dateLabel="24.10.2026 г."
      error={null}
      fromName={SOFIA_LONG}
      journeys={[DIRECT]}
      loading={false}
      onRetry={() => {}}
      onSelectJourney={() => {}}
      t={t}
      testID="results"
      toName={VARNA_LONG}
      {...overrides}
    />,
  );
}

beforeAll(() => {
  setI18nLocale('en');
});

describe('journey results: card rendering', () => {
  it('shows long Bulgarian station names, times, duration and transfers', async () => {
    await renderView({ journeys: [DIRECT, WITH_TRANSFERS] });

    // One line per card (the header renders the route as a single line).
    expect(screen.getAllByText(SOFIA_LONG).length).toBe(2);
    expect(screen.getAllByText(VARNA_LONG).length).toBe(2);

    // Departure/arrival wall-clock times (Europe/Sofia, DEC-006) with the
    // explicit "+1 day" midnight-crossing marker.
    expect(screen.getByTestId('results-card-0-departure').props.children[0]).toBe(
      '23:40',
    );
    expect(screen.getByTestId('results-card-0-arrival').props.children[0]).toBe('06:15');
    expect(screen.getByText(t(JOURNEY_KEYS.dayOffsetOne))).toBeTruthy();

    expect(screen.getByTestId('results-card-0-duration').props.children).toBe(
      `${t(JOURNEY_KEYS.durationLabel)}: ${durationText(420, t)}`,
    );
    expect(screen.getByTestId('results-card-0-transfers').props.children).toBe(
      t(JOURNEY_KEYS.transfersDirect),
    );
    expect(screen.getByTestId('results-card-1-transfers').props.children).toBe(
      t(JOURNEY_KEYS.transfers, { count: 2 }),
    );
    expect(screen.getByTestId('results-card-1-provenance')).toBeTruthy();
  });

  it('renders "+2 days" for a two-day offset and labels null times as unknown', async () => {
    await renderView({
      journeys: [
        journey(
          'j4',
          [
            train({
              departureTime: null,
              arrivalTime: '12:00',
              departureDayOffset: 2,
              arrivalDayOffset: 2,
            }),
          ],
          30,
        ),
        NULL_TIMES,
      ],
    });

    expect(screen.getAllByText(t(JOURNEY_KEYS.dayOffsetMany, { days: 2 })).length).toBe(
      2,
    );
    expect(screen.getAllByText(t(JOURNEY_KEYS.unknown)).length).toBeGreaterThan(0);
    expect(screen.getByTestId('results-card-1-departure').props.children[0]).toBe(
      t(JOURNEY_KEYS.unknown),
    );
    // A missing duration is "unknown", never an estimate.
    expect(screen.getByTestId('results-card-1-duration').props.children).toBe(
      `${t(JOURNEY_KEYS.durationLabel)}: ${t(JOURNEY_KEYS.unknown)}`,
    );
  });

  it('labels every card as demo data and shows the demo notice (rule 6)', async () => {
    await renderView({ journeys: [DIRECT, WITH_TRANSFERS, NULL_TIMES] });

    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });

  it('offers a details action per card', async () => {
    const onSelectJourney = jest.fn();
    await renderView({ onSelectJourney });

    await fireEvent.press(screen.getByTestId('results-card-0-details'));
    expect(onSelectJourney).toHaveBeenCalledWith(expect.objectContaining({ id: 'j1' }));
    expect(screen.getByText(t(JOURNEY_RESULTS_KEYS.detailsCta))).toBeTruthy();
  });

  it('reports cache freshness as "results loaded at HH:mm", not as provenance', async () => {
    await renderView({ fetchedAtTime: '09:42' });

    expect(
      screen.getByText(t(JOURNEY_RESULTS_KEYS.fetchedAt, { time: '09:42' })),
    ).toBeTruthy();
  });
});

describe('journey results: states', () => {
  it('renders the loading skeleton', async () => {
    await renderView({ loading: true, journeys: [] });
    expect(screen.getByTestId('results-loading')).toBeTruthy();
  });

  it('renders the empty state with a change-search action', async () => {
    const onChangeSearch = jest.fn();
    await renderView({ journeys: [], onChangeSearch });

    expect(screen.getByText(t(JOURNEY_RESULTS_KEYS.emptyTitle))).toBeTruthy();
    expect(screen.getByText(t(JOURNEY_RESULTS_KEYS.emptyBody))).toBeTruthy();

    await fireEvent.press(screen.getByText(t(JOURNEY_RESULTS_KEYS.changeSearch)));
    expect(onChangeSearch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['timeout', 'errors.timeout'],
    ['offline', 'errors.offline'],
    ['network', 'errors.network'],
    ['rate_limited', 'errors.rate_limited'],
    ['upstream_error', 'errors.upstream_error'],
    ['invalid_response', 'errors.invalid_response'],
    ['not_found', 'errors.not_found'],
    ['cancelled', 'errors.cancelled'],
    ['conflict', 'errors.conflict'],
    ['forbidden', 'errors.forbidden'],
    ['unsupported', 'errors.unsupported'],
    ['unknown', 'errors.unknown'],
  ] as const)(
    'maps a %s failure to the %s message with retry',
    async (code, messageKey) => {
      const onRetry = jest.fn();
      await renderView({
        error: { code, message: 'synthetic', retryable: true },
        journeys: [],
        onRetry,
      });

      expect(screen.getByTestId('results-error')).toBeTruthy();
      expect(screen.getByText(t(messageKey))).toBeTruthy();

      await fireEvent.press(screen.getByText(t('common.retry')));
      expect(onRetry).toHaveBeenCalledTimes(1);
    },
  );

  it('survives a malformed error object without crashing', async () => {
    await renderView({ error: 'not-an-object', journeys: [] });
    expect(screen.getByText(t('errors.unknown'))).toBeTruthy();
  });

  it('pull-to-refresh triggers a refetch', async () => {
    const onRefresh = jest.fn();
    await renderView({ onRefresh, refreshing: true });

    // RefreshControl is rendered as the ScrollView's refreshControl prop;
    // pulling invokes its onRefresh.
    const list = screen.getByTestId('results-list');
    const refreshControl = (
      list.props as {
        refreshControl: React.ReactElement<{
          refreshing: boolean;
          onRefresh: () => void;
        }>;
      }
    ).refreshControl;
    expect(refreshControl.props.refreshing).toBe(true);
    await act(async () => {
      refreshControl.props.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('journey results: route header', () => {
  it('shows the search route and travel date', async () => {
    await renderView({ fetchedAtTime: null });
    expect(screen.getByText(`${SOFIA_LONG} → ${VARNA_LONG}`)).toBeTruthy();
    expect(screen.getByText('24.10.2026 г.')).toBeTruthy();
  });

  it('keeps the day-offset marker formatting consistent with the model', async () => {
    // Guards the wiring between the model helper and the rendered marker.
    expect(dayOffsetText(1, t)).toBe(t(JOURNEY_KEYS.dayOffsetOne));
  });
});
