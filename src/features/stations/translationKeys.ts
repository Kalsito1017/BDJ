/**
 * i18n key contract for the stations feature.
 *
 * All user-visible strings in this feature render through `t(key)` with the
 * keys below — never literal text in components (addbeforerelease.txt 8).
 * Namespaces: `stations.*` (station discovery UI) and `map.*` (map area),
 * per the lead brief. Locale files (src/i18n/locales/{bg,en}.json) are
 * owned by the i18n-a11y agent; this object is the exact key list they
 * must provide. Proposed English strings are in the report/PR description,
 * not hard-coded here.
 *
 * If a key is missing from the locale files, `t` returns the key itself —
 * visible but not fabricated data, which is acceptable degradation.
 */

export const STATIONS_KEYS = {
  screenTitle: 'stations.screen.title',
  searchLabel: 'stations.search.label',
  searchPlaceholder: 'stations.search.placeholder',
  listLabel: 'stations.list.label',
  listLoading: 'stations.list.loading',
  listEmptyTitle: 'stations.list.empty.title',
  listEmptyBody: 'stations.list.empty.body',
  resultCount: 'stations.list.result_count',
  viewList: 'stations.view.list',
  viewMap: 'stations.view.map',
  viewToggleLabel: 'stations.view.toggle_label',
  detailCardLabel: 'stations.detail.card_label',
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
  provenanceDemo: 'stations.provenance.demo',
  provenanceScheduled: 'stations.provenance.scheduled',
  provenanceCachedStale: 'stations.provenance.cached_stale',
  provenanceRealTime: 'stations.provenance.real_time',
  nearbyButton: 'stations.nearby.button',
  nearbyTitle: 'stations.nearby.title',
  nearbyIntro: 'stations.nearby.intro',
  nearbyLocating: 'stations.nearby.locating',
  nearbyRequesting: 'stations.nearby.requesting',
  nearbyEmpty: 'stations.nearby.empty',
  nearbyDeniedTitle: 'stations.nearby.denied.title',
  nearbyDeniedBody: 'stations.nearby.denied.body',
  nearbyUnavailable: 'stations.nearby.unavailable',
  nearbyError: 'stations.nearby.error',
  nearbyPrivacyNote: 'stations.nearby.privacy_note',
  nearbyManualNote: 'stations.nearby.manual_note',
  nearbyDistanceMeters: 'stations.nearby.distance_meters',
} as const;

export const MAP_KEYS = {
  pendingTitle: 'map.pending.title',
  pendingBody: 'map.pending.body',
  placeholderLabel: 'map.placeholder.label',
  disclaimer: 'map.disclaimer',
  attributionPlaceholder: 'map.attribution.note',
} as const;

export type StationsKey = (typeof STATIONS_KEYS)[keyof typeof STATIONS_KEYS];
export type MapKey = (typeof MAP_KEYS)[keyof typeof MAP_KEYS];
