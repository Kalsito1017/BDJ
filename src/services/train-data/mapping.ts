/**
 * Payload → domain mapping (DEC-007: "parse every external payload BEFORE
 * mapping"). By the time these functions run, the payload has passed its Zod
 * schema. Mapping is field-by-field and explicit on purpose:
 *
 *  - unknown fields can never leak to the UI (they are copied from nothing);
 *  - missing optional fields stay ABSENT (never `undefined` keys), so the UI
 *    shows "unknown" instead of a plausible-looking blank (plan.md §4);
 *  - `fetchedAt` on results and provenance is the app-side "when we obtained
 *    this" timestamp and is taken from the injected clock (Appendix A.6 —
 *    deterministic, snapshot-stable), never from fixture payloads.
 *
 * The provenance KIND is copied verbatim from the payload. Mappers never
 * upgrade, downgrade or invent provenance (rule 6).
 */

import type { z } from 'zod';
import type { ISODateTime } from '../../types/common';
import type {
  InformationProvenance,
  JourneyLeg,
  Journey,
  JourneySearch,
  JourneySearchResult,
  TrainSegment,
  TransferSegment,
} from '../../types';
import type { Station, StationDirectory } from '../../types/station';
import {
  JourneyLegSchema,
  JourneySchema,
  JourneySearchResultSchema,
  JourneySearchSchema,
  StationDirectorySchema,
  StationSchema,
  TrainSegmentSchema,
  TransferSegmentSchema,
} from './schemas';

type StationPayload = z.infer<typeof StationSchema>;
type StationDirectoryPayload = z.infer<typeof StationDirectorySchema>;
type TrainSegmentPayload = z.infer<typeof TrainSegmentSchema>;
type TransferSegmentPayload = z.infer<typeof TransferSegmentSchema>;
type JourneyLegPayload = z.infer<typeof JourneyLegSchema>;
type JourneyPayload = z.infer<typeof JourneySchema>;
type JourneySearchPayload = z.infer<typeof JourneySearchSchema>;
type JourneySearchResultPayload = z.infer<typeof JourneySearchResultSchema>;

/** Re-stamp provenance with the injected clock's fetch time (kind untouched). */
function withFetchedAt(
  provenance: InformationProvenance,
  fetchedAt: ISODateTime,
): InformationProvenance {
  return { ...provenance, fetchedAt };
}

export function mapStation(payload: StationPayload, fetchedAt: ISODateTime): Station {
  return {
    id: payload.id,
    name: payload.name,
    ...(payload.alternateName !== undefined
      ? { alternateName: payload.alternateName }
      : {}),
    ...(payload.aliases !== undefined ? { aliases: [...payload.aliases] } : {}),
    countryCode: payload.countryCode,
    ...(payload.location !== undefined
      ? {
          location: {
            latitude: payload.location.latitude,
            longitude: payload.location.longitude,
          },
        }
      : {}),
    ...(payload.kind !== undefined ? { kind: payload.kind } : {}),
    provenance: withFetchedAt(payload.provenance, fetchedAt),
  };
}

export function mapStationDirectory(
  payload: StationDirectoryPayload,
  fetchedAt: ISODateTime,
): StationDirectory {
  return {
    version: payload.version,
    stations: payload.stations.map((station) => mapStation(station, fetchedAt)),
    fetchedAt,
    expiresAt: payload.expiresAt,
    ...(payload.attribution !== undefined ? { attribution: payload.attribution } : {}),
  };
}

export function mapTrainSegment(
  payload: TrainSegmentPayload,
  fetchedAt: ISODateTime,
): TrainSegment {
  return {
    kind: 'train',
    fromStationId: payload.fromStationId,
    toStationId: payload.toStationId,
    departureTime: payload.departureTime,
    arrivalTime: payload.arrivalTime,
    ...(payload.trainNumber !== undefined ? { trainNumber: payload.trainNumber } : {}),
    ...(payload.departureDayOffset !== undefined
      ? { departureDayOffset: payload.departureDayOffset }
      : {}),
    ...(payload.arrivalDayOffset !== undefined
      ? { arrivalDayOffset: payload.arrivalDayOffset }
      : {}),
    ...(payload.trainCategory !== undefined
      ? { trainCategory: payload.trainCategory }
      : {}),
    ...(payload.trainName !== undefined ? { trainName: payload.trainName } : {}),
    ...(payload.providerStatus !== undefined
      ? { providerStatus: payload.providerStatus }
      : {}),
    ...(payload.provenance !== undefined
      ? { provenance: withFetchedAt(payload.provenance, fetchedAt) }
      : {}),
  };
}

export function mapTransferSegment(
  payload: TransferSegmentPayload,
  fetchedAt: ISODateTime,
): TransferSegment {
  return {
    kind: 'transfer',
    fromStationId: payload.fromStationId,
    toStationId: payload.toStationId,
    ...(payload.plannedMinutes !== undefined
      ? { plannedMinutes: payload.plannedMinutes }
      : {}),
    stationChangeRequired: payload.stationChangeRequired,
    ...(payload.provenance !== undefined
      ? { provenance: withFetchedAt(payload.provenance, fetchedAt) }
      : {}),
  };
}

export function mapJourneyLeg(
  payload: JourneyLegPayload,
  fetchedAt: ISODateTime,
): JourneyLeg {
  return payload.kind === 'train'
    ? mapTrainSegment(payload, fetchedAt)
    : mapTransferSegment(payload, fetchedAt);
}

export function mapJourney(payload: JourneyPayload, fetchedAt: ISODateTime): Journey {
  return {
    id: payload.id,
    segments: payload.segments.map((segment) => mapTrainSegment(segment, fetchedAt)),
    legs: payload.legs.map((leg) => mapJourneyLeg(leg, fetchedAt)),
    ...(payload.durationMinutes !== undefined
      ? { durationMinutes: payload.durationMinutes }
      : {}),
    ...(payload.sourceUpdatedAt !== undefined
      ? { sourceUpdatedAt: payload.sourceUpdatedAt }
      : {}),
    fetchedAt,
    provenance: withFetchedAt(payload.provenance, fetchedAt),
  };
}

function mapSearch(payload: JourneySearchPayload): JourneySearch {
  return {
    fromStationId: payload.fromStationId,
    toStationId: payload.toStationId,
    date: payload.date,
    ...(payload.time !== undefined ? { time: payload.time } : {}),
    ...(payload.limit !== undefined ? { limit: payload.limit } : {}),
  };
}

export function mapJourneySearchResult(
  payload: JourneySearchResultPayload,
  fetchedAt: ISODateTime,
): JourneySearchResult {
  return {
    search: mapSearch(payload.search),
    journeys: payload.journeys.map((journey) => mapJourney(journey, fetchedAt)),
    fetchedAt,
    provenance: withFetchedAt(payload.provenance, fetchedAt),
  };
}
