/**
 * Journey details feature (Phase 4) — public surface.
 *
 * `JourneyDetailsView`/`JourneyLegRow` are pure (injected journey, station
 * name resolver and translations) and are what the mobile-ui tests
 * exercise; `JourneyDetailsScreen` is the thin route wiring over the shared
 * hooks contract (src/hooks).
 */
export {
  JourneyDetailsScreen,
  type JourneyDetailsScreenProps,
} from './JourneyDetailsScreen';
export { JourneyDetailsView, type JourneyDetailsViewProps } from './JourneyDetailsView';
export { JourneyLegRow, type JourneyLegRowProps } from './JourneyLegRow';
export {
  JOURNEY_DETAILS_KEYS,
  JOURNEY_KEYS,
  type JourneyDetailsKey,
} from './translationKeys';
