/**
 * Zod schemas for the journey boundary (mirrors src/types/journey.ts).
 *
 * `JourneySchema` enforces the documented DEC-006 invariant at the boundary:
 * `segments === legs.filter(l => l.kind === 'train')`. A payload that violates
 * it is an `invalid_response` — segments are NEVER re-derived from legs, because
 * silently repairing untrusted data is a form of inventing it (plan.md §4).
 *
 * Null departure/arrival times are valid and mean "unknown" (rendered as
 * "unknown", never estimated). Day offsets carry midnight crossings.
 */

import { z } from 'zod';
import {
  DayOffsetSchema,
  EntityIdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  LocalTimeOfDaySchema,
  MAX_NAME_LENGTH,
} from './common';
import { InformationProvenanceSchema } from './provenance';
import { validateJourneyInvariant } from '../journeyInvariant';

/** Search input echo (plan.md §4 `JourneySearch`, extended — DEC-006). */
export const JourneySearchSchema = z.object({
  fromStationId: EntityIdSchema,
  toStationId: EntityIdSchema,
  date: IsoDateSchema,
  time: LocalTimeOfDaySchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const TrainSegmentSchema = z.object({
  kind: z.literal('train'),
  fromStationId: EntityIdSchema,
  toStationId: EntityIdSchema,
  /** Planned `HH:mm` (Europe/Sofia); null = "unknown", never estimated. */
  departureTime: LocalTimeOfDaySchema.nullable(),
  arrivalTime: LocalTimeOfDaySchema.nullable(),
  trainNumber: z.string().min(1).max(100).optional(),
  departureDayOffset: DayOffsetSchema.optional(),
  arrivalDayOffset: DayOffsetSchema.optional(),
  trainCategory: z.string().min(1).max(100).optional(),
  trainName: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
  /** Provider-supplied status verbatim — NOT a delay/real-time claim. */
  providerStatus: z.string().min(1).max(300).optional(),
  provenance: InformationProvenanceSchema.optional(),
});

export const TransferSegmentSchema = z.object({
  kind: z.literal('transfer'),
  fromStationId: EntityIdSchema,
  toStationId: EntityIdSchema,
  plannedMinutes: z.number().int().min(0).max(10_000).optional(),
  stationChangeRequired: z.boolean(),
  provenance: InformationProvenanceSchema.optional(),
});

/** Full timeline entry — discriminated on `kind`. */
export const JourneyLegSchema = z.discriminatedUnion('kind', [
  TrainSegmentSchema,
  TransferSegmentSchema,
]);

export const JourneySchema = z
  .object({
    id: EntityIdSchema,
    /** Bounded (DEC-019 W3-M1): no real journey has hundreds of legs. */
    segments: z.array(TrainSegmentSchema).max(50),
    legs: z.array(JourneyLegSchema).max(50),
    durationMinutes: z.number().int().min(0).max(100_000).optional(),
    sourceUpdatedAt: IsoDateTimeSchema.optional(),
    fetchedAt: IsoDateTimeSchema.optional(),
    provenance: InformationProvenanceSchema,
  })
  .superRefine((journey, ctx) => {
    for (const violation of validateJourneyInvariant(journey)) {
      ctx.addIssue({ code: 'custom', message: violation, path: ['segments'] });
    }
  });

export const JourneySearchResultSchema = z.object({
  search: JourneySearchSchema,
  /** Bounded (DEC-019 W3-M1). */
  journeys: z.array(JourneySchema).max(200),
  fetchedAt: IsoDateTimeSchema,
  provenance: InformationProvenanceSchema,
});
