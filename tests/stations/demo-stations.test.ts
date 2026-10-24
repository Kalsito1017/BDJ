/**
 * DEMO fixture guards (DEC-006 provenance, rule 6 labelling,
 * docs/station-dataset-licensing.md Option E).
 *
 * These tests are the regression wall that keeps synthetic data synthetic:
 * invented names, demo provenance on EVERY fixture, no wording that could
 * present the data as real BDZ stations, and the required edge cases
 * (long names, Latin/mixed spellings, missing coordinates).
 */

import {
  DEMO_STATIONS,
  DEMO_STATION_DIRECTORY,
} from '../../src/features/stations/data/demoStations';

describe('demo station fixtures', () => {
  it('contains 15–25 synthetic stations', () => {
    expect(DEMO_STATIONS.length).toBeGreaterThanOrEqual(15);
    expect(DEMO_STATIONS.length).toBeLessThanOrEqual(25);
  });

  it('carries demo provenance on every fixture (rule 6 / DEC-006)', () => {
    for (const station of DEMO_STATIONS) {
      expect({ id: station.id, kind: station.provenance.kind }).toEqual({
        id: station.id,
        kind: 'demo',
      });
      expect(station.provenance.fetchedAt).toBe('2026-10-23T00:00:00.000Z');
    }
  });

  it('uses unique demo-prefixed ids', () => {
    const ids = DEMO_STATIONS.map((station) => station.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('demo-')).toBe(true);
  });

  it('marks every name as synthetic (Демо/Demo marker)', () => {
    for (const station of DEMO_STATIONS) {
      const lower = station.name.toLowerCase();
      const marked = lower.includes('демо') || lower.includes('demo');
      expect({ id: station.id, marked }).toEqual({ id: station.id, marked: true });
    }
  });

  it('never uses wording that implies official BDZ data', () => {
    for (const station of DEMO_STATIONS) {
      const text = [station.name, station.alternateName, ...(station.aliases ?? [])].join(
        ' ',
      );
      expect({ id: station.id, matched: text.match(/bdz|бдж/i)?.[0] ?? null }).toEqual({
        id: station.id,
        matched: null,
      });
    }
  });

  it('includes at least one station WITHOUT coordinates', () => {
    expect(
      DEMO_STATIONS.filter((station) => station.location === undefined).length,
    ).toBeGreaterThan(0);
  });

  it('includes at least one very long name (layout stress)', () => {
    expect(DEMO_STATIONS.some((station) => station.name.length > 60)).toBe(true);
  });

  it('includes Latin and mixed-script names', () => {
    expect(DEMO_STATIONS.some((station) => /[A-Za-z]/.test(station.name))).toBe(true);
    expect(
      DEMO_STATIONS.some(
        (station) => /[А-Яа-я]/.test(station.name) && /[A-Za-z]/.test(station.name),
      ),
    ).toBe(true);
  });

  it('includes Latin alternate names with diacritics and alias coverage', () => {
    expect(
      DEMO_STATIONS.some((station) => /[ëöôá]/i.test(station.alternateName ?? '')),
    ).toBe(true);
    expect(DEMO_STATIONS.some((station) => (station.aliases?.length ?? 0) > 0)).toBe(
      true,
    );
  });

  it('keeps synthetic coordinates inside a plausible Bulgaria box', () => {
    for (const station of DEMO_STATIONS) {
      if (!station.location) continue;
      expect(station.location.latitude).toBeGreaterThan(41);
      expect(station.location.latitude).toBeLessThan(45);
      expect(station.location.longitude).toBeGreaterThan(22);
      expect(station.location.longitude).toBeLessThan(29);
    }
  });

  it('exposes a versioned demo directory with a demo attribution notice', () => {
    expect(DEMO_STATION_DIRECTORY.stations).toBe(DEMO_STATIONS);
    expect(DEMO_STATION_DIRECTORY.version).toBe('demo-stations-2026-10-23');
    expect(DEMO_STATION_DIRECTORY.attribution).toContain('Demo');
    expect(DEMO_STATION_DIRECTORY.expiresAt > DEMO_STATION_DIRECTORY.fetchedAt).toBe(
      true,
    );
    for (const station of DEMO_STATION_DIRECTORY.stations) {
      expect(station.provenance.kind).toBe('demo');
    }
  });
});
