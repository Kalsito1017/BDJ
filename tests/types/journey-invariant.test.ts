/**
 * Journey model contract tests (plan.md §3/§4 extended; docs/decisions.md
 * DEC-006).
 *
 * The documented invariant (src/types/journey.ts header, DEC-006):
 *   `journey.segments` contains exactly the train legs of `journey.legs`,
 *   in the same order.
 * i.e. segments === legs.filter(l => l.kind === 'train').
 *
 * Type-level assertions are enforced by `npm run typecheck`; the runtime
 * helper below is the fixture validator Phase 4 must run over every
 * MockTrainDataProvider fixture (DEC-006: "mitigated by the stated invariant
 * + a Phase 4 test").
 */

import type {
  Journey,
  JourneyLeg,
  TrainSegment,
  TransferSegment,
} from '../../src/types/journey';
import type { InformationProvenance } from '../../src/types/provenance';

/* ------------------------------------------------------------------ */
/* Type-level helpers (compile-time only)                              */
/* ------------------------------------------------------------------ */

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type JourneyTypeChecks = [
  // `segments` holds exactly the train legs of the timeline.
  Expect<Equal<Journey['segments'][number], Extract<JourneyLeg, { kind: 'train' }>>>,
  // `legs` is precisely the two documented leg kinds.
  Expect<Equal<JourneyLeg, TrainSegment | TransferSegment>>,
  Expect<Equal<TrainSegment['kind'], 'train'>>,
  Expect<Equal<TransferSegment['kind'], 'transfer'>>,
  // A transfer is never a train segment (no overlap in the union).
  Expect<Equal<Extract<TrainSegment, { kind: 'transfer' }>, never>>,
  // Null times are allowed and mean "unknown", never an estimate.
  Expect<Equal<TrainSegment['departureTime'], TrainSegment['arrivalTime']>>,
];

/* ------------------------------------------------------------------ */
/* Spec-level runtime validator (asserts what "matches" means)         */
/* ------------------------------------------------------------------ */

function trainLegsOf(journey: Journey): TrainSegment[] {
  return journey.legs.filter((leg): leg is TrainSegment => leg.kind === 'train');
}

/** Fails (throws via Jest) unless the documented invariant holds. */
function expectSegmentsMatchTrainLegs(journey: Journey): void {
  const trainLegs = trainLegsOf(journey);
  expect(journey.segments).toEqual(trainLegs);
  journey.segments.forEach((segment) => {
    expect(segment.kind).toBe('train');
  });
}

/* ------------------------------------------------------------------ */
/* Demo fixtures — synthetic values only, never presented as real BDZ  */
/* data (provenance: demo). No personal data.                           */
/* ------------------------------------------------------------------ */

const demo: InformationProvenance = { kind: 'demo', fetchedAt: '2026-10-22T09:00:00Z' };

const firstTrain: TrainSegment = {
  kind: 'train',
  fromStationId: 'demo-station-a',
  toStationId: 'demo-station-b',
  departureTime: '00:15',
  arrivalTime: '03:45',
  trainNumber: 'DEMO-1',
  departureDayOffset: 0,
  arrivalDayOffset: 1,
  provenance: demo,
};

const transfer: TransferSegment = {
  kind: 'transfer',
  fromStationId: 'demo-station-b',
  toStationId: 'demo-station-c',
  plannedMinutes: 25,
  stationChangeRequired: true,
  provenance: demo,
};

const secondTrain: TrainSegment = {
  kind: 'train',
  fromStationId: 'demo-station-c',
  toStationId: 'demo-station-d',
  departureTime: null, // unknown from the source — shown as "unknown"
  arrivalTime: '07:10',
  trainNumber: 'DEMO-2',
  provenance: demo,
};

// @ts-expect-error — a transfer leg is never assignable to `segments` (train legs only).
const segmentsWithTransfer: Journey['segments'] = [firstTrain, transfer];

function makeJourney(overrides: Partial<Journey>): Journey {
  return {
    id: 'demo-journey-1',
    legs: [firstTrain, transfer, secondTrain],
    segments: [firstTrain, secondTrain],
    durationMinutes: 415,
    provenance: demo,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Runtime assertions                                                  */
/* ------------------------------------------------------------------ */

describe('journey segments/legs invariant (DEC-006)', () => {
  it('accepts a journey whose segments are exactly the train legs, in order', () => {
    const journey = makeJourney({});
    expectSegmentsMatchTrainLegs(journey);
    expect(journey.segments).toHaveLength(2);
    expect(journey.legs).toHaveLength(3);
  });

  it('ignores transfer legs when projecting segments', () => {
    const journey = makeJourney({});
    expect(trainLegsOf(journey)).not.toContain(transfer);
    expect(journey.segments.map((s) => s.kind)).toEqual(['train', 'train']);
  });

  it('rejects a journey whose segments drop a train leg', () => {
    const journey = makeJourney({ segments: [firstTrain] });
    expect(() => expectSegmentsMatchTrainLegs(journey)).toThrow();
  });

  it('rejects a journey whose segments contain an extra or duplicated leg', () => {
    const journey = makeJourney({ segments: [firstTrain, secondTrain, secondTrain] });
    expect(() => expectSegmentsMatchTrainLegs(journey)).toThrow();
  });

  it('rejects a journey whose segments are out of travel order', () => {
    const journey = makeJourney({ segments: [secondTrain, firstTrain] });
    expect(() => expectSegmentsMatchTrainLegs(journey)).toThrow();
  });

  it('rejects a journey whose segments include a transfer leg', () => {
    const bogus = [firstTrain, transfer as unknown as TrainSegment, secondTrain];
    const journey = makeJourney({ segments: bogus });
    expect(() => expectSegmentsMatchTrainLegs(journey)).toThrow();
  });

  it('allows null times (rendered as "unknown") without breaking the projection', () => {
    const journey = makeJourney({});
    expect(secondTrain.departureTime).toBeNull();
    expectSegmentsMatchTrainLegs(journey);
  });

  it('keeps the compile-time negative sample referenced (guarantee lives in typecheck)', () => {
    // The value is only constructed so `npm run typecheck` fails if `segments`
    // ever accepts transfer legs.
    expect(segmentsWithTransfer).toHaveLength(2);
  });
});
