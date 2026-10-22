/**
 * Information provenance — discriminated union.
 *
 * WHY (plan.md section 8 "avoid false precision"; addbeforerelease.txt
 * section 7 "scheduled vs real-time vs cached vs demo clearly labelled";
 * rule 6 of the lead brief): every user-visible piece of travel
 * information MUST carry provenance, and the UI MUST render a label per
 * kind. See docs/decisions.md DEC-006.
 *
 * INVARIANT: `real-time` provenance MUST NOT be produced by any provider
 * until DEC-002 is superseded by a verified, authorised live data source.
 * The mock provider MUST only produce `demo` (see docs/decisions.md,
 * Appendix A). Enforce this with tests in Phase 4.
 */

import type { ISODateTime } from './common';

interface ProvenanceBase {
  /** When this information was obtained from its source (ISO 8601 UTC). */
  fetchedAt: ISODateTime;
}

/**
 * Invented/sample data shown for development and tests.
 * MUST be visibly labelled "demo data" everywhere it is shown
 * (addbeforerelease.txt section 1).
 */
export interface DemoProvenance extends ProvenanceBase {
  kind: 'demo';
}

/**
 * Planned/published timetable information from a lawful data source.
 * Not live: delays, positions and cancellations en route are unknown.
 */
export interface ScheduledProvenance extends ProvenanceBase {
  kind: 'scheduled';
  /** The source's own "data as of" timestamp, when supplied. Never invented. */
  sourceUpdatedAt?: ISODateTime;
}

/**
 * Data served from a local cache whose freshness window has lapsed, or
 * that was served stale deliberately (e.g. device offline, upstream error).
 * MUST be labelled "stale"/"cached" with the cache age in the UI.
 */
export interface CachedStaleProvenance extends ProvenanceBase {
  kind: 'cached-stale';
  /** When the cache entry was written. */
  cachedAt: ISODateTime;
  /** Freshness expiry of the cache entry (per DEC-006 cache rules). */
  expiresAt: ISODateTime;
  staleReason: 'expired-ttl' | 'offline' | 'upstream-error';
}

/**
 * Genuinely observed real-time information from an authorised live source.
 * RESERVED: not producible until the data-source gate passes (DEC-002).
 */
export interface RealTimeProvenance extends ProvenanceBase {
  kind: 'real-time';
  /** When the observation was actually made at the source. */
  observedAt: ISODateTime;
  /** Identifier of the verified live feed, when one exists. */
  sourceId: string;
}

export type InformationProvenance =
  | DemoProvenance
  | CachedStaleProvenance
  | ScheduledProvenance
  | RealTimeProvenance;

export type ProvenanceKind = InformationProvenance['kind'];

export const PROVENANCE_KINDS: readonly ProvenanceKind[] = [
  'demo',
  'scheduled',
  'cached-stale',
  'real-time',
];

/**
 * Helper shape: any domain record whose trustworthiness must be shown.
 * Journey-level provenance is authoritative; per-segment provenance may
 * override it when segments come from different sources.
 */
export interface WithProvenance {
  provenance: InformationProvenance;
}
