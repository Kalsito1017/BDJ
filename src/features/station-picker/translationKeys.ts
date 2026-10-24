/**
 * i18n key contract for the station picker (Phase 3 surface).
 *
 * This surface intentionally defines NO new keys: every string reuses the
 * key set DEC-019 restored and reserved for Phase 3 ("must be reused rather
 * than re-invented"). Proposed consolidation of the duplicate station
 * vocabularies (stations.empty vs stations.list.empty.title etc.) is listed
 * in the mobile-ui report for the lead to decide (DEC-019, one vocabulary
 * per surface).
 */

export const STATION_PICKER_KEYS = {
  screenTitle: 'stations.title',
  searchLabel: 'stations.search_label',
  searchPlaceholder: 'stations.search_placeholder',
  /** "Works with Cyrillic, Latin and mixed input" — shown under the input. */
  searchHint: 'stations.search_hint',
  listLabel: 'stations.list_title',
  resultCount: 'stations.result_count',
  noResults: 'stations.no_results',
  empty: 'stations.empty',
  demoNotice: 'stations.demo.notice',
  close: 'common.close',
  searchInputLabel: 'a11y.search_input_label',
  searchInputHint: 'a11y.search_input_hint',
  rowA11y: 'a11y.search_result',
} as const;

export type StationPickerKey =
  (typeof STATION_PICKER_KEYS)[keyof typeof STATION_PICKER_KEYS];
