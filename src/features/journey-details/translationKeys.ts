/**
 * i18n key contract for the journey details timeline (Phase 4 surface).
 *
 * The shared `journey.*` vocabulary is single-sourced in
 * `../journey-results/translationKeys.ts` (results cards and the details
 * timeline are one surface — DEC-019) and re-exported here so this feature
 * has one import for its keys. Locale values are merged by the lead
 * (DEC-016 §3); proposed en+bg values are in the mobile-ui report.
 */

import { JOURNEY_KEYS } from '../journey-results/translationKeys';

export const JOURNEY_DETAILS_KEYS = {
  title: 'journey_details.title',
  timelineLabel: 'journey_details.timeline_label',
  legTrain: 'journey_details.leg_train',
  legTransfer: 'journey_details.leg_transfer',
  /** "Connection time: {minutes} min". */
  transferWait: 'journey_details.transfer_wait',
  stationChange: 'journey_details.station_change',
  /** "Train {number}". */
  trainNumber: 'journey_details.train_number',
  /** "Note from the data source" — verbatim providerStatus attribution. */
  providerNote: 'journey_details.provider_note',
  back: 'common.back',
} as const;

export { JOURNEY_KEYS };

export type JourneyDetailsKey =
  (typeof JOURNEY_DETAILS_KEYS)[keyof typeof JOURNEY_DETAILS_KEYS];
