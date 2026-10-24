/**
 * Rendered-output i18n integrity (plan.md 17.6; addbeforerelease.txt §8;
 * rule 6).
 *
 * Two user-visible invariants, in EVERY supported locale (the app ships bg
 * by default, so testing `en` alone is not enough):
 *
 *  1. No screen ever renders a raw translation key ("a.b.c"): that is what
 *     src/i18n/catalog.ts shows when a key is missing from both catalogs.
 *     This catches key-rename/reconciliation regressions end-to-end (it
 *     caught `common.states_demo` after the DEC-018 rename — see the review
 *     report, 2026-10-24).
 *  2. The Map tab (stations feature) shows its rule-6 demo labelling in
 *     both locales: the demo badge on the data plus the synthetic-dataset
 *     notice — never mock results unlabelled.
 */

import { render, screen } from '@testing-library/react-native';

import MapScreen from '../../src/app/(tabs)/map';
import SearchScreen from '../../src/app/(tabs)/search';
import SettingsScreen from '../../src/app/(tabs)/settings';
import TripsScreen from '../../src/app/(tabs)/trips';
import PlaceholderHomeScreen from '../../src/app/index';
import { setI18nLocale, translate, type Locale } from '../../src/i18n';

const LOCALES: readonly Locale[] = ['bg', 'en'];

/** Flat dot-separated key shape (DEC-016 §1) — the raw-key fallback look. */
const RAW_KEY_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;

interface RenderedNode {
  children?: (RenderedNode | string)[];
}

function collectRenderedText(node: RenderedNode | string | null): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  return (node.children ?? []).flatMap(collectRenderedText);
}

function renderedLines(): string[] {
  return collectRenderedText(screen.toJSON());
}

describe.each(LOCALES)('i18n integrity in the %s locale', (locale) => {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);

  beforeEach(() => {
    setI18nLocale(locale);
  });

  it.each([
    ['scaffold landing', () => <PlaceholderHomeScreen />],
    ['search tab', () => <SearchScreen />],
    ['map tab', () => <MapScreen />],
    ['my trips / tickets tab', () => <TripsScreen />],
    ['settings tab', () => <SettingsScreen />],
  ] as const)('%s renders no raw translation keys', async (_label, renderScreen) => {
    await render(renderScreen());
    const rawKeys = renderedLines().filter((line) => RAW_KEY_PATTERN.test(line.trim()));
    expect({ locale, rawKeys }).toEqual({ locale, rawKeys: [] });
  });

  it('map tab (stations screen) shows its demo labelling', async () => {
    await render(<MapScreen />);

    // Demo provenance badge on the demo data + the synthetic-dataset notice:
    // the Map tab may never show its mock stations unlabelled (rule 6).
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
  });

  it('search tab shows the visible demo-data label', async () => {
    await render(<SearchScreen />);
    expect(screen.getByText(t('provenance.demo'))).toBeTruthy();
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });
});
