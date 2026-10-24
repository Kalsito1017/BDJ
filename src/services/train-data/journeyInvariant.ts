/**
 * Runtime validator for the documented journey invariant (DEC-006; the
 * contract test in tests/types/journey-invariant.test.ts pins the same
 * semantics):
 *
 *   journey.segments === journey.legs.filter(l => l.kind === 'train')
 *
 * i.e. `segments` holds exactly the train legs of `legs`, same order, same
 * contents (object identity is lost across the wire, so contents are compared
 * structurally). Used by:
 *  - the `JourneySchema` refinement (a broken invariant is an
 *    `invalid_response`, never silently repaired — data is never invented);
 *  - the fixture tests (every MockTrainDataProvider fixture is checked).
 */

import type { Journey, TrainSegment } from '../../types/journey';

/** Structural equality for the plain JSON shapes that make up a leg. */
function structurallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, index) => structurallyEqual(item, b[index]))
    );
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const aKeys = Object.keys(a as Record<string, unknown>).filter(
      (key) => (a as Record<string, unknown>)[key] !== undefined,
    );
    const bKeys = Object.keys(b as Record<string, unknown>).filter(
      (key) => (b as Record<string, unknown>)[key] !== undefined,
    );
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      structurallyEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
}

/**
 * Return human-readable violations of the invariant; an empty array means the
 * journey is consistent. Violation strings are developer-facing labels — no
 * payload values, no PII.
 */
export function validateJourneyInvariant(journey: Journey): string[] {
  const violations: string[] = [];
  const trainLegs = journey.legs.filter(
    (leg): leg is TrainSegment => leg.kind === 'train',
  );

  journey.segments.forEach((segment, index) => {
    if (segment.kind !== 'train') {
      violations.push(`segments[${index}]: kind must be 'train'`);
    }
  });

  if (journey.segments.length !== trainLegs.length) {
    violations.push(
      `segments: length ${journey.segments.length} does not match train legs (${trainLegs.length})`,
    );
    return violations;
  }

  journey.segments.forEach((segment, index) => {
    if (!structurallyEqual(segment, trainLegs[index])) {
      violations.push(
        `segments[${index}]: differs from legs train-leg at position ${index}`,
      );
    }
  });

  return violations;
}
