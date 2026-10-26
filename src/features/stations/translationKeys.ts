/**
 * i18n key contract for the stations feature (map + station discovery).
 *
 * All user-visible strings in this feature render through `t(key)` with the
 * keys below — never literal text in components (addbeforerelease.txt 8).
 * Locale files (src/i18n/locales/{bg,en}.json) are owned by the i18n/lead
 * side; this object is the exact key list they must provide. If a key is
 * missing from the locale files, `t` returns the key itself — visible but
 * not fabricated data, which is acceptable degradation.
 *
 * VOCABULARY CONSOLIDATION (DEC-022 §5, lead-reviewed map wave): the two
 * parallel vocabularies (this contract vs the reserved `stations.*`/`map.*`
 * set restored in DEC-018 and consumed by the journey flow's station picker)
 * are consolidated to ONE key per concept. This file now points at the
 * reserved keys wherever the concept matched exactly (same placeholders):
 *
 *   stations.screen.title        -> stations.title
 *   stations.search.label        -> stations.search_label
 *   stations.search.placeholder  -> stations.search_placeholder
 *   stations.list.label          -> stations.list_title
 *   stations.list.empty.title    -> stations.empty
 *   stations.list.result_count   -> stations.result_count   ({count})
 *   stations.view.list           -> map.view_list
 *   stations.view.map            -> map.view_map
 *   stations.view.toggle_label   -> map.list_map_toggle_label
 *   stations.detail.card_label   -> stations.detail_title
 *   stations.nearby.title        -> stations.nearby_title
 *   stations.nearby.empty        -> map.nearby_empty
 *   stations.nearby.denied.title -> map.permission_denied
 *   stations.nearby.denied.body  -> map.permission_denied_body
 *   stations.provenance.*        -> provenance.* (shared label vocabulary,
 *                                   src/i18n/keys.ts — see ProvenanceBadge)
 *
 * The retired keys become UNUSED in the catalogs and are reported to the
 * lead for deletion (DEC-016 §3: the catalog is single-owner; this agent
 * does not edit it). Keys kept here are genuinely unique to this feature:
 * the detail FIELD labels (stations.detail.*), the demo badge/notice, the
 * nearby flow extras, the offline banner, map.pending.* (fallback copy) and
 * map.disclaimer (rule 6 on the map itself).
 *
 * NEW keys are NOT invented here (DEC-016 §3 + tests/i18n/key-usage.test.ts):
 * every key below exists in both catalogs today.
 */

export const STATIONS_KEYS = {
  screenTitle: 'stations.title',
  searchLabel: 'stations.search_label',
  searchPlaceholder: 'stations.search_placeholder',
  listLabel: 'stations.list_title',
  listLoading: 'stations.list.loading',
  listEmptyTitle: 'stations.empty',
  listEmptyBody: 'stations.list.empty.body',
  resultCount: 'stations.result_count',
  viewList: 'map.view_list',
  viewMap: 'map.view_map',
  viewToggleLabel: 'map.list_map_toggle_label',
  detailCardLabel: 'stations.detail_title',
  detailName: 'stations.detail.name',
  detailAlternateName: 'stations.detail.alternate_name',
  detailAliases: 'stations.detail.aliases',
  detailKind: 'stations.detail.kind',
  detailCountry: 'stations.detail.country',
  detailLocation: 'stations.detail.location',
  detailUnknown: 'stations.detail.unknown',
  detailClose: 'stations.detail.close',
  demoBadge: 'stations.demo.badge',
  demoNotice: 'stations.demo.notice',
  offlineBanner: 'stations.offline.banner',
  nearbyButton: 'stations.nearby.button',
  nearbyTitle: 'stations.nearby_title',
  nearbyIntro: 'stations.nearby.intro',
  nearbyLocating: 'stations.nearby.locating',
  nearbyRequesting: 'stations.nearby.requesting',
  nearbyEmpty: 'map.nearby_empty',
  nearbyDeniedTitle: 'map.permission_denied',
  nearbyDeniedBody: 'map.permission_denied_body',
  nearbyUnavailable: 'stations.nearby.unavailable',
  nearbyError: 'stations.nearby.error',
  nearbyPrivacyNote: 'stations.nearby.privacy_note',
  nearbyManualNote: 'stations.nearby.manual_note',
  nearbyDistanceMeters: 'stations.nearby.distance_meters',
} as const;

export const MAP_KEYS = {
  /** Accessible name of the map area itself ("Map"). */
  title: 'map.title',
  /** Fallback copy: the map cannot render in this build/environment. */
  pendingTitle: 'map.pending.title',
  pendingBody: 'map.pending.body',
  /** Accessible name of the clearly-labelled map placeholder. */
  placeholderLabel: 'map.placeholder.label',
  /** Rule 6 disclaimer rendered ON the map next to the markers. */
  disclaimer: 'map.disclaimer',
  /** Accessible name of the required attribution block (DEC-012). */
  attributionLabel: 'map.attribution_label',
  /** Attribution-area note shown on the placeholder (map not rendered). */
  attributionPlaceholder: 'map.attribution.note',
} as const;

export type StationsKey = (typeof STATIONS_KEYS)[keyof typeof STATIONS_KEYS];
export type MapKey = (typeof MAP_KEYS)[keyof typeof MAP_KEYS];
