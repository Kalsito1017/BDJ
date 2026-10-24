/**
 * Journey results route (`/search/results` — deep-link contract recorded in
 * docs/decisions.md DEC-022 §1).
 *
 * Search params are the typed `JourneySearch` fields:
 *   ?from=<stationId>&to=<stationId>&date=YYYY-MM-DD
 * Ids are opaque (DEC-006). Data comes from the shared hooks contract
 * (src/hooks); this route file stays a thin wrapper. Works WITHOUT sign-in.
 */
import { JourneyResultsScreen } from '../../features/journey-results';

export default function SearchResultsRoute() {
  return <JourneyResultsScreen testID="screen-search-results" />;
}
