/* eslint-disable import/namespace, import/no-unresolved, import/no-duplicates --
 * The repository's ESLint import resolver cannot read package `exports`
 * subpaths (see tests/mobile-ui/journey-routes.test.tsx): `npm run
 * typecheck` resolves `expo-router/testing-library` correctly. */

/**
 * Accessibility sweep — the AUTOMATED part of checklist §10 (plan.md §9
 * Phase 6 "check accessibility"; §11 "manual accessibility checks").
 *
 * WHAT THIS PROVES. The main screens are rendered through the REAL router
 * (expo-router testing library) and walked element by element:
 *
 *  1. every interactive element (Button/Pressable — anything that can take
 *     a press, i.e. a host touch responder) carries a NON-EMPTY accessible
 *     name, either as `accessibilityLabel` or as its rendered text;
 *  2. state components announce themselves the way the DESIGN SYSTEM
 *     defines them (component headers, src/components):
 *       - loading  → `accessibilityRole="progressbar"` + `busy: true` + name
 *                    (Loader, ListSkeleton);
 *       - errors / offline / confirmations → `accessibilityRole="alert"` +
 *                    a name (StatusMessage alert family, OfflineBanner,
 *                    TextInput inline error, ConfirmDialog).
 *
 * On failure the assertion prints the full list of offenders (surface,
 * element, and what is missing) — not just a count.
 *
 * SURFACES WALKED (scoped by their screen testID): search form, recent
 * searches, saved routes (favourites), journey results, journey details,
 * station picker, settings — plus the state surfaces reached by driving the
 * real UI: results error state, form validation errors, delete confirmation
 * dialog.
 *
 * WHAT THIS CANNOT PROVE (honest limits — the checks remain NOT RUN):
 *  - screen-reader behaviour itself: focus order, what VoiceOver/TalkBack
 *    actually announce, gestures, rotor/heading navigation
 *    (docs/voiceover-talkback-scripts.md — manual, NOT RUN here);
 *  - touch target sizes on device, dynamic type reflow, contrast ratios;
 *  - the map surface (native module renders zero pixels in this
 *    environment — DEC-026 Phase 7 blocker b).
 * Shell chrome (tab bar, modals outside a screen, the onboarding overlay)
 * is out of scope: the tab bar is React Navigation's own component tree
 * (navigation-shell.test.tsx covers the shell).
 */

import { fireEvent, render, renderRouter, screen } from 'expo-router/testing-library';

import { ListSkeleton, Loader, OfflineBanner } from '../../src/components';
import { addDaysIso, systemTodayIso } from '../../src/features/journey-search/validation';
import { resetPendingStationSelection } from '../../src/features/station-picker/selection';
import { setI18nLocale } from '../../src/i18n';
import { localStore } from '../../src/services/storage/localStore';
import type { TestInstance } from 'test-renderer';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// Memory-store seam: replace ONLY the app-wide singleton export (the root
// layout gives no injection point) so favourite/recent rows render without
// touching AsyncStorage (see tests/smoke/journey-flow-e2e.test.tsx).
jest.mock('../../src/services/storage/localStore', () => {
  const actual =
    jest.requireActual<typeof import('../../src/services/storage/localStore')>(
      '../../src/services/storage/localStore',
    );
  return { ...actual, localStore: actual.createMemoryLocalStore() };
});

/** findBy* third-argument form (the 2nd-argument timeout is deprecated). */
const WAIT = { timeout: 8000 };

const SOFIA_ID = 'demo-station-sofia-central';
const VARNA_ID = 'demo-station-varna';
const VALID_DATE = addDaysIso(systemTodayIso(), 7);

const RESULTS_URL = `/search/results?from=${SOFIA_ID}&to=${VARNA_ID}&date=${VALID_DATE}`;

/* ------------------------------------------------------------------ */
/* The sweep itself — a walk over the rendered host-element tree.       */
/* ------------------------------------------------------------------ */

/** A press takes a touch responder (Button/Pressable) or a text input. */
function isInteractive(node: TestInstance): boolean {
  return (
    typeof node.props.onStartShouldSetResponder === 'function' ||
    typeof node.props.onPress === 'function' ||
    node.type === 'TextInput'
  );
}

/** The text a node actually renders (nested Text children included). */
function renderedText(node: TestInstance): string {
  return node.children
    .map((child) => (typeof child === 'string' ? child : renderedText(child)))
    .join(' ')
    .trim();
}

/**
 * The accessible name as a screen reader would fall back to it:
 * `accessibilityLabel` first, otherwise the rendered text.
 */
function accessibleName(node: TestInstance): string {
  const label = node.props.accessibilityLabel;
  if (typeof label === 'string' && label.trim().length > 0) return label.trim();
  return renderedText(node);
}

function describeNode(node: TestInstance): string {
  const testID = node.props.testID;
  return `${node.type}${typeof testID === 'string' ? ` (testID=${testID})` : ''}`;
}

/**
 * Walk one surface and return one offender line per broken promise.
 * Empty array = the surface passes the sweep.
 */
function audit(root: TestInstance, surface: string): string[] {
  const offenders: string[] = [];
  for (const node of root.queryAll(() => true, { includeSelf: true })) {
    const role = node.props.accessibilityRole;
    const name = accessibleName(node);

    if (isInteractive(node) && name.length === 0) {
      offenders.push(
        `${surface}: interactive ${describeNode(node)} has no accessible name ` +
          `(no accessibilityLabel and no rendered text)`,
      );
    }

    // Design-system role announcements (src/components headers):
    // loading = progressbar + busy; error-like states = alert.
    if (role === 'progressbar') {
      if (name.length === 0) {
        offenders.push(`${surface}: ${describeNode(node)} announces progressbar without a name`);
      }
      if (node.props.accessibilityState?.busy !== true) {
        offenders.push(
          `${surface}: ${describeNode(node)} announces progressbar without accessibilityState.busy`,
        );
      }
    }
    if (role === 'alert') {
      // A name is required; `accessible` defaults to exposed for text nodes
      // (TextInput's inline error is a plain Text), so only an EXPLICIT
      // `accessible={false}` is an offender.
      if (name.length === 0) {
        offenders.push(`${surface}: ${describeNode(node)} announces alert without a name`);
      }
      if (node.props.accessible === false) {
        offenders.push(
          `${surface}: ${describeNode(node)} announces alert but is hidden from assistive tech`,
        );
      }
    }
  }
  return offenders;
}

/** Render the router at `url`, find the surface's scope node, sweep it. */
async function sweepSurface(
  surface: string,
  url: string,
  scopeTestID: string,
  readyTestID?: string,
): Promise<void> {
  await renderRouter('src/app', { initialUrl: url });
  await screen.findByTestId(scopeTestID, {}, WAIT);
  if (readyTestID) {
    await screen.findByTestId(readyTestID, {}, WAIT);
  }
  expect(audit(screen.getByTestId(scopeTestID), surface)).toEqual([]);
}

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(async () => {
  resetPendingStationSelection();
  // Hydrated + seeded so the recents/favourites rows (and their delete
  // buttons) are part of the walk. Identity-idempotent: safe to re-seed.
  await localStore.hydrate();
  localStore.recordSearch({
    fromStationId: SOFIA_ID,
    toStationId: VARNA_ID,
    date: VALID_DATE,
  });
  localStore.addFavouriteRoute({ fromStationId: SOFIA_ID, toStationId: VARNA_ID });
});

describe('accessibility sweep — interactive elements carry accessible names', () => {
  it('journey search form', async () => {
    await sweepSurface('search form', '/search', 'journey-search-form');
  });

  it('recent searches section (with rows)', async () => {
    await sweepSurface('recent searches', '/search', 'screen-search-recents');
  });

  it('saved routes (favourites) section (with rows)', async () => {
    await sweepSurface('saved routes', '/search', 'screen-search-favourites');
  });

  it('journey results', async () => {
    await sweepSurface(
      'journey results',
      RESULTS_URL,
      'screen-search-results',
      'screen-search-results-card-0',
    );
  });

  it('journey details', async () => {
    await sweepSurface(
      'journey details',
      '/journey/demo-journey-direct',
      'screen-journey-details',
      'screen-journey-details-leg-0',
    );
  });

  it('station picker', async () => {
    await sweepSurface(
      'station picker',
      '/search/station-picker?field=from',
      'screen-station-picker',
      'screen-station-picker-search',
    );
  });

  it('settings', async () => {
    await sweepSurface('settings', '/settings', 'screen-settings');
  });
});

describe('accessibility sweep — state surfaces announce their roles', () => {
  it('results error state announces alert (driven through the real router)', async () => {
    // Broken results params → the real error state (not_found).
    await renderRouter('src/app', { initialUrl: '/search/results' });
    const scope = await screen.findByTestId('screen-search-results-error', {}, WAIT);

    expect(audit(scope, 'results error state')).toEqual([]);
    expect(scope.props.accessibilityRole).toBe('alert');
  });

  it('form validation errors announce alert', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });
    await screen.findByTestId('journey-search-form', {}, WAIT);

    // Submitting an empty form surfaces the inline field errors.
    await screen.findByTestId('journey-search-form-submit', {}, WAIT);
    await fireEvent.press(screen.getByTestId('journey-search-form-submit'));

    const fromError = await screen.findByTestId('journey-search-form-from-error', {}, WAIT);
    expect(audit(fromError, 'form validation error')).toEqual([]);
    expect(fromError.props.accessibilityRole).toBe('alert');
  });

  it('delete confirmation dialog announces alert (checklist §10)', async () => {
    await renderRouter('src/app', { initialUrl: '/search' });
    const favourite = localStore.getSnapshot().snapshot.favouriteRoutes[0];
    expect(favourite).toBeDefined();

    const deleteButton = await screen.findByTestId(
      `screen-search-favourites-item-${favourite.id}-delete`,
      {},
      WAIT,
    );
    await fireEvent.press(deleteButton);

    const dialog = await screen.findByTestId('screen-search-favourites-remove-confirm', {}, WAIT);
    expect(audit(dialog, 'confirmation dialog')).toEqual([]);
    expect(dialog.props.accessibilityRole).toBe('alert');

    // Leave the fixture intact: cancel the dialog.
    await fireEvent.press(screen.getByTestId('screen-search-favourites-remove-confirm-cancel'));
  });

  it('loading indicators announce progressbar + busy + name (design-system contract)', async () => {
    await render(
      <>
        <Loader testID="a11y-sweep-loader" />
        <ListSkeleton rows={2} testID="a11y-sweep-skeleton" />
      </>,
    );

    for (const id of ['a11y-sweep-loader', 'a11y-sweep-skeleton']) {
      const node = screen.getByTestId(id);
      expect(node.props.accessibilityRole).toBe('progressbar');
      expect(node.props.accessibilityState?.busy).toBe(true);
      expect(accessibleName(node).length).toBeGreaterThan(0);
      expect(audit(node, `loading state ${id}`)).toEqual([]);
    }
  });

  it('offline banner announces alert + name (design-system contract)', async () => {
    await render(<OfflineBanner onRetry={() => undefined} testID="a11y-sweep-offline" visible />);

    const node = screen.getByTestId('a11y-sweep-offline');
    expect(node.props.accessibilityRole).toBe('alert');
    expect(audit(node, 'offline banner')).toEqual([]);
  });
});
