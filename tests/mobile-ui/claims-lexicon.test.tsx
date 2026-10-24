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
import { render, screen, fireEvent } from '@testing-library/react-native';

import PlaceholderHomeScreen from '../../src/app/index';
import MapScreen from '../../src/app/(tabs)/map';
import SearchScreen from '../../src/app/(tabs)/search';
import SettingsScreen from '../../src/app/(tabs)/settings';
import TripsScreen from '../../src/app/(tabs)/trips';
import { OnboardingFlow } from '../../src/features/onboarding';
import { createMemorySettingsStorage } from '../../src/services/storage/settingsStorage';
import { setI18nLocale, translate } from '../../src/i18n';

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
