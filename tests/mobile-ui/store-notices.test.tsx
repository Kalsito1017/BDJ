/**
 * StoreNoticesBanner — visible local-store corruption/write notices
 * (DEC-007 Appendix B.4 "visible notice"; DEC-026 Phase-7 blocker (a):
 * "store notices never surfaced in UI"; checklist §7 "error messages a user
 * can act on").
 *
 * What this suite pins:
 *  - NOTHING renders when the store is healthy (zero clutter in the happy
 *    path) — both on the bare banner and on the FavouritesSection mount;
 *  - the banner shows the NEWEST notice only, with one actionable message per
 *    `LocalStoreNoticeReason` (the key map is typed against the reason union,
 *    and this suite pins the exact `notices.<reason>` key names the lead must
 *    merge);
 *  - `common.close` dismissal hides the notice (component-local; the same
 *    notice never re-appears, a NEWER one does);
 *  - alert/live-region semantics on the visible notice;
 *  - rule 6 claim lexicon on every rendered string, and no raw translation
 *    key outside the derived pending `notices.*` set (the lead locale merge
 *    is still owed for these keys — see i18n-integrity.test.tsx).
 *
 * Expectations are composed through the REAL translate function so they stay
 * valid before and after the lead merges the `notices.*` values.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { FavouritesSection } from '../../src/features/favourites/FavouritesSection';
import { StoreNoticesBanner } from '../../src/features/favourites/StoreNoticesBanner';
import {
  NOTICE_KEYS,
  NOTICE_REASON_KEYS,
} from '../../src/features/favourites/translationKeys';
import { LocalStoreProvider } from '../../src/hooks';
import { catalogs, setI18nLocale, translate } from '../../src/i18n';
import {
  createMemoryLocalStore,
  type LocalStoreNotice,
  type LocalStoreNoticeReason,
} from '../../src/services/storage/localStore';

beforeAll(() => {
  setI18nLocale('en');
});

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

/** Every member of `LocalStoreNoticeReason` — drift detector for the map. */
const ALL_REASONS: readonly LocalStoreNoticeReason[] = [
  'malformed_snapshot',
  'read_failed',
  'unsupported_schema_version',
  'invalid_collection',
  'invalid_record',
  'invalid_policy',
  'write_failed',
];

function notice(
  reason: LocalStoreNoticeReason,
  at = '2026-10-25T09:00:00.000Z',
): LocalStoreNotice {
  return { reason, field: 'snapshot', at };
}

/* ------------------- rendered-text helpers (claims-lexicon pattern) ------------------- */

interface RenderedNode {
  children?: (RenderedNode | string)[];
}

function collectRenderedText(node: RenderedNode | string | null): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  return (node.children ?? []).flatMap(collectRenderedText);
}

function renderedLines(): string[] {
  return collectRenderedText(screen.toJSON()).map((line) => line.trim());
}

/** Flat dot-separated key shape (DEC-016 §1) — the raw-key fallback look. */
const RAW_KEY_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;

/** Identical to tests/mobile-ui/claims-lexicon.test.tsx (rule 6). */
const FORBIDDEN_CLAIM_PATTERNS: readonly [string, RegExp][] = [
  ['real-time claim', /\breal[\s-]?time\b/i],
  ['live claim', /\blive\b/i],
  ['delay claim', /\bdelays?\b/i],
  ['official BDZ claim', /\bofficial\b/i],
  ['on-time claim', /\bon[\s-]?time\b/i],
  ['position/tracking claim', /\b(positions?|tracking|locat(ion|ed))\b/i],
  ['guarantee claim', /\bguarantees?\b/i],
];

/* --------------------------------- banner --------------------------------- */

describe('StoreNoticesBanner', () => {
  it('renders nothing at all when there are no notices', async () => {
    await render(<StoreNoticesBanner notices={[]} testID="notices" />);

    expect(screen.toJSON()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('notices')).toBeNull();
  });

  it('pins the exact notices.* key names for the lead locale merge', () => {
    expect(NOTICE_KEYS.title).toBe('notices.title');
    for (const reason of ALL_REASONS) {
      expect(NOTICE_REASON_KEYS[reason]).toBe(`notices.${reason}`);
    }
  });

  it('covers every LocalStoreNoticeReason member with its own key', () => {
    expect(Object.keys(NOTICE_REASON_KEYS).sort()).toEqual([...ALL_REASONS].sort());
  });

  it.each(ALL_REASONS)('renders actionable copy for the %s reason', async (reason) => {
    await render(<StoreNoticesBanner notices={[notice(reason)]} testID="notices" />);

    expect(screen.getByText(t(NOTICE_KEYS.title))).toBeTruthy();
    expect(screen.getByTestId('notices-message')).toBeTruthy();
    expect(screen.getByText(t(NOTICE_REASON_KEYS[reason]))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('common.close') })).toBeTruthy();
  });

  it.each(ALL_REASONS)(
    'renders only the %s copy — never another reason at the same time',
    async (reason) => {
      await render(<StoreNoticesBanner notices={[notice(reason)]} testID="notices" />);

      for (const other of ALL_REASONS) {
        if (other === reason) continue;
        expect(screen.queryByText(t(NOTICE_REASON_KEYS[other]))).toBeNull();
      }
    },
  );

  it('shows the newest notice only (useStoreNotices returns newest first)', async () => {
    await render(
      <StoreNoticesBanner
        notices={[
          notice('write_failed', '2026-10-25T10:00:00.000Z'),
          notice('malformed_snapshot', '2026-10-25T08:00:00.000Z'),
        ]}
        testID="notices"
      />,
    );

    expect(screen.getByText(t(NOTICE_REASON_KEYS.write_failed))).toBeTruthy();
    expect(screen.queryByText(t(NOTICE_REASON_KEYS.malformed_snapshot))).toBeNull();
  });

  it('dismisses with common.close and never repeats the same notice', async () => {
    const { rerender } = await render(
      <StoreNoticesBanner notices={[notice('invalid_record')]} testID="notices" />,
    );

    await fireEvent.press(screen.getByRole('button', { name: t('common.close') }));
    expect(screen.toJSON()).toBeNull();

    // Same notice again (its `at` identifies it for good): stays hidden.
    await rerender(
      <StoreNoticesBanner notices={[notice('invalid_record')]} testID="notices" />,
    );
    expect(screen.toJSON()).toBeNull();
  });

  it('shows a NEWER notice after a dismissal', async () => {
    const { rerender } = await render(
      <StoreNoticesBanner
        notices={[notice('invalid_record', '2026-10-25T08:00:00.000Z')]}
        testID="notices"
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: t('common.close') }));
    expect(screen.toJSON()).toBeNull();

    await rerender(
      <StoreNoticesBanner
        notices={[
          notice('write_failed', '2026-10-25T10:00:00.000Z'),
          notice('invalid_record', '2026-10-25T08:00:00.000Z'),
        ]}
        testID="notices"
      />,
    );
    expect(screen.getByText(t(NOTICE_REASON_KEYS.write_failed))).toBeTruthy();
  });

  it('exposes alert semantics for the visible notice', async () => {
    await render(
      <StoreNoticesBanner notices={[notice('read_failed')]} testID="notices" />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(t(NOTICE_REASON_KEYS.read_failed))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('common.close') })).toBeTruthy();
  });

  it.each(ALL_REASONS)('makes no claim wording in the %s copy', async (reason) => {
    await render(<StoreNoticesBanner notices={[notice(reason)]} testID="notices" />);

    const text = renderedLines().join('\n');
    expect(text.length).toBeGreaterThan(0);
    for (const [claimLabel, pattern] of FORBIDDEN_CLAIM_PATTERNS) {
      expect({
        reason,
        claim: claimLabel,
        matched: text.match(pattern)?.[0] ?? null,
      }).toEqual({ reason, claim: claimLabel, matched: null });
    }
  });

  it('renders no raw translation keys outside the pending notices set', async () => {
    await render(
      <StoreNoticesBanner notices={[notice('invalid_policy')]} testID="notices" />,
    );

    const contractKeys = new Set<string>([
      ...Object.values(NOTICE_KEYS),
      ...Object.values(NOTICE_REASON_KEYS),
    ]);
    const rawKeys = renderedLines().filter((line) => RAW_KEY_PATTERN.test(line));
    // A raw key is only tolerable while it is a notices.* contract key still
    // missing from BOTH catalogs (the derived pending set the lead merges).
    const unexpected = rawKeys.filter(
      (key) => !contractKeys.has(key) || key in catalogs.bg || key in catalogs.en,
    );
    expect({ unexpected }).toEqual({ unexpected: [] });
  });
});

/* --------------------- mounting on the saved-items area --------------------- */

function renderFavouritesSection(store = createMemoryLocalStore()) {
  return render(
    <LocalStoreProvider store={store}>
      <FavouritesSection
        t={t}
        favourites={[]}
        loading={false}
        stationName={(stationId: string) => stationId}
        onSelect={() => {}}
        onDelete={() => {}}
        testID="fav"
      />
    </LocalStoreProvider>,
  );
}

describe('store notices on the saved-items surface', () => {
  it('renders nothing when the local store is healthy', async () => {
    await renderFavouritesSection();
    await act(async () => {});

    expect(screen.queryByTestId('fav-store-notices')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('surfaces a corrupt-load recovery notice from the real store', async () => {
    // Corrupt persisted snapshot -> the store replaces it and records a
    // `malformed_snapshot` notice (DEC-007 App. B.4), which must reach the UI.
    await renderFavouritesSection(createMemoryLocalStore({ initialRaw: 'not json {' }));
    await act(async () => {});

    expect(screen.getByTestId('fav-store-notices')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(t(NOTICE_REASON_KEYS.malformed_snapshot))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('common.close') })).toBeTruthy();
  });

  it('hides the mounted notice after dismissal', async () => {
    await renderFavouritesSection(createMemoryLocalStore({ initialRaw: 'not json {' }));
    await act(async () => {});

    await fireEvent.press(screen.getByRole('button', { name: t('common.close') }));
    expect(screen.queryByTestId('fav-store-notices')).toBeNull();
  });
});
