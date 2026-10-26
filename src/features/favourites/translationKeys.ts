/**
 * i18n key contract for the saved-items surface (Phase 5: favourites +
 * recent searches, plan.md §3.5 / §9 Phase 5).
 *
 * All user-visible strings in this feature render through `t(key)` with the
 * keys below — never literal text in components (addbeforerelease.txt §8).
 * Per DEC-016 §3 the locale files (src/i18n/locales/{bg,en}.json) are owned
 * by the i18n workstream/lead: this object is the exact key list they must
 * merge, and the proposed en+bg values live in the mobile-ui report, not
 * hard-coded here.
 *
 * One vocabulary per surface (DEC-019): everything the saved-items surface
 * says — the lists on the Search screen AND the "Save this route" control on
 * the results/details screens — uses the `favourites.*` / `recents.*`
 * namespaces declared here. Favourites are ROUTE SHORTCUTS, never tickets
 * (rule 3 adjacency): `favourites.notice` states that explicitly wherever
 * saved items are shown or created.
 *
 * REUSED keys (no re-invention, DEC-019):
 * - `common.cancel`, `common.confirm`, `common.delete`, `common.retry` —
 *   dialog chrome and retry actions;
 * - `common.unknown` — a station id the directory cannot resolve;
 * - `states.offline`, `errors.offline` — the offline banner
 *   (src/components/OfflineBanner.tsx; `stations.offline.banner` was NOT
 *   reused because it talks about station data specifically);
 * - `journey_results.stale_hint` — declared in
 *   ../journey-results/translationKeys.ts (journey surface vocabulary).
 *
 * Companion catalog entries to merge TOGETHER with `favourites.notice`
 * (human-review metadata, not rendered by UI):
 *   review.favourites.notice — checklist §8 review marker for wording that
 *   touches tickets.
 *
 * STORE NOTICES (DEC-007 App. B.4 "visible notice"; DEC-026 Phase-7
 * blocker (a)): `notices.*` is the second namespace owned by this contract —
 * the `StoreNoticesBanner` copy, one actionable message per
 * `LocalStoreNoticeReason` plus the banner title. The map is typed against
 * the reason union, so a new reason cannot compile without its key (and the
 * exact key names below are the ones the lead merges into both catalogs).
 * No review.* companion is needed: the copy describes on-device recovery
 * only — no ticket, payment or legal wording.
 */

import type { LocalStoreNoticeReason } from '../../services/storage/localStore';

export const FAVOURITES_KEYS = {
  title: 'favourites.title',
  /** "Save this route" — the results/details action. */
  saveCta: 'favourites.save_cta',
  /** Saved-state label shown instead of the save action. */
  savedLabel: 'favourites.saved_label',
  /** Opens the remove-confirmation dialog. */
  removeCta: 'favourites.remove_cta',
  removeConfirmTitle: 'favourites.remove_confirm_title',
  removeConfirmBody: 'favourites.remove_confirm_body',
  /** Per-row delete button accessible name ({route} = "A → B"). */
  deleteItemLabel: 'favourites.delete_item_label',
  emptyTitle: 'favourites.empty_title',
  emptyBody: 'favourites.empty_body',
  /** Honesty line: saved routes are shortcuts for planning, NOT tickets. */
  notice: 'favourites.notice',
  /** Row accessible name ({from}/{to} = station names). */
  itemA11y: 'favourites.item_a11y',
} as const;

export const RECENTS_KEYS = {
  title: 'recents.title',
  /** Per-row delete button accessible name ({route} = "A → B"). */
  deleteItemLabel: 'recents.delete_item_label',
  clearAllCta: 'recents.clear_all_cta',
  clearConfirmTitle: 'recents.clear_confirm_title',
  clearConfirmBody: 'recents.clear_confirm_body',
  removeConfirmTitle: 'recents.remove_confirm_title',
  /** Row accessible name ({from}/{to}/{date} = names + localized travel date). */
  itemA11y: 'recents.item_a11y',
} as const;

/**
 * Store-notice copy: the banner title plus ONE message per
 * `LocalStoreNoticeReason`. Typed as `Record<LocalStoreNoticeReason, string>`
 * on purpose — the compiler rejects any reason without its key, and every key
 * here is named `notices.<reason>` so the locale merge is mechanical.
 */
export const NOTICE_KEYS = {
  /** Banner title (`.title` values stay <= 48 chars — DEC-016 §2). */
  title: 'notices.title',
} as const;

export const NOTICE_REASON_KEYS: Record<LocalStoreNoticeReason, string> = {
  malformed_snapshot: 'notices.malformed_snapshot',
  read_failed: 'notices.read_failed',
  unsupported_schema_version: 'notices.unsupported_schema_version',
  invalid_collection: 'notices.invalid_collection',
  invalid_record: 'notices.invalid_record',
  invalid_policy: 'notices.invalid_policy',
  write_failed: 'notices.write_failed',
};

export type FavouriteKey = (typeof FAVOURITES_KEYS)[keyof typeof FAVOURITES_KEYS];
export type RecentKey = (typeof RECENTS_KEYS)[keyof typeof RECENTS_KEYS];
