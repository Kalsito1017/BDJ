/**
 * Provenance labelling tests (DEC-006; rule 6: demo / scheduled /
 * cached-stale / real-time must never be conflated).
 *
 * The demo label must be visible wherever mocked data is shown
 * (addbeforerelease.txt §1).
 */
import { render, screen } from '@testing-library/react-native';

import { DemoDataNotice, ProvenanceBadge } from '../../src/components';
import {
  PROVENANCE_DESCRIPTION_KEYS,
  PROVENANCE_LABEL_KEYS,
  setI18nLocale,
  translate,
} from '../../src/i18n';
import type { InformationProvenance, ProvenanceKind } from '../../src/types/provenance';

beforeAll(() => {
  setI18nLocale('en');
});

const SAMPLE: Record<ProvenanceKind, InformationProvenance> = {
  demo: { kind: 'demo', fetchedAt: '2026-10-23T08:00:00.000Z' },
  scheduled: {
    kind: 'scheduled',
    fetchedAt: '2026-10-23T08:00:00.000Z',
    sourceUpdatedAt: '2026-10-22T20:00:00.000Z',
  },
  'cached-stale': {
    kind: 'cached-stale',
    fetchedAt: '2026-10-23T08:00:00.000Z',
    cachedAt: '2026-10-22T08:00:00.000Z',
    expiresAt: '2026-10-22T12:00:00.000Z',
    staleReason: 'expired-ttl',
  },
  'real-time': {
    kind: 'real-time',
    fetchedAt: '2026-10-23T08:00:00.000Z',
    observedAt: '2026-10-23T08:00:00.000Z',
    sourceId: 'synthetic-test-feed',
  },
};

describe('ProvenanceBadge', () => {
  const kinds = Object.keys(SAMPLE) as ProvenanceKind[];

  it.each(kinds)('renders the %s label from its provenance key', async (kind) => {
    await render(<ProvenanceBadge provenance={SAMPLE[kind]} showDescription />);

    expect(screen.getByText(translate('en', PROVENANCE_LABEL_KEYS[kind]))).toBeTruthy();
    expect(
      screen.getByText(translate('en', PROVENANCE_DESCRIPTION_KEYS[kind])),
    ).toBeTruthy();
  });

  it('labels itself for screen readers with the source kind', async () => {
    await render(<ProvenanceBadge provenance={SAMPLE.demo} />);

    const badge = screen.getByLabelText(
      translate('en', 'a11y.provenance_badge', {
        label: translate('en', PROVENANCE_LABEL_KEYS.demo),
      }),
    );
    expect(badge).toBeTruthy();
    expect(badge.props.accessibilityHint).toBe(
      translate('en', 'a11y.provenance_badge_hint'),
    );
  });

  it('keeps the demo label visible (mock data must never look real)', async () => {
    await render(<ProvenanceBadge provenance={SAMPLE.demo} />);
    expect(screen.getByText(translate('en', 'provenance.demo'))).toBeTruthy();
  });
});

describe('DemoDataNotice', () => {
  it('always shows the demo label and its disclaimer', async () => {
    await render(<DemoDataNotice testID="notice" />);

    expect(screen.getByText(translate('en', 'provenance.demo'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'provenance.demo_desc'))).toBeTruthy();
  });
});
