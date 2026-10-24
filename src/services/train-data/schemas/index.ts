/**
 * Boundary schema barrel (Appendix B.1). Schemas mirror `src/types/` — one
 * module per boundary. Order and ticket schemas (`OrderSchema`, `TicketSchema`)
 * belong in `src/services/ticketing/schemas/` and are intentionally NOT here:
 * ticketing is behind the `ticketSales` flag (DEC-004) and its mock provider is
 * a later phase (Appendix A.2).
 */

export {
  DayOffsetSchema,
  EntityIdSchema,
  GeoPointSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  LocalTimeOfDaySchema,
  MoneySchema,
} from './common';
export {
  CachedStaleProvenanceSchema,
  DemoProvenanceSchema,
  InformationProvenanceSchema,
  RealTimeProvenanceSchema,
  ScheduledProvenanceSchema,
} from './provenance';
export { StationDirectorySchema, StationSchema } from './station';
export {
  JourneyLegSchema,
  JourneySchema,
  JourneySearchResultSchema,
  JourneySearchSchema,
  TrainSegmentSchema,
  TransferSegmentSchema,
} from './journey';
