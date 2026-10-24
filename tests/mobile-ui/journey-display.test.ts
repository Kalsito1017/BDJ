/**
 * Journey display model — pure unit tests with an injected translate
 * function (journey-results + journey-details share this module).
 *
 * Covers the Phase 3/4 rendering rules: HH:mm times verbatim (Europe/Sofia,
 * DEC-006), "+N day(s)" midnight-crossing markers, transfers count,
 * duration formatting and the localized "unknown" for missing values —
 * never invented (plan.md §3.2). Synthetic data only.
 */

import {
  dayOffsetText,
  durationText,
  firstTrainLeg,
  journeyLegs,
  lastTrainLeg,
  routeA11yText,
  timeText,
  transfersCount,
  transfersText,
  type Translate,
} from '../../src/features/journey-results/model/journeyDisplay';
import { JOURNEY_KEYS } from '../../src/features/journey-results/translationKeys';
import type {
  Journey,
  JourneyLeg,
  TrainSegment,
  TransferSegment,
} from '../../src/types/journey';
import type { InformationProvenance } from '../../src/types/provenance';

const DEMO: InformationProvenance = {
  kind: 'demo',
  fetchedAt: '2026-10-24T00:00:00.000Z',
};

/** English test strings keyed by the contract keys used here. */
const TEST_STRINGS: Readonly<Record<string, string>> = {
  [JOURNEY_KEYS.unknown]: 'Unknown',
  [JOURNEY_KEYS.dayOffsetOne]: '+1 day',
  [JOURNEY_KEYS.dayOffsetMany]: '+{days} days',
  [JOURNEY_KEYS.durationValue]: '{hours}h {minutes}m',
  [JOURNEY_KEYS.durationMinutesValue]: '{minutes} min',
  [JOURNEY_KEYS.transfers]: 'Transfers: {count}',
  [JOURNEY_KEYS.transfersDirect]: 'No transfers',
  [JOURNEY_KEYS.routeA11y]: 'From {from} to {to}',
};

const t: Translate = (key, params) => {
  let text = TEST_STRINGS[key] ?? key;
  for (const [name, value] of Object.entries(params ?? {})) {
    text = text.replace(`{${name}}`, String(value));
  }
  return text;
};

function train(overrides: Partial<TrainSegment> = {}): TrainSegment {
  return {
    kind: 'train',
    fromStationId: 'sofia',
    toStationId: 'varna',
    departureTime: '08:35',
    arrivalTime: '10:20',
    ...overrides,
  };
}

function transfer(overrides: Partial<TransferSegment> = {}): TransferSegment {
  return {
    kind: 'transfer',
    fromStationId: 'varna',
    toStationId: 'varna',
    stationChangeRequired: false,
    ...overrides,
  };
}

function journey(legs: JourneyLeg[], durationMinutes?: number): Journey {
  return {
    id: 'j1',
    legs,
    segments: legs.filter((leg): leg is TrainSegment => leg.kind === 'train'),
    durationMinutes,
    provenance: DEMO,
  };
}

describe('time and day-offset rendering', () => {
  it('renders HH:mm verbatim and labels null/absent/malformed times as unknown', () => {
    expect(timeText('23:59', t)).toBe('23:59');
    expect(timeText(null, t)).toBe('Unknown');
    expect(timeText(undefined, t)).toBe('Unknown');
    expect(timeText('25:61', t)).toBe('Unknown');
    expect(timeText('8:05', t)).toBe('Unknown');
  });

  it('renders explicit +N day markers only for real midnight crossings', () => {
    expect(dayOffsetText(undefined, t)).toBeNull();
    expect(dayOffsetText(0, t)).toBeNull();
    expect(dayOffsetText(1, t)).toBe('+1 day');
    expect(dayOffsetText(2, t)).toBe('+2 days');
    expect(dayOffsetText(-1, t)).toBeNull();
    expect(dayOffsetText(Number.NaN, t)).toBeNull();
  });
});

describe('duration and transfers rendering', () => {
  it('formats durations over an hour and under an hour', () => {
    expect(durationText(155, t)).toBe('2h 35m');
    expect(durationText(60, t)).toBe('1h 0m');
    expect(durationText(35, t)).toBe('35 min');
    expect(durationText(0, t)).toBe('0 min');
    expect(durationText(undefined, t)).toBe('Unknown');
    expect(durationText(-5, t)).toBe('Unknown');
  });

  it('counts transfers between train legs and labels zero as direct', () => {
    expect(transfersText(transfersCount(journey([train()])), t)).toBe('No transfers');
    expect(transfersText(transfersCount(journey([train(), train()])), t)).toBe(
      'Transfers: 1',
    );
    expect(transfersCount(journey([train(), transfer(), train(), train()]))).toBe(2);
    expect(transfersCount(journey([]))).toBe(0);
  });

  it('composes an accessible route name', () => {
    expect(routeA11yText('София', 'Варна', t)).toBe('From София to Варна');
  });
});

describe('journey projections', () => {
  it('takes the first and last train legs as the card endpoints', () => {
    const three = journey([train(), transfer(), train(), transfer(), train()]);
    expect(firstTrainLeg(three)?.fromStationId).toBe('sofia');
    expect(lastTrainLeg(three)?.toStationId).toBe('varna');
  });

  it('falls back to segments when a result has no legs timeline', () => {
    const withoutLegs = {
      ...journey([train()]),
      legs: undefined,
    } as unknown as Journey;
    expect(journeyLegs(withoutLegs)).toHaveLength(1);
    expect(journeyLegs(journey([train(), transfer()]))).toHaveLength(2);
  });
});
