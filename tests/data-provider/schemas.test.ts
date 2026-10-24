/**
 * Zod boundary-schema tests (DEC-007; docs/decisions.md Appendix B.5).
 *
 * Covered: valid fixtures parse; unknown extra fields are tolerated but
 * stripped; missing optional fields stay absent and null times stay null;
 * missing required fields, wrong types, unknown discriminants and
 * out-of-range numbers reject; the journey invariant refinement rejects
 * structurally inconsistent journeys; failures surface as ProviderError
 * 'invalid_response' with schema PATHS only (no payload values — no PII);
 * a truncated-JSON corpus never crashes the boundary.
 */

import { z } from 'zod';
import type { Journey, JourneySearchResult } from '../../src/types/journey';
import type { Station, StationDirectory } from '../../src/types/station';
import type { InformationProvenance } from '../../src/types/provenance';
import { parseExternalPayload } from '../../src/services/api/parsePayload';
import {
  isProviderError,
  safePayloadSummary,
} from '../../src/services/api/providerErrors';
import {
  InformationProvenanceSchema,
  JourneySchema,
  JourneySearchResultSchema,
  StationDirectorySchema,
  StationSchema,
} from '../../src/services/train-data/schemas';
import {
  DEMO_STATION_PAYLOADS,
  MALFORMED_JOURNEY_INVARIANT_PAYLOAD,
  MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD,
  MALFORMED_STATION_DIRECTORY_PAYLOAD,
  MALFORMED_STATION_PAYLOAD,
} from '../../src/services/train-data/fixtures';

/* ------------------------------------------------------------------ */
/* Compile-time: parsed payloads are assignable to the domain types.    */
/* ------------------------------------------------------------------ */

type Expect<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;

export type SchemaTypeChecks = [
  Expect<Extends<z.infer<typeof StationSchema>, Station>>,
  Expect<Extends<z.infer<typeof StationDirectorySchema>, StationDirectory>>,
  Expect<Extends<z.infer<typeof JourneySchema>, Journey>>,
  Expect<Extends<z.infer<typeof JourneySearchResultSchema>, JourneySearchResult>>,
  Expect<Extends<z.infer<typeof InformationProvenanceSchema>, InformationProvenance>>,
];

/* ------------------------------------------------------------------ */

const DEMO_FETCHED_AT = '2026-01-01T00:00:00.000Z';

const minimalLeg = {
  kind: 'train',
  fromStationId: 'demo-a',
  toStationId: 'demo-b',
  departureTime: null,
  arrivalTime: null,
};

const minimalJourney = {
  id: 'demo-journey-minimal',
  segments: [minimalLeg],
  legs: [minimalLeg],
  provenance: { kind: 'demo', fetchedAt: DEMO_FETCHED_AT },
};

function expectInvalidResponse(parse: () => unknown): {
  code: string;
  diagnostics?: readonly string[];
} {
  try {
    parse();
  } catch (error: unknown) {
    expect(isProviderError(error)).toBe(true);
    const providerError = error as { code: string; diagnostics?: readonly string[] };
    expect(providerError.code).toBe('invalid_response');
    return providerError;
  }
  throw new Error('expected the payload to be rejected');
}

describe('boundary schemas — accept valid payloads', () => {
  it('parses every demo station payload', () => {
    for (const payload of DEMO_STATION_PAYLOADS) {
      expect(StationSchema.safeParse(payload).success).toBe(true);
    }
  });

  it('parses minimal journeys with null times and no optional fields', () => {
    const parsed = JourneySchema.parse(minimalJourney);
    expect(parsed.segments[0].departureTime).toBeNull();
    expect(parsed.segments[0].arrivalTime).toBeNull();
    // Missing optional fields stay ABSENT — "unknown" in the UI, never invented.
    expect('trainNumber' in parsed.segments[0]).toBe(false);
    expect('durationMinutes' in parsed).toBe(false);
    expect('sourceUpdatedAt' in parsed).toBe(false);
  });
});

describe('boundary schemas — tolerance and stripping (Appendix B.3)', () => {
  it('tolerates unknown extra fields but never passes them through', () => {
    const payload = {
      ...minimalJourney,
      someFutureField: { nested: 'value' },
      segments: [{ ...minimalLeg, anotherExtra: 'x' }],
      legs: [{ ...minimalLeg, anotherExtra: 'x' }],
    };
    const parsed = JourneySchema.parse(payload);
    expect('someFutureField' in parsed).toBe(false);
    expect('anotherExtra' in parsed.segments[0]).toBe(false);
    expect('anotherExtra' in parsed.legs[0]).toBe(false);
  });
});

describe('boundary schemas — reject invalid payloads (Appendix B.5)', () => {
  it('rejects missing required fields', () => {
    const result = StationSchema.safeParse({
      id: 'demo-a',
      countryCode: 'BG',
      provenance: { kind: 'demo', fetchedAt: DEMO_FETCHED_AT },
      // name missing
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong types', () => {
    expect(StationSchema.safeParse(MALFORMED_STATION_PAYLOAD).success).toBe(false);
    expect(
      JourneySearchResultSchema.safeParse(MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD)
        .success,
    ).toBe(false);
    expect(
      StationDirectorySchema.safeParse(MALFORMED_STATION_DIRECTORY_PAYLOAD).success,
    ).toBe(false);
  });

  it('rejects unknown discriminant values', () => {
    const badProvenance = { kind: 'mock', fetchedAt: DEMO_FETCHED_AT };
    expect(InformationProvenanceSchema.safeParse(badProvenance).success).toBe(false);
    const badLeg = { ...minimalLeg, kind: 'teleport' };
    expect(
      JourneySchema.safeParse({ ...minimalJourney, segments: [badLeg], legs: [badLeg] })
        .success,
    ).toBe(false);
  });

  it('rejects out-of-range and non-integer numbers', () => {
    const badPoint = {
      id: 'demo-a',
      name: 'Демо',
      countryCode: 'BG',
      location: { latitude: 900, longitude: 23 },
      provenance: { kind: 'demo', fetchedAt: DEMO_FETCHED_AT },
    };
    expect(StationSchema.safeParse(badPoint).success).toBe(false);

    const negativeDayOffset = {
      ...minimalJourney,
      segments: [{ ...minimalLeg, departureDayOffset: -1 }],
      legs: [{ ...minimalLeg, departureDayOffset: -1 }],
    };
    expect(JourneySchema.safeParse(negativeDayOffset).success).toBe(false);

    const badTransfer = {
      ...minimalJourney,
      segments: [minimalLeg],
      legs: [
        minimalLeg,
        {
          kind: 'transfer',
          fromStationId: 'demo-b',
          toStationId: 'demo-c',
          plannedMinutes: 2.5,
          stationChangeRequired: false,
        },
      ],
    };
    expect(JourneySchema.safeParse(badTransfer).success).toBe(false);
    expect(
      JourneySchema.safeParse({ ...minimalJourney, durationMinutes: -5.5 }).success,
    ).toBe(false);
  });

  it('rejects a journey that violates the segments/legs invariant', () => {
    const result = JourneySchema.safeParse(MALFORMED_JOURNEY_INVARIANT_PAYLOAD);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'segments')).toBe(
        true,
      );
    }
  });

  it('reports schema paths in diagnostics, never payload values', () => {
    const error = expectInvalidResponse(() =>
      parseExternalPayload(
        JourneySearchResultSchema,
        MALFORMED_JOURNEY_SEARCH_RESULT_PAYLOAD,
        'Test payload',
      ),
    );
    expect(error.diagnostics).toBeDefined();
    expect((error.diagnostics ?? []).length).toBeGreaterThan(0);
    for (const line of error.diagnostics ?? []) {
      // Shape: "<schema path>: <issue code>" — nothing else is allowed.
      expect(line).toMatch(/^[A-Za-z0-9_()[\].]+: [a-z_]+$/);
    }
  });

  it('summarises payloads without leaking non-identifier keys (no PII)', () => {
    const summary = safePayloadSummary({
      'user@example.com': { secret: 'x' },
      ok_key: 1,
    });
    expect(summary).not.toContain('user@example.com');
    expect(summary).not.toContain('secret');
    expect(safePayloadSummary([1, 2, 3])).toBe('array(length=3)');
  });

  it('never crashes on a corpus of truncated JSON (Appendix B.5)', () => {
    const serialized = JSON.stringify(MALFORMED_STATION_DIRECTORY_PAYLOAD);
    for (let cut = 0; cut < serialized.length; cut += 1) {
      const fragment = serialized.slice(0, cut);
      let parsed: unknown;
      try {
        parsed = JSON.parse(fragment);
      } catch {
        continue; // invalid JSON is the parser's business, not ours
      }
      // Whatever DID parse must be rejected/accepted by the schema without
      // throwing anything but a ZodError result.
      expect(() => StationDirectorySchema.safeParse(parsed)).not.toThrow();
    }
  });
});

describe('boundary parse helper', () => {
  it('returns typed output for valid payloads', () => {
    const station = parseExternalPayload(StationSchema, DEMO_STATION_PAYLOADS[0], 'Test');
    expect(station.id).toBe('demo-station-sofia-central');
  });

  it('rejects non-object garbage with invalid_response', () => {
    const error = expectInvalidResponse(() =>
      parseExternalPayload(StationSchema, 'not a station', 'Test payload'),
    );
    expect(error.code).toBe('invalid_response');
  });
});
