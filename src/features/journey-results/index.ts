/**
 * Journey results feature (Phase 4) — public surface.
 *
 * `JourneyResultsView`/`JourneyCard` are pure (injected data, translations
 * and callbacks) and are what the mobile-ui tests exercise;
 * `JourneyResultsScreen` is the thin route wiring over the shared hooks
 * contract (src/hooks). The shared journey display model lives in
 * `model/journeyDisplay.ts` (also used by journey-details).
 */
export { JourneyCard, type JourneyCardProps } from './JourneyCard';
export {
  JourneyResultsScreen,
  type JourneyResultsScreenProps,
} from './JourneyResultsScreen';
export { JourneyResultsView, type JourneyResultsViewProps } from './JourneyResultsView';
export {
  dayOffsetText,
  durationText,
  firstTrainLeg,
  journeyLegs,
  lastTrainLeg,
  routeA11yText,
  timeText,
  transfersCount,
  transfersText,
  type Translate,
} from './model/journeyDisplay';
export {
  JOURNEY_KEYS,
  JOURNEY_RESULTS_KEYS,
  type JourneyKey,
  type JourneyResultsKey,
} from './translationKeys';
