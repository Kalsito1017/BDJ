/**
 * Station search/filter (plan.md 17.5 "station search", checklist 8
 * "Cyrillic and Latin search both work (incl. mixed input)").
 *
 * Pure functions, no React, no I/O. Matching is token-based: every
 * whitespace-separated token of the query must match somewhere in the
 * station's searchable text (name, alternate name, aliases — and their
 * Latin transliterations), so mixed-script input like "демо alpha" works.
 *
 * Ranking is deterministic (no locale-dependent collation): exact name
 * match first, then name prefix, then substring; ties break on the
 * normalized name using code-point order so snapshots stay stable across
 * ICU implementations.
 */

import type { Station } from '../../../types';
import { toSearchForms, tokenMatches, type SearchForms } from './normalize';

interface IndexedStation {
  station: Station;
  /** All searchable text in normalized + Latin forms. */
  haystack: SearchForms;
  /** Normalized display name, used for ranking and tie-breaks. */
  nameForms: SearchForms;
}

function buildHaystack(station: Station): SearchForms {
  const parts: string[] = [station.name];
  if (station.alternateName) parts.push(station.alternateName);
  if (station.aliases) parts.push(...station.aliases);
  return toSearchForms(parts.join(' \u0000 '));
}

export function indexStations(stations: readonly Station[]): IndexedStation[] {
  return stations.map((station) => ({
    station,
    haystack: buildHaystack(station),
    nameForms: toSearchForms(station.name),
  }));
}

function score(entry: IndexedStation, normalizedQuery: string): number {
  const name = entry.nameForms.normalized;
  const nameLatin = entry.nameForms.latin;
  if (name === normalizedQuery || nameLatin === normalizedQuery) return 3;
  if (name.startsWith(normalizedQuery) || nameLatin.startsWith(normalizedQuery)) return 2;
  return 1;
}

/**
 * Filter + rank stations for a free-text query.
 *
 * - Empty/whitespace query: every station, ordered by name.
 * - Otherwise: stations where EVERY token matches; ordered by best rank,
 *   then name (code-point order).
 * - `limit` caps the result (provider-defined default is "all", per
 *   StationQuery semantics in src/types/station.ts).
 */
export function searchStations(
  stations: readonly Station[],
  query: string,
  limit?: number,
): Station[] {
  const indexed = indexStations(stations);
  const normalizedQuery = toSearchForms(query).normalized;

  let results: { entry: IndexedStation; rank: number }[];
  if (normalizedQuery.length === 0) {
    results = indexed.map((entry) => ({ entry, rank: 0 }));
  } else {
    const tokens = normalizedQuery
      .split(' ')
      .map((token) => toSearchForms(token))
      .filter((token) => token.normalized.length > 0);

    results = [];
    for (const entry of indexed) {
      const allTokensMatch = tokens.every((token) => tokenMatches(entry.haystack, token));
      if (!allTokensMatch) continue;
      results.push({ entry, rank: score(entry, normalizedQuery) });
    }
  }

  results.sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    const nameA = a.entry.nameForms.normalized;
    const nameB = b.entry.nameForms.normalized;
    if (nameA !== nameB) return nameA < nameB ? -1 : 1;
    return a.entry.station.id < b.entry.station.id ? -1 : 1;
  });

  const ordered = results.map((result) => result.entry.station);
  return limit !== undefined && limit >= 0 ? ordered.slice(0, limit) : ordered;
}
