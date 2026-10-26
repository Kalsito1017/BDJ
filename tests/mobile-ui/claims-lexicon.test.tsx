/**
 * Claim-lexicon regression test (rule 6; plan.md §1: "Do not claim live
 * train positions, live delays, ticket purchasing, or official BDZ
 * integration"; DEC-014 finding M2 requires this lexicon to cover every new
 * screen).
 *
 * In the style of tests/smoke/placeholder-screen.test.tsx: render each
 * screen, collect every string it actually shows, and fail on any wording
 * that could be read as a real-time / live / delay / official-BDZ claim.
 * Tested in English (the claims lexicon is English); Bulgarian copy is
 * covered by the i18n-a11y workstream.
 */
import { render as renderRntl, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AppDataProvider } from '../../src/hooks';

import PlaceholderHomeScreen from '../../src/app/index';
import MapScreen from '../../src/app/(tabs)/map';
import SearchScreen from '../../src/app/(tabs)/search';
import SettingsScreen from '../../src/app/(tabs)/settings';
import TripsScreen from '../../src/app/(tabs)/trips';
import { JourneyDetailsView } from '../../src/features/journey-details/JourneyDetailsView';
import { JourneyResultsView } from '../../src/features/journey-results/JourneyResultsView';
import { OnboardingFlow } from '../../src/features/onboarding';
import { StationPickerView } from '../../src/features/station-picker/StationPickerView';
import { createMemorySettingsStorage } from '../../src/services/storage/settingsStorage';
import { setI18nLocale, translate } from '../../src/i18n';
import type { Journey, TrainSegment, TransferSegment } from '../../src/types/journey';
import type { Station } from '../../src/types/station';

beforeAll(() => {
  setI18nLocale('en');
});

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

/** Minimal structural shape of RNTL's `toJSON()` output. */
interface RenderedNode {
  children?: (RenderedNode | string)[];
}

/** Every string the component actually renders, nested Text children included. */
function collectRenderedText(node: RenderedNode | string | null): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  return (node.children ?? []).flatMap(collectRenderedText);
}

function renderedText(): string {
  return collectRenderedText(screen.toJSON()).join('\n');
}

/**
 * The regression guard for every screen listed below. Provenance LABELS are
 * the only place these words may appear — and `real-time` provenance cannot
 * be produced until DEC-002 is superseded (src/types/provenance.ts).
 */
/** Render inside AppDataProvider: screens use the hooks/store context (Phase 5). */
const render = (node: ReactNode): ReturnType<typeof renderRntl> =>
  renderRntl(<AppDataProvider>{node}</AppDataProvider>);

const FORBIDDEN_CLAIM_PATTERNS: readonly [string, RegExp][] = [
  ['real-time claim', /\breal[\s-]?time\b/i],
  ['live claim', /\blive\b/i],
  ['delay claim', /\bdelays?\b/i],
  ['official BDZ claim', /\bofficial\b/i],
  ['on-time claim', /\bon[\s-]?time\b/i],
  ['position/tracking claim', /\b(positions?|tracking|locat(ion|ed))\b/i],
  ['guarantee claim', /\bguarantees?\b/i],
];

function expectNoClaims(label: string, text: string): void {
  expect(text.length).toBeGreaterThan(0);
  for (const [claimLabel, pattern] of FORBIDDEN_CLAIM_PATTERNS) {
    expect({
      screen: label,
      claim: claimLabel,
      matched: text.match(pattern)?.[0] ?? null,
    }).toEqual({ screen: label, claim: claimLabel, matched: null });
  }
}

describe.each([
  ['scaffold landing', () => <PlaceholderHomeScreen />],
  ['search tab', () => <SearchScreen />],
  ['map tab', () => <MapScreen />],
  ['my trips / tickets tab', () => <TripsScreen />],
  ['settings tab', () => <SettingsScreen />],
] as const)('%s', (label, renderScreen) => {
  it('makes no real-time, live, delay or official-BDZ claims', async () => {
    await render(renderScreen());
    expectNoClaims(label, renderedText());
  });

  it('shows the visible demo-data label wherever sample content appears', async () => {
    await render(renderScreen());
    if (label === 'map tab') {
      // The Map tab renders the stations feature: its rule-6 demo labelling
      // is the stations.demo badge + notice instead of provenance.demo_desc.
      expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
      expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
    } else {
      expect(screen.getByText(t('provenance.demo'))).toBeTruthy();
      expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
    }
  });
});

describe('onboarding guide', () => {
  it('makes no claims on any of its four steps', async () => {
    await render(<OnboardingFlow storage={createMemorySettingsStorage()} testID="ob" />);

    for (let step = 0; step < 4; step += 1) {
      expectNoClaims(`onboarding step ${step + 1}`, renderedText());
      if (step < 3) {
        await fireEvent.press(screen.getByTestId('ob-next'));
      }
    }
  });

  it('explains the authorized ticket path without offering any purchase UI', async () => {
    await render(<OnboardingFlow storage={createMemorySettingsStorage()} testID="ob" />);

    await fireEvent.press(screen.getByTestId('ob-next'));
    await fireEvent.press(screen.getByTestId('ob-next'));

    // Step 3 (Tickets) must state the purchase path without selling anything.
    expectNoClaims('onboarding tickets step', renderedText());
    expect(screen.queryByRole('button', { name: /buy|purchase|pay/i })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Phase 3/4 journey flow surfaces (mobile-ui): station picker,        */
/* results and details. Synthetic demo data; the same claim lexicon    */
/* applies to every string these surfaces render.                      */
/* ------------------------------------------------------------------ */

function demoStation(id: string, name: string, alternateName?: string): Station {
  return {
    id,
    name,
    alternateName,
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
    trainNumber: '1234',
    providerStatus: 'Планирано по разписание от източника',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
    ...overrides,
  };
}

function demoTransfer(): TransferSegment {
  return {
    kind: 'transfer',
    fromStationId: 'varna',
    toStationId: 'varna',
    plannedMinutes: 15,
    stationChangeRequired: true,
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  };
}

const DEMO_JOURNEY: Journey = {
  id: 'j-demo',
  legs: [
    demoTrain(),
    demoTransfer(),
    demoTrain({ departureTime: null, arrivalTime: null }),
  ],
  segments: [demoTrain(), demoTrain({ departureTime: null, arrivalTime: null })],
  durationMinutes: 420,
  provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
};

describe('journey flow surfaces (Phase 3/4)', () => {
  it('makes no claims on the station picker', async () => {
    await render(
      <StationPickerView
        error={null}
        loading={false}
        onClose={() => {}}
        onSelectStation={() => {}}
        onQueryChange={() => {}}
        query=""
        stations={[
          demoStation('sofia', 'Демо Централна гара София', 'Demo Sofia Central Station'),
          demoStation('long', 'Карлуково-Община Роман Северозападна гара с дълго име'),
        ]}
        t={t}
        testID="picker"
      />,
    );

    expectNoClaims('station picker', renderedText());
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
  });

  it('makes no claims on the journey results list', async () => {
    await render(
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
        testID="results"
        toName="Демо гара Варна"
      />,
    );

    expectNoClaims('journey results', renderedText());
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });

  it('makes no claims on the journey details timeline', async () => {
    await render(
      <JourneyDetailsView
        error={null}
        journey={DEMO_JOURNEY}
        loading={false}
        onBack={() => {}}
        onRetry={() => {}}
        stationName={(id) =>
          id === 'sofia' ? 'Демо Централна гара София' : 'Демо гара Варна'
        }
        t={t}
        testID="details"
      />,
    );

    expectNoClaims('journey details', renderedText());
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('provenance.demo_desc'))).toBeTruthy();
  });

  it('makes no claims in the failure states of the results screen', async () => {
    for (const code of [
      'timeout',
      'offline',
      'network',
      'upstream_error',
      'unknown',
    ] as const) {
      await render(
        <JourneyResultsView
          dateLabel="24.10.2026 г."
          error={{ code, message: 'synthetic', retryable: true }}
          fromName="Демо Централна гара София"
          journeys={[]}
          loading={false}
          onRetry={() => {}}
          t={t}
          testID="results-error"
          toName="Демо гара Варна"
        />,
      );
      expectNoClaims(`journey results error (${code})`, renderedText());
    }
  });
});
