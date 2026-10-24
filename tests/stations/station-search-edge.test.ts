/**
 * Station search — additional edge cases beyond tests/stations/station-search.test.ts
 * (addbeforerelease.txt §8: "Cyrillic and Latin search both work (and mixed
 * input)"; §2: "Names with apostrophes, hyphens, Cyrillic, Latin, accents and
 * emoji work in every field, in storage, search, export and email").
 *
 * Intent under test: hostile or degenerate input must never crash, never
 * fabricate matches, and must degrade to a predictable result.
 */

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import { normalizeText } from '../../src/features/stations/model/normalize';
import { searchStations } from '../../src/features/stations/model/stationSearch';
import type { Station } from '../../src/types';

const DEMO: readonly Station[] = DEMO_STATIONS;

describe('searchStations — degenerate input', () => {
  it('returns no stations for punctuation-only input (never a crash, never a wild match)', () => {
    expect(searchStations(DEMO, '!!!???...')).toEqual([]);
  });

  it('returns no stations for emoji-only input', () => {
    expect(searchStations(DEMO, '😀🚂')).toEqual([]);
  });

  it('handles an absurdly long query without crashing or matching', () => {
    const longQuery = 'демо alpha '.repeat(200);
    // Every token must match: after the first two meaningful tokens the rest
    // ("alpha" repeated) still match; assert stable, bounded behaviour.
    const result = searchStations(DEMO, longQuery);
    expect(result.length).toBeLessThanOrEqual(DEMO.length);
    expect(result.map((s) => s.id)).toEqual(['demo-001']);
  });

  it('treats tabs and newlines as token separators like spaces', () => {
    const ids = searchStations(DEMO, 'демо\tалфа').map((s) => s.id);
    expect(ids).toEqual(['demo-001']);
    expect(searchStations(DEMO, 'демо\nалфа').map((s) => s.id)).toEqual(['demo-001']);
  });

  it('keeps apostrophes and hyphens searchable (checklist section 2)', () => {
    const fixture: readonly Station[] = [
      {
        id: 'test-o-hara',
        name: "Демо O'Hara-Север",
        countryCode: 'BG',
        provenance: { kind: 'demo', fetchedAt: '2026-10-23T00:00:00.000Z' },
      },
    ];
    expect(searchStations(fixture, "o'hara").map((s) => s.id)).toEqual(['test-o-hara']);
    expect(searchStations(fixture, 'hara-север').map((s) => s.id)).toEqual([
      'test-o-hara',
    ]);
  });

  it('normalizes mixed combining marks without losing letters', () => {
    // "Алфа" typed with a stray combining acute still matches "Алфа".
    expect(normalizeText('А\u0301лфа')).toBe('алфа');
    expect(searchStations(DEMO, 'а\u0301лфа').map((s) => s.id)).toEqual(['demo-001']);
  });
});

describe('searchStations — result-shape guarantees', () => {
  it('never returns duplicates when a name and its alias both match', () => {
    const results = searchStations(DEMO, 'демо');
    const ids = results.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic: the same query returns the same order twice', () => {
    const first = searchStations(DEMO, 'демо гара').map((s) => s.id);
    const second = searchStations(DEMO, 'демо гара').map((s) => s.id);
    expect(first).toEqual(second);
  });

  it('honours a limit of zero as "no results", not "no limit"', () => {
    expect(searchStations(DEMO, 'демо', 0)).toEqual([]);
  });
});
