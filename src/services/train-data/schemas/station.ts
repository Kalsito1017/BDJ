/**
 * Zod schemas for the station boundary (mirrors src/types/station.ts).
 *
 * Used for every station payload that crosses a trust boundary (provider
 * response, cached directory read back from disk). Aliases are only present
 * when the data source defines them; absent optional fields stay absent.
 */

import { z } from 'zod';
import { EntityIdSchema, GeoPointSchema, IsoDateTimeSchema } from './common';
import { InformationProvenanceSchema } from './provenance';

export const StationSchema = z.object({
  id: EntityIdSchema,
  /** Official display name exactly as supplied by the data source. */
  name: z.string().min(1),
  alternateName: z.string().min(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
  /** ISO 3166-1 alpha-2 country code (e.g. 'BG'). */
  countryCode: z.string().regex(/^[A-Za-z]{2}$/, 'Expected an ISO 3166-1 alpha-2 code'),
  location: GeoPointSchema.optional(),
  kind: z.string().min(1).optional(),
  provenance: InformationProvenanceSchema,
});

export const StationDirectorySchema = z.object({
  version: z.string().min(1),
  stations: z.array(StationSchema),
  fetchedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  attribution: z.string().optional(),
});
