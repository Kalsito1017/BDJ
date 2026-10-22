/**
 * Journey domain models (plan.md section 4 extended; sections 3 and 17).
 *
 * This file EXTENDS the interfaces suggested in plan.md section 4 rather
 * than replacing them: `JourneySearch`, `TrainSegment` and `Journey`
 * keep their names and core fields. Additions and the reasons:
 *  - `kind` on segments + `TransferSegment`/`JourneyLeg`: journey details
 *    must show transfers explicitly (plan.md section 3.3, 17.7 onboarding
 *    screen 2).
 *  - `provenance` on journeys/segments: rule 6 — demo / scheduled /
 *    cached-stale / real-time must be distinguishable everywhere.
 *  - `DayOffset` fields: journeys crossing midnight (checklist section 2).
 *  - `providerStatus`: plan.md section 3.2 "provider-supplied status when
 *    available" — verbatim from the source, never invented.
 *  - `fetchedAt`/`searchedAt`: cache freshness labelling (Phase 5).
 *
 * Invariant: `journey.segments` contains exactly the train legs of
 * `journey.legs`, in the same order (convenience projection kept for
 * plan.md compatibility). Enforce with a test in Phase 4.
 *
 * See docs/decisions.md DEC-006 and DEC-007.
 */

import type { DayOffset, EntityId, ISODate, ISODateTime, LocalTimeOfDay } from './common';
import type { InformationProvenance } from './provenance';

/** Search input (plan.md section 4, extended). */
export interface JourneySearch {
  fromStationId: string;
  toStationId: string;
  /** Travel date `YYYY-MM-DD`, interpreted in Europe/Sofia. */
  date: ISODate;
  /**
   * Optional desired departure time `HH:mm` (Europe/Sofia). When omitted the
   * provider decides its default window (typically from midnight of `date`).
   */
  time?: LocalTimeOfDay;
  /** Optional cap on returned journeys; provider default applies when omitted. */
  limit?: number;
}

/** A single train ride between two stations (plan.md section 4, extended). */
export interface TrainSegment {
  /** Discriminant for `JourneyLeg`. */
  kind: 'train';
  fromStationId: string;
  toStationId: string;
  /** Planned departure `HH:mm` (Europe/Sofia); null when the source does not supply it. */
  departureTime: LocalTimeOfDay | null;
  /** Planned arrival `HH:mm` (Europe/Sofia); null when the source does not supply it. */
  arrivalTime: LocalTimeOfDay | null;
  trainNumber?: string;
  /** Days after the travel date of the actual departure (midnight crossing). Default 0. */
  departureDayOffset?: DayOffset;
  /** Days after the travel date of the actual arrival (midnight crossing). Default 0. */
  arrivalDayOffset?: DayOffset;
  /** Train category/name verbatim from the provider; never invented. */
  trainCategory?: string;
  trainName?: string;
  /**
   * Provider-supplied status string verbatim (e.g. a published note).
   * NOT a delay/real-time claim. UI must attribute it to the provider and
   * its provenance.
   */
  providerStatus?: string;
  /** Optional per-segment provenance override; journey provenance applies when omitted. */
  provenance?: InformationProvenance;
}

/**
 * A transfer/connection between two train segments: waiting time and, when
 * applicable, a change of station on foot. `null` times are shown as
 * "unknown", never estimated silently.
 */
export interface TransferSegment {
  kind: 'transfer';
  /** Arrival station of the preceding train leg. */
  fromStationId: string;
  /** Departure station of the following train leg (may differ: station change). */
  toStationId: string;
  /** Planned connection time in minutes when the source supplies it. */
  plannedMinutes?: number;
  /** True when `fromStationId !== toStationId` (a walking transfer is required). */
  stationChangeRequired: boolean;
  provenance?: InformationProvenance;
}

/** Full timeline entry of a journey (order is travel order). */
export type JourneyLeg = TrainSegment | TransferSegment;

/** Journey result (plan.md section 4, extended). */
export interface Journey {
  id: EntityId;
  /** Train legs only, travel order. MUST equal `legs` filtered to `kind === 'train'`. */
  segments: TrainSegment[];
  /** Train + transfer legs, travel order (source of truth for the details timeline). */
  legs: JourneyLeg[];
  durationMinutes?: number;
  /** The source's own "data as of" timestamp, when supplied. */
  sourceUpdatedAt?: ISODateTime;
  /** When this journey result was fetched by the app (cache freshness labelling). */
  fetchedAt?: ISODateTime;
  provenance: InformationProvenance;
}

/** Result envelope returned by provider searches. */
export interface JourneySearchResult {
  search: JourneySearch;
  journeys: Journey[];
  /** When the provider answered. */
  fetchedAt: ISODateTime;
  /** Overall provenance of the result set; per-journey provenance wins when set. */
  provenance: InformationProvenance;
}
