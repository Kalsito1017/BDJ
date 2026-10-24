/**
 * Journey details — timeline view tests (Phase 4, plan.md §3.3; checklist
 * §14: long station names, Bulgarian text, midnight-crossing cases).
 *
 * Synthetic journeys only; expectations are composed through the REAL
 * translate function so they hold before and after the lead merges the new
 * `journey*`/`journey_details*` keys (see i18n-integrity.test.tsx). The
 * formatting rules themselves are pinned in journey-display.test.ts.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { JourneyDetailsView } from '../../src/features/journey-details/JourneyDetailsView';
import { JOURNEY_DETAILS_KEYS } from '../../src/features/journey-details/translationKeys';
import { JOURNEY_KEYS } from '../../src/features/journey-results/translationKeys';
import { setI18nLocale, translate } from '../../src/i18n';
import type { Journey, TrainSegment, TransferSegment } from '../../src/types/journey';
import type { Station } from '../../src/types/station';

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

const DEMO = {
  kind: 'demo',
  fetchedAt: '2026-10-24T06:00:00.000Z',
} as const;

const DEMO_STATIONS: readonly Station[] = [
  {
    id: 'sofia',
    name: 'София',
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  },
  {
    id: 'varna',
    name: 'Варна',
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  },
  {
    id: 'burgas',
    name: 'Бургас',
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  },
];

const nameFor = (stationId: string) =>
  DEMO_STATIONS.find((station) => station.id === stationId)?.name ??
  t(JOURNEY_KEYS.unknown);

function train(overrides: Partial<TrainSegment> = {}): TrainSegment {
  return {
    kind: 'train',
    fromStationId: 'sofia',
    toStationId: 'varna',
    departureTime: '23:40',
    arrivalTime: '06:15',
    trainNumber: '1234',
    provenance: DEMO,
    ...overrides,
  };
}

function transfer(overrides: Partial<TransferSegment> = {}): TransferSegment {
  return {
    kind: 'transfer',
    fromStationId: 'varna',
    toStationId: 'burgas',
    plannedMinutes: 15,
    stationChangeRequired: true,
    provenance: DEMO,
    ...overrides,
  };
}

const JOURNEY: Journey = {
  id: 'j1',
  legs: [
    train(),
    transfer(),
    train({
      fromStationId: 'varna',
      toStationId: 'burgas',
      departureTime: '06:30',
      arrivalTime: null,
      departureDayOffset: 1,
      arrivalDayOffset: 2,
      trainNumber: undefined,
      providerStatus: 'Планирано по разписание от източника',
    }),
  ],
  segments: [
    train(),
    train({
      fromStationId: 'varna',
      toStationId: 'burgas',
      departureTime: '06:30',
      arrivalTime: null,
      departureDayOffset: 1,
      arrivalDayOffset: 2,
      trainNumber: undefined,
    }),
  ],
  durationMinutes: 800,
  provenance: { kind: 'demo', fetchedAt: '2026-10-24T06:00:00.000Z' },
};

async function renderView(
  overrides: Partial<Parameters<typeof JourneyDetailsView>[0]> = {},
) {
  return await render(
    <JourneyDetailsView
      error={null}
      journey={JOURNEY}
      loading={false}
      onBack={() => {}}
      onRetry={() => {}}
      stationName={nameFor}
      t={t}
      testID="details"
      {...overrides}
    />,
  );
}

beforeAll(() => {
  setI18nLocale('en');
});

describe('journey details: timeline', () => {
  it('renders train and transfer legs in travel order with their labels', async () => {
    await renderView();

    expect(screen.getByTestId('details-leg-0')).toBeTruthy();
    expect(screen.getByTestId('details-leg-1')).toBeTruthy();
    expect(screen.getByTestId('details-leg-2')).toBeTruthy();

    expect(screen.getAllByText(t(JOURNEY_DETAILS_KEYS.legTrain)).length).toBe(2);
    expect(screen.getByText(t(JOURNEY_DETAILS_KEYS.legTransfer))).toBeTruthy();
    expect(screen.getByText('София → Варна')).toBeTruthy();
    // The transfer leg and the following train leg share the same endpoints.
    expect(screen.getAllByText('Варна → Бургас').length).toBe(2);
  });

  it('shows train numbers and labels missing ones as absent (never invented)', async () => {
    await renderView();

    // Exactly one leg has a train number: exactly one row, and the missing
    // number on the other leg is omitted rather than invented.
    expect(
      screen.getAllByText(t(JOURNEY_DETAILS_KEYS.trainNumber, { number: '1234' })).length,
    ).toBe(1);
  });

  it('marks midnight crossings explicitly and labels null times as unknown', async () => {
    await renderView();

    expect(screen.getByTestId('details-leg-0-arrival').props.children[0]).toBe('06:15');
    expect(screen.getByTestId('details-leg-2-departure').props.children[0]).toBe('06:30');
    expect(screen.getAllByText(t(JOURNEY_KEYS.dayOffsetOne)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t(JOURNEY_KEYS.dayOffsetMany, { days: 2 })).length).toBe(
      1,
    );

    expect(screen.getByTestId('details-leg-2-arrival').props.children[0]).toBe(
      t(JOURNEY_KEYS.unknown),
    );
  });

  it('shows transfer connection time and the station-change requirement', async () => {
    await renderView();

    expect(screen.getByTestId('details-leg-1-wait').props.children).toBe(
      t(JOURNEY_DETAILS_KEYS.transferWait, { minutes: 15 }),
    );
    expect(screen.getByText(t(JOURNEY_DETAILS_KEYS.stationChange))).toBeTruthy();
  });

  it('labels an unknown connection time instead of estimating it', async () => {
    await renderView({
      journey: {
        ...JOURNEY,
        legs: [train(), transfer({ plannedMinutes: undefined }), train()],
        segments: [train(), train()],
      },
    });

    expect(screen.getByTestId('details-leg-1-wait').props.children).toBe(
      t(JOURNEY_DETAILS_KEYS.transferWait, {
        minutes: t(JOURNEY_KEYS.unknown),
      }),
    );
  });

  it('attributes a provider note to the data source', async () => {
    await renderView();

    expect(screen.getByTestId('details-leg-2-provider-note').props.children).toBe(
      `${t(JOURNEY_DETAILS_KEYS.providerNote)}: Планирано по разписание от източника`,
    );
  });

  it('resolves station names through the injected lookup and labels unknown ids', async () => {
    await renderView({
      journey: {
        ...JOURNEY,
        legs: [train({ toStationId: 'nowhere' })],
        segments: [train({ toStationId: 'nowhere' })],
      },
    });

    // The summary line and the leg row both show the unresolvable name.
    expect(screen.getAllByText(`София → ${t(JOURNEY_KEYS.unknown)}`).length).toBe(2);
  });

  it('labels every leg as demo data and shows the demo notice (rule 6)', async () => {
    await renderView();

    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });

  it('summarises duration and transfers', async () => {
    await renderView();
    expect(screen.getByTestId('details-summary').props.children).toContain(
      t(JOURNEY_KEYS.durationLabel),
    );
    expect(screen.getByTestId('details-summary').props.children).toContain(
      t(JOURNEY_KEYS.transfers, { count: 1 }),
    );
  });
});

describe('journey details: states and navigation', () => {
  it('calls onBack from the back control', async () => {
    const onBack = jest.fn();
    await renderView({ onBack });

    await fireEvent.press(screen.getByTestId('details-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the loading skeleton', async () => {
    await renderView({ journey: null, loading: true });
    expect(screen.getByTestId('details-loading')).toBeTruthy();
  });

  it.each([
    ['timeout', 'errors.timeout'],
    ['cancelled', 'errors.cancelled'],
    ['offline', 'errors.offline'],
    ['network', 'errors.network'],
    ['rate_limited', 'errors.rate_limited'],
    ['upstream_error', 'errors.upstream_error'],
    ['invalid_response', 'errors.invalid_response'],
    ['not_found', 'errors.not_found'],
    ['conflict', 'errors.conflict'],
    ['forbidden', 'errors.forbidden'],
    // The details screen can receive this one directly: useJourney rejects
    // 'unsupported' when the provider has no getJourney capability.
    ['unsupported', 'errors.unsupported'],
    ['unknown', 'errors.unknown'],
  ] as const)(
    'maps a %s failure to the %s message with retry',
    async (code, messageKey) => {
      const onRetry = jest.fn();
      await renderView({
        error: { code, message: 'synthetic', retryable: true },
        journey: null,
        onRetry,
      });

      expect(screen.getByTestId('details-error')).toBeTruthy();
      expect(screen.getByText(t(messageKey))).toBeTruthy();

      await fireEvent.press(screen.getByText(t('common.retry')));
      expect(onRetry).toHaveBeenCalledTimes(1);
    },
  );

  it('shows the not-found state for a missing journey without a provider error', async () => {
    await renderView({ journey: null });
    expect(screen.getByTestId('details-empty')).toBeTruthy();
    expect(screen.getByText(t('errors.not_found'))).toBeTruthy();
  });
});
