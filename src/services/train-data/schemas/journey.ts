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
} from './common';
import { InformationProvenanceSchema } from './provenance';
import { validateJourneyInvariant } from '../journeyInvariant';

/** Search input echo (plan.md §4 `JourneySearch`, extended — DEC-006). */
export const JourneySearchSchema = z.object({
  fromStationId: z.string().min(1),
  toStationId: z.string().min(1),
  date: IsoDateSchema,
  time: LocalTimeOfDaySchema.optional(),
  limit: z.number().int().min(1).optional(),
});

export const TrainSegmentSchema = z.object({
  kind: z.literal('train'),
  fromStationId: z.string().min(1),
  toStationId: z.string().min(1),
  /** Planned `HH:mm` (Europe/Sofia); null = "unknown", never estimated. */
  departureTime: LocalTimeOfDaySchema.nullable(),
  arrivalTime: LocalTimeOfDaySchema.nullable(),
  trainNumber: z.string().min(1).optional(),
  departureDayOffset: DayOffsetSchema.optional(),
  arrivalDayOffset: DayOffsetSchema.optional(),
  trainCategory: z.string().min(1).optional(),
  trainName: z.string().min(1).optional(),
  /** Provider-supplied status verbatim — NOT a delay/real-time claim. */
  providerStatus: z.string().min(1).optional(),
  provenance: InformationProvenanceSchema.optional(),
});

export const TransferSegmentSchema = z.object({
  kind: z.literal('transfer'),
  fromStationId: z.string().min(1),
  toStationId: z.string().min(1),
  plannedMinutes: z.number().int().min(0).optional(),
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
    segments: z.array(TrainSegmentSchema),
    legs: z.array(JourneyLegSchema),
    durationMinutes: z.number().int().min(0).optional(),
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
  journeys: z.array(JourneySchema),
  fetchedAt: IsoDateTimeSchema,
  provenance: InformationProvenanceSchema,
});
