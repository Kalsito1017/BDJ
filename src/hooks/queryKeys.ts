/**
 * Stable TanStack Query key factories for the data-access hooks.
 *
 * Rules (Phase 3/4 data layer):
 *  - Keys are built in ONE place so caching, deduplication and tests agree.
 *  - Every key includes its inputs (search text, journey search input,
 *    journey id) — two different inputs must never share a cache entry.
 *  - Keys are serialisable and order-stable: TanStack hashes object keys
 *    deterministically, so `NormalizedJourneySearch` is a plain data object
 *    with fixed fields (no Dates, no functions).
 *
 * No network, no providers, no side effects: pure data shaping only.
 */

import type { JourneySearch } from '../types/journey';

/**
 * The journey-search input after trimming/validation — the exact shape that
 * reaches both the provider call and the query key. `null` means the input is
 * incomplete (missing/blank from, to or date) and the query stays disabled.
 */
export interface NormalizedJourneySearch {
  fromStationId: string;
  toStationId: string;
  /** Travel date `YYYY-MM-DD` (Europe/Sofia) — passed through, not parsed here. */
  date: string;
  /** Optional departure time `HH:mm`; omitted when blank. */
  time?: string;
  limit?: number;
}

/** Trim only: matching is provider-defined (Cyrillic/Latin/mixed) — do not fold case here. */
export function normalizeSearchText(text: string): string {
  return text.trim();
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Normalise + validate a journey search input at runtime (form data is
 * untrusted). Returns `null` when from/to/date are not all present and
 * non-blank — the hooks keep their queries disabled in that case
 * (plan.md §9 Phase 3: invalid and incomplete input is handled clearly).
 */
export function normalizeJourneySearch(
  input: JourneySearch,
): NormalizedJourneySearch | null {
  const fromStationId = nonEmpty(input.fromStationId);
  const toStationId = nonEmpty(input.toStationId);
  const date = nonEmpty(input.date);
  if (fromStationId === null || toStationId === null || date === null) return null;

  const time = nonEmpty(input.time);
  return {
    fromStationId,
    toStationId,
    date,
    ...(time !== null ? { time } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  };
}

export const stationQueryKeys = {
  all: (): readonly ['stations'] => ['stations'],
  /** Empty/whitespace search text: the full directory (picker UX). */
  directory: (): readonly ['stations', 'directory'] => ['stations', 'directory'],
  /** Free-text station search. `text` is already trimmed. */
  search: (text: string): readonly ['stations', 'search', string] => [
    'stations',
    'search',
    text,
  ],
};

export const journeyQueryKeys = {
  all: (): readonly ['journeys'] => ['journeys'],
  /** Journey search. `input` is a `NormalizedJourneySearch` (or null when disabled). */
  search: (
    input: NormalizedJourneySearch | null,
  ): readonly ['journeys', 'search', NormalizedJourneySearch | null] => [
    'journeys',
    'search',
    input,
  ],
  /** Journey details. `journeyId` is already trimmed. */
  detail: (journeyId: string): readonly ['journeys', 'detail', string] => [
    'journeys',
    'detail',
    journeyId,
  ],
};
