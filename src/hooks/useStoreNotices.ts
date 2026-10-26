/**
 * useStoreNotices — local-store corruption/write notices (DEC-007 App. B.4
 * "reset per-field with a visible notice"; the DEC-025 P5-M2 deferred item
 * and DEC-026 Phase-7 blocker (a): store notices must reach the UI).
 *
 * SEMANTICS (the contract mobile-ui codes against; additive fields may be
 * added, names will not change):
 *  - `notices` — `LocalStoreNotice[]`, NEWEST FIRST. Empty in normal use.
 *    Each notice is `{ reason, field, at }`:
 *      · `reason` — `LocalStoreNoticeReason` (see the store module): which
 *        recovery happened (`malformed_snapshot`, `read_failed`,
 *        `unsupported_schema_version`, `invalid_collection`,
 *        `invalid_record`, `invalid_policy`, `write_failed`);
 *      · `field` — the field that was reset/dropped (`snapshot` for
 *        whole-snapshot replacements, else the per-field reset of App. B.4);
 *      · `at` — ISO timestamp of the notice.
 *    The store keeps a bounded history (default 20 notices), so the newest
 *    notice is the one to surface. One-off banner: show the notice, do not
 *    repeat it for the same `at` (the array is append-only; entries never
 *    mutate, so `at` is a safe de-dupe key).
 *  - Reactivity: `useSyncExternalStore` over the store's `subscribe`/
 *    `getSnapshot` — every mounted instance updates the moment a notice is
 *    recorded (corrupt read at hydration, or a failed write later).
 *  - The returned array is a STABLE reference between notice changes (safe
 *    for dependency arrays and memoised children). It is a copy — ordering
 *    here never mutates the store's own chronological notice history.
 *
 * TRUST (DEC-006): notices describe recovery from untrusted local storage;
 * they carry schema-level descriptions only — never persisted values. The
 * whole point is the visible, per-field reset (Appendix B.4): a corrupt
 * record drops THAT record, a corrupt collection resets THAT field, and the
 * rest of the snapshot survives.
 */

import { useMemo, useSyncExternalStore } from 'react';

import type { LocalStoreNotice } from '../services/storage/localStore';
import { useLocalStore } from './localStoreContext';

export type {
  LocalStoreNotice,
  LocalStoreNoticeReason,
} from '../services/storage/localStore';

export interface StoreNoticesState {
  /** Local-store notices, newest first. Empty in normal use. */
  notices: readonly LocalStoreNotice[];
}

export function useStoreNotices(): StoreNoticesState {
  const store = useLocalStore();
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  // The store keeps notices in chronological order (bounded, append-only);
  // the contract is newest-first. Copy + reverse — the store's history is
  // never mutated. `state.notices` is referentially stable between changes,
  // so this memo only recomputes when a notice is actually recorded.
  const notices = useMemo(() => [...state.notices].reverse(), [state.notices]);
  return { notices };
}
