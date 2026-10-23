import { render, screen } from '@testing-library/react-native';

import PlaceholderScreen from '../../src/app/index';

/**
 * Phase 1 smoke + regression tests: the placeholder route renders and claims
 * no train data. Real feature tests belong to Waves 3+ (plan.md §11).
 *
 * Note: React Native Testing Library v14 `render` is async — always await it.
 */

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
 * Rule 6 / plan.md §1: the scaffold must not claim live positions, live
 * delays, real-time information or official BDZ status. This lexicon is the
 * regression guard for every string on this screen; future screens must keep
 * provenance labels instead of raw claims (DEC-006).
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

describe('scaffold placeholder screen', () => {
  it('renders the placeholder and states that no timetable data exists yet', async () => {
    await render(<PlaceholderScreen />);

    expect(screen.getByText('BDZ Train Companion')).toBeTruthy();
    expect(
      screen.getByText(
        'Project scaffold placeholder. No timetable data is available in the app yet.',
      ),
    ).toBeTruthy();
  });

  it('makes no live-data, delay or official-BDZ claims anywhere in its rendered text', async () => {
    await render(<PlaceholderScreen />);

    const text = renderedText();
    expect(text.length).toBeGreaterThan(0);
    for (const [label, pattern] of FORBIDDEN_CLAIM_PATTERNS) {
      expect({ label, matched: text.match(pattern)?.[0] ?? null }).toEqual({
        label,
        matched: null,
      });
    }
  });

  it('keeps the explicit "no timetable data" disclaimer visible', async () => {
    await render(<PlaceholderScreen />);

    // Regression: if this screen ever grows content, the disclaimer must not
    // silently disappear (addbeforerelease.txt §1: mock data labelled as demo).
    expect(screen.queryByText(/no timetable data/i)).toBeTruthy();
  });
});
