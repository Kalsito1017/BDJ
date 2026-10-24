/**
 * Zod schema for the information-provenance discriminated union
 * (mirrors src/types/provenance.ts — Appendix B.1: "InformationProvenanceSchema
 * (discriminated union on `kind`)").
 *
 * Rule 6 (lead brief): the `real-time` variant is modelled here because the
 * type union has it, but NO provider may emit it until DEC-002 is superseded.
 * The mock provider emits `demo` only; a unit test asserts that for every
 * fixture (Appendix A.1).
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from './common';

const ProvenanceBaseShape = {
  /** When this information was obtained from its source (ISO 8601 UTC). */
  fetchedAt: IsoDateTimeSchema,
};

export const DemoProvenanceSchema = z.object({
  kind: z.literal('demo'),
  ...ProvenanceBaseShape,
});

export const ScheduledProvenanceSchema = z.object({
  kind: z.literal('scheduled'),
  ...ProvenanceBaseShape,
  /** The source's own "data as of" timestamp, when supplied. Never invented. */
  sourceUpdatedAt: IsoDateTimeSchema.optional(),
});

export const CachedStaleProvenanceSchema = z.object({
  kind: z.literal('cached-stale'),
  ...ProvenanceBaseShape,
  cachedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  staleReason: z.enum(['expired-ttl', 'offline', 'upstream-error']),
});

export const RealTimeProvenanceSchema = z.object({
  kind: z.literal('real-time'),
  ...ProvenanceBaseShape,
  observedAt: IsoDateTimeSchema,
  sourceId: z.string().min(1),
});

/** Discriminated on `kind` — unknown kinds reject as `invalid_response`. */
export const InformationProvenanceSchema = z.discriminatedUnion('kind', [
  DemoProvenanceSchema,
  CachedStaleProvenanceSchema,
  ScheduledProvenanceSchema,
  RealTimeProvenanceSchema,
]);
