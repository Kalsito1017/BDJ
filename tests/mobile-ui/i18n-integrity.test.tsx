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
 *
 * PARALLEL-WAVE CAVEAT (DEC-016 §3): the Phase 3/4 journey-flow features
 * propose their keys in per-feature contract files
 * (src/features/{journey-search,journey-results,journey-details,station-picker}/
 * translationKeys.ts) and the LEAD merges the locale values, as do the
 * saved-items store notices (src/features/favourites/translationKeys.ts —
 * the `notices.*` banner copy). Until a key is merged it legitimately renders
 * as its key. `PENDING_LEAD_MERGE` below is DERIVED (contract keys that are
 * still missing from both catalogs) — it is not a hand-maintained list, so it
 * cannot go stale the way the Phase 2 `PENDING_KEYS` list did (DEC-019 L1):
 * once the lead merges the values it computes to an empty set and the guard
 * is fully strict again, with no clean-up needed. A raw key OUTSIDE the
 * contract files still fails hard — that is the H1 regression class.
 */

import { screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { renderWithAppData } from '../support/appData';

import MapScreen from '../../src/app/(tabs)/map';
import SearchScreen from '../../src/app/(tabs)/search';
import SettingsScreen from '../../src/app/(tabs)/settings';
import TripsScreen from '../../src/app/(tabs)/trips';
import PlaceholderHomeScreen from '../../src/app/index';
import { JourneyDetailsView } from '../../src/features/journey-details/JourneyDetailsView';
import { JOURNEY_DETAILS_KEYS } from '../../src/features/journey-details/translationKeys';
import { JourneySearchForm } from '../../src/features/journey-search/JourneySearchForm';
import { JOURNEY_SEARCH_KEYS } from '../../src/features/journey-search/translationKeys';
import { JourneyResultsView } from '../../src/features/journey-results/JourneyResultsView';
import {
  JOURNEY_KEYS,
  JOURNEY_RESULTS_KEYS,
} from '../../src/features/journey-results/translationKeys';
import {
  NOTICE_KEYS,
  NOTICE_REASON_KEYS,
} from '../../src/features/favourites/translationKeys';
import { StationPickerView } from '../../src/features/station-picker/StationPickerView';
import { STATION_PICKER_KEYS } from '../../src/features/station-picker/translationKeys';
import {
  catalogs,
  setI18nLocale,
  translate,
  useTranslation,
  type Locale,
} from '../../src/i18n';
import type { Journey, TrainSegment } from '../../src/types/journey';
import type { Station } from '../../src/types/station';

const LOCALES: readonly Locale[] = ['bg', 'en'];

/** Flat dot-separated key shape (DEC-016 §1) — the raw-key fallback look. */
const RAW_KEY_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;

/** Every key the Phase 3/4 journey-flow + saved-items contract files declare. */
const CONTRACT_KEYS: readonly string[] = [
  ...Object.values(JOURNEY_SEARCH_KEYS),
  ...Object.values(JOURNEY_KEYS),
  ...Object.values(JOURNEY_RESULTS_KEYS),
  ...Object.values(JOURNEY_DETAILS_KEYS),
  ...Object.values(STATION_PICKER_KEYS),
  ...Object.values(NOTICE_KEYS),
  ...Object.values(NOTICE_REASON_KEYS),
];

/**
 * Contract keys the lead has NOT merged into the catalogs yet (see the
 * module comment). Derived, never hand-maintained.
 */
const PENDING_LEAD_MERGE: readonly string[] = CONTRACT_KEYS.filter(
  (key) => !(key in catalogs.bg) && !(key in catalogs.en),
);

/** Namespaces the journey-flow + saved-items contracts may own (anti-creep). */
const PENDING_NAMESPACE_ALLOW_LIST: readonly string[] = [
  'journey_search.',
  'journey.',
  'journey_results.',
  'journey_details.',
  'notices.',
];
const PENDING_KEY_ALLOW_LIST: readonly string[] = [
  'common.unknown',
  'validation.date_too_far',
];

interface RenderedNode {
  children?: (RenderedNode | string)[];
}

function collectRenderedText(node: RenderedNode | string | null): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  return (node.children ?? []).flatMap(collectRenderedText);
}

/** Render inside the real AppDataProvider (owned QueryClient — see the helper). */
const render = (node: ReactNode): ReturnType<typeof renderWithAppData> =>
  renderWithAppData(node);

function renderedLines(): string[] {
  return collectRenderedText(screen.toJSON());
}

/* ------------------------- harness fixtures ------------------------- */

function demoStation(id: string, name: string): Station {
  return {
    id,
    name,
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  };
}

function demoTrain(overrides: Partial<TrainSegment> = {}): TrainSegment {
  return {
    kind: 'train',
    fromStationId: 'sofia',
    toStationId: 'varna',
    departureTime: '23:40',
    arrivalTime: '06:15',
    ...overrides,
  };
}

const DEMO_JOURNEY: Journey = {
  id: 'j1',
  legs: [demoTrain()],
  segments: [demoTrain()],
  durationMinutes: 420,
  provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
};

function JourneySearchHarness() {
  const { t } = useTranslation();
  return (
    <JourneySearchForm
      onSelectFromStation={() => {}}
      onSelectToStation={() => {}}
      onSubmit={() => {}}
      getToday={() => '2026-10-24'}
      t={t}
      testID="h-form"
    />
  );
}

function JourneyResultsHarness() {
  const { t } = useTranslation();
  return (
    <JourneyResultsView
      dateLabel="24.10.2026 г."
      error={null}
      fetchedAtTime="09:42"
      fromName="Демо Централна гара София"
      journeys={[DEMO_JOURNEY]}
      loading={false}
      onRetry={() => {}}
      onSelectJourney={() => {}}
      t={t}
      testID="h-results"
      toName="Демо гара Варна"
    />
  );
}

function JourneyDetailsHarness() {
  const { t } = useTranslation();
  return (
    <JourneyDetailsView
      error={null}
      journey={DEMO_JOURNEY}
      loading={false}
      onBack={() => {}}
      onRetry={() => {}}
      stationName={() => 'Демо Централна гара София'}
      t={t}
      testID="h-details"
    />
  );
}

function StationPickerHarness() {
  const { t } = useTranslation();
  return (
    <StationPickerView
      error={null}
      loading={false}
      onClose={() => {}}
      onSelectStation={() => {}}
      onQueryChange={() => {}}
      query=""
      stations={[demoStation('sofia', 'Демо Централна гара София')]}
      t={t}
      testID="h-picker"
    />
  );
}

/* ------------------------------- tests ------------------------------- */

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
    ['journey search form', () => <JourneySearchHarness />],
    ['journey results', () => <JourneyResultsHarness />],
    ['journey details', () => <JourneyDetailsHarness />],
    ['station picker', () => <StationPickerHarness />],
  ] as const)('%s renders no raw translation keys', async (_label, renderScreen) => {
    await render(renderScreen());
    const rawKeys = renderedLines()
      .map((line) => line.trim())
      .filter((line) => RAW_KEY_PATTERN.test(line));
    const unexpected = rawKeys.filter((key) => !PENDING_LEAD_MERGE.includes(key));
    const pending = rawKeys.filter((key) => PENDING_LEAD_MERGE.includes(key));
    if (pending.length > 0) {
      console.warn(
        `PENDING lead locale merge (${locale}) — rendered raw until merged: ${[
          ...new Set(pending),
        ].join(', ')}`,
      );
    }
    expect({ locale, unexpectedRawKeys: unexpected }).toEqual({
      locale,
      unexpectedRawKeys: [],
    });
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

describe('pending lead locale merge (DEC-016 §3)', () => {
  it('only allows pending keys from the journey-flow and notices contracts', () => {
    const outOfScope = PENDING_LEAD_MERGE.filter(
      (key) =>
        !PENDING_NAMESPACE_ALLOW_LIST.some((ns) => key.startsWith(ns)) &&
        !PENDING_KEY_ALLOW_LIST.includes(key),
    );
    expect({ outOfScope }).toEqual({ outOfScope: [] });
  });

  it('has no contract keys awaiting the lead locale merge (DEC-016 §3)', () => {
    // The merge is declared complete (DEC-022/DEC-023): every contract key must
    // exist in both catalogs. A removed key silently re-entering the pending
    // set is a regression, not an allowance (review H2 — proven by spot-check).
    expect({ pendingLeadMerge: PENDING_LEAD_MERGE }).toEqual({ pendingLeadMerge: [] });
  });
});
