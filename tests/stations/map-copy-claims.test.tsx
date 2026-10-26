/**
 * Claim-lexicon guard for MAP COPY specifically (rule 6; DEC-016 §5;
 * plan.md §17.5 "a marker implies no real-time service").
 *
 * tests/i18n/claim-lexicon-catalogs.test.tsx guards every catalog value and
 * tests/mobile-ui/claims-lexicon.test.tsx guards what the screens render —
 * this suite closes the map-specific gap: the DEC-012 attribution constants
 * (legal text that never enters the catalogs) and the map area's rendered
 * copy, including the "no operational route wording" constraint.
 *
 * The lexicon regexes below mirror the shared lexicon on purpose (test
 * files cannot import each other without executing each other's suites).
 */

import { render, screen } from '@testing-library/react-native';

import { DEMO_STATIONS } from '../../src/features/stations/data/demoStations';
import {
  ATTRIBUTION_OPENFREEMAP,
  ATTRIBUTION_OSM_ODBL,
} from '../../src/features/stations/map/MapAttribution';
import { StationsMap } from '../../src/features/stations/map/StationsMap';
import bg from '../../src/i18n/locales/bg.json';
import en from '../../src/i18n/locales/en.json';
import { fakeTranslate, makeMapLibreMock } from './testSupport';

const catalogs = { bg: bg as Record<string, string>, en: en as Record<string, string> };

/** English claim lexicon (identical to tests/i18n/claim-lexicon-catalogs). */
const EN_CLAIM_PATTERNS: readonly [string, RegExp][] = [
  ['real-time claim', /\breal[\s-]?time\b/i],
  ['live claim', /\blive\b/i],
  ['delay claim', /\bdelays?\b/i],
  ['official BDZ claim', /\bofficial\b/i],
  ['on-time claim', /\bon[\s-]?time\b/i],
  ['position/tracking claim', /\b(positions?|tracking|locat(ion|ed))\b/i],
  ['guarantee claim', /\bguarantees?\b/i],
  ['operational-route claim', /\b(operational|routes?)\b/i],
];

/** Bulgarian equivalents of the same claims. */
const BG_CLAIM_PATTERNS: readonly [string, RegExp][] = [
  ['твърждение „на живо“', /на живо/i],
  ['твърждение „официален“', /официал/i],
  ['твърждение „закъснение“', /закъсн/i],
  ['твърждение „реално време“', /реално време/i],
  ['твърждение „позиция/проследяване/локация“', /(позици|проследяв|локация)/i],
  ['твърждение „гаранция“', /гарантир/i],
  ['твърждение „оперативен маршрут“', /(оператив|маршрут)/i],
];

function expectClaimSafe(
  label: string,
  text: string,
  patterns: readonly [string, RegExp][],
) {
  for (const [claimLabel, pattern] of patterns) {
    expect({
      copy: label,
      claim: claimLabel,
      matched: text.match(pattern)?.[0] ?? null,
    }).toEqual({ copy: label, claim: claimLabel, matched: null });
  }
}

interface RenderedNode {
  children?: (RenderedNode | string)[];
}

function collectRenderedText(node: RenderedNode | string | null): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  return (node.children ?? []).flatMap(collectRenderedText);
}

describe('DEC-012 attribution constants', () => {
  it('renders the required attribution wording verbatim', () => {
    expect(ATTRIBUTION_OPENFREEMAP).toBe(
      'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
    );
    expect(ATTRIBUTION_OSM_ODBL).toBe(
      '© OpenStreetMap contributors — data available under the Open Database License (ODbL), https://www.openstreetmap.org/copyright',
    );
  });

  it('is legal attribution, not a claim (both lexicons)', () => {
    for (const line of [ATTRIBUTION_OPENFREEMAP, ATTRIBUTION_OSM_ODBL]) {
      expectClaimSafe(line, line, EN_CLAIM_PATTERNS);
      expectClaimSafe(line, line, BG_CLAIM_PATTERNS);
    }
  });
});

describe('map copy — rendered and catalog', () => {
  it('renders the map area with no claim or operational-route wording', async () => {
    const mock = makeMapLibreMock();
    await render(
      <StationsMap
        t={fakeTranslate}
        stations={DEMO_STATIONS}
        onSelectStation={() => {}}
        mapLibre={mock.module}
      />,
    );

    const text = collectRenderedText(screen.toJSON()).join('\n');
    expect(text.length).toBeGreaterThan(0);
    expectClaimSafe('rendered map area (en test copy)', text, EN_CLAIM_PATTERNS);
  });

  it.each(['bg', 'en'] as const)(
    'keeps every map.* catalog value claim-safe in %s',
    (locale) => {
      const mapEntries = Object.entries(catalogs[locale]).filter(([key]) =>
        key.startsWith('map.'),
      );
      expect(mapEntries.length).toBeGreaterThan(5);
      const patterns = locale === 'bg' ? BG_CLAIM_PATTERNS : EN_CLAIM_PATTERNS;
      for (const [key, value] of mapEntries) {
        expectClaimSafe(`${locale}.${key}`, value, patterns);
      }
    },
  );

  it('never presents a marker as operational service (rule 6 wording check)', () => {
    // The one place the words may appear is the disclaimer that NEGATES
    // them; assert the disclaimer copy is the negation shape we ship.
    const disclaimer = catalogs.en['map.disclaimer'];
    expect(disclaimer).toContain('demo data');
    expect(disclaimer).toContain('does not mean');
  });
});
