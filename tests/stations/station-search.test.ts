/**
 * Station search/filter behaviour (checklist 8: Cyrillic and Latin search
 * both work incl. mixed input; plan.md 17.5 station search).
 *
 * Synthetic demo fixtures only.
 */

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import { searchStations } from '../../src/features/stations/model/stationSearch';
import {
  normalizeText,
  transliterateToLatin,
} from '../../src/features/stations/model/normalize';
import { makeTestStation } from './testSupport';

const ids = (query: string, limit?: number) =>
  searchStations(DEMO_STATIONS, query, limit).map((station) => station.id);

describe('normalizeText', () => {
  it('lowercases Cyrillic and Latin', () => {
    expect(normalizeText('ДЕМО ГАРА')).toBe('демо гара');
    expect(normalizeText('Demo Station')).toBe('demo station');
  });

  it('strips Latin diacritics', () => {
    expect(normalizeText('Dëmö Rhô')).toBe('demo rho');
    expect(normalizeText('Démo Kappá')).toBe('demo kappa');
  });

  it('transliterates Bulgarian Cyrillic to Latin deterministically', () => {
    expect(transliterateToLatin('демо гара')).toBe('demo gara');
    expect(transliterateToLatin('щъркел чушка')).toBe('shtarkel chushka');
  });
});

describe('searchStations — Cyrillic input', () => {
  it('matches a full Cyrillic name', () => {
    expect(ids('Демо гара Алфа')).toContain('demo-001');
  });

  it('is case-insensitive for Cyrillic', () => {
    expect(ids('ДЕМО ГАРА АЛФА')).toContain('demo-001');
    expect(ids('демо гара алфа')).toEqual(ids('Демо Гара Алфа'));
  });

  it('matches a Cyrillic prefix', () => {
    expect(ids('алф')).toContain('demo-001');
  });

  it('matches Cyrillic names via Latin transliteration queries', () => {
    // "beta" transliterates the Cyrillic name "Демо гара Бета".
    expect(ids('beta')).toContain('demo-002');
  });
});

describe('searchStations — Latin input', () => {
  it('matches through the Latin alternate name', () => {
    expect(ids('alpha')).toContain('demo-001');
  });

  it('matches Cyrillic-named stations through transliteration', () => {
    // demo-003 has NO alternate name; only the transliterated name matches.
    const station = DEMO_STATIONS.find((entry) => entry.id === 'demo-003');
    expect(station?.alternateName).toBeUndefined();
    expect(ids('gama')).toContain('demo-003');
    expect(ids('gama')).toContain('demo-003');
  });

  it('is diacritic-insensitive for Latin input', () => {
    expect(ids('demo kappa')).toContain('demo-011');
    expect(ids('Dëmö Rhô')).toContain('demo-017');
    expect(ids('demo rho')).toContain('demo-017');
  });

  it('is case-insensitive for Latin input', () => {
    expect(ids('ALPHA')).toContain('demo-001');
  });
});

describe('searchStations — mixed and edge input', () => {
  it('matches mixed-script token queries', () => {
    // "демо" is Cyrillic, "alpha" is Latin; both must match.
    expect(ids('демо alpha')).toContain('demo-001');
    expect(ids('alpha демо')).toContain('demo-001');
  });

  it('finds mixed-script station names', () => {
    expect(ids('Демо St. Zeta')).toContain('demo-007');
    expect(ids('zeta')).toContain('demo-007');
    expect(ids('ksi')).toContain('demo-014');
  });

  it('matches Latin-script display names', () => {
    expect(ids('Omikron')).toContain('demo-015');
    expect(ids('омикрон')).toContain('demo-015'); // via alternate Cyrillic name
  });

  it('matches very long names from a middle fragment', () => {
    const longFragment = 'мащабирането на шрифта';
    expect(ids(longFragment)).toContain('demo-006');
  });

  it('matches through aliases', () => {
    expect(ids('Тета Център')).toContain('demo-009');
    expect(ids('Theta Central')).toContain('demo-009');
    expect(ids('Сигма спирка')).toContain('demo-018');
  });

  it('returns every station for an empty or whitespace query, sorted by name', () => {
    const all = searchStations(DEMO_STATIONS, '');
    expect(all).toHaveLength(DEMO_STATIONS.length);
    const normalizedNames = all.map((station) => normalizeText(station.name));
    expect([...normalizedNames].sort()).toEqual(normalizedNames);
    expect(searchStations(DEMO_STATIONS, '   ')).toHaveLength(DEMO_STATIONS.length);
  });

  it('returns an empty list for a no-match query', () => {
    expect(ids('zzzz-not-a-station')).toEqual([]);
  });

  it('requires every token to match', () => {
    expect(ids('алфа zzzz')).toEqual([]);
  });

  it('honours the limit', () => {
    expect(searchStations(DEMO_STATIONS, 'демо', 3)).toHaveLength(3);
  });

  it('finds stations without coordinates (manual selection needs no location)', () => {
    expect(ids('Делта')).toContain('demo-004');
    expect(ids('Ламбда')).toContain('demo-012');
  });

  it('ranks exact name matches first', () => {
    expect(ids('Демо гара Алфа')[0]).toBe('demo-001');
  });
});

describe('searchStations — custom fixture edge cases', () => {
  it('matches a synthetic station with only a name', () => {
    const stations = [makeTestStation({ id: 'only-name', name: 'Демо Самоиме' })];
    expect(searchStations(stations, 'самоиме').map((s) => s.id)).toEqual(['only-name']);
  });

  it('treats non-matching aliases as non-matching', () => {
    const stations = [makeTestStation({ id: 'x', aliases: ['Демо Друго'] })];
    expect(searchStations(stations, 'Несъществува')).toEqual([]);
  });
});
