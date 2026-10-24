/**
 * Journey details route (`/journey/[id]` — deep-link contract recorded in
 * docs/decisions.md DEC-022 §1).
 *
 * `:id` is an opaque journey id (DEC-006 — never parsed). Data comes from
 * the shared hooks contract (src/hooks); this route file stays a thin
 * wrapper. Works WITHOUT sign-in.
 */
import { JourneyDetailsScreen } from '../../features/journey-details';

export default function JourneyDetailsRoute() {
  return <JourneyDetailsScreen testID="screen-journey-details" />;
}
