/**
 * Catalog-level claim-lexicon guard (rule 6; plan.md §1; DEC-016 §5).
 *
 * tests/mobile-ui/claims-lexicon.test.tsx guards what the screens RENDER,
 * in English. This suite guards the SOURCE OF TRUTH — every user-visible
 * value in BOTH locale catalogs — so claim wording cannot hide in:
 *  - a Bulgarian string (the screen guard only tests the `en` locale),
 *  - a key that no tested screen renders yet (Phase 3/4/5 copy),
 *  - an error/state message reached only in failure paths.
 *
 * Allowed exception (DEC-016 §5): the provenance CATEGORY labels for the
 * reserved `real-time` kind. They name the category; `real-time` provenance
 * is unproducible until DEC-002 is superseded (src/types/provenance.ts), so
 * they never render as a claim about current data. No other allow-list.
 */

import bg from '../../src/i18n/locales/bg.json';
import en from '../../src/i18n/locales/en.json';

const catalogs = { bg: bg as Record<string, string>, en: en as Record<string, string> };

/**
 * Provenance category labels only — the single allow-list permitted by
 * DEC-016 §5 ("no allow-list beyond the provenance category labels").
 */
const PROVENANCE_CATEGORY_LABELS = new Set([
  'provenance.real_time',
  'provenance.real_time_desc',
  'stations.provenance.real_time',
]);

/** English claim lexicon — identical to tests/mobile-ui/claims-lexicon.test.tsx. */
const EN_CLAIM_PATTERNS: readonly [string, RegExp][] = [
  ['real-time claim', /\breal[\s-]?time\b/i],
  ['live claim', /\blive\b/i],
  ['delay claim', /\bdelays?\b/i],
  ['official BDZ claim', /\bofficial\b/i],
  ['on-time claim', /\bon[\s-]?time\b/i],
  ['position/tracking claim', /\b(positions?|tracking|locat(ion|ed))\b/i],
  ['guarantee claim', /\bguarantees?\b/i],
];

/** Bulgarian equivalents of the same claims (the app ships bg by default). */
const BG_CLAIM_PATTERNS: readonly [string, RegExp][] = [
  ['твърждение „на живо“', /на живо/i],
  ['твърждение „официален“', /официал/i],
  ['твърждение „закъснение“', /закъсн/i],
  ['твърждение „реално време“', /реално време/i],
  ['твърждение „позиция/проследяване/локация“', /(позици|проследяв|локация)/i],
  ['твърждение „гаранция“', /гарантир/i],
];

describe.each([
  ['en', EN_CLAIM_PATTERNS],
  ['bg', BG_CLAIM_PATTERNS],
] as const)('claim lexicon in the %s catalog', (locale, patterns) => {
  it('has no claim wording outside the provenance category labels', () => {
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(catalogs[locale])) {
      if (PROVENANCE_CATEGORY_LABELS.has(key)) continue;
      for (const [claimLabel, pattern] of patterns) {
        if (pattern.test(value)) {
          offenders.push(`${key} -> ${claimLabel}: ${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the allow-list limited to provenance category labels (no creep)', () => {
    // The allow-list must not silently grow into an escape hatch: every
    // allowed key must actually be a provenance category label.
    for (const key of PROVENANCE_CATEGORY_LABELS) {
      expect(key).toMatch(/^provenance\.real_time|^stations\.provenance\.real_time$/);
      expect(catalogs[locale][key]).toBeDefined();
    }
    expect(PROVENANCE_CATEGORY_LABELS.size).toBe(3);
  });
});

describe('claim lexicon: pattern strength (positive controls)', () => {
  it.each([
    ['Live train positions', 'live claim'],
    ['Real time arrivals', 'real-time claim'],
    ['Watch your train live', 'live claim'],
    ['Delay predictions', 'delay claim'],
    ['Official BDZ data', 'official BDZ claim'],
    ['Always on time', 'on-time claim'],
    ['Track your position', 'position/tracking claim'],
    ['Location services', 'position/tracking claim'],
    ['We guarantee a seat', 'guarantee claim'],
  ] as const)('rejects %s', (copy, expectedLabel) => {
    const matched = EN_CLAIM_PATTERNS.filter(([, pattern]) => pattern.test(copy)).map(
      ([label]) => label,
    );
    expect(matched).toContain(expectedLabel);
  });

  it.each([
    'На живо предаване',
    'Официални данни на БДЖ',
    'Информация за закъсненията',
    'Позицията на влака',
    'Гарантираме място',
  ])('rejects the Bulgarian claim copy %s', (copy) => {
    const matched = BG_CLAIM_PATTERNS.filter(([, pattern]) => pattern.test(copy));
    expect(matched.length).toBeGreaterThan(0);
  });

  it('still accepts claim-safe copy (negative controls)', () => {
    for (const copy of [
      'See where you are',
      'These stations are synthetic demo data.',
      'Scheduled times from the demo dataset',
      'Where you are is never stored or logged.',
      'A marker does not mean a train is running.',
    ]) {
      const matched = EN_CLAIM_PATTERNS.filter(([, pattern]) => pattern.test(copy));
      expect(matched).toEqual([]);
    }
  });
});
