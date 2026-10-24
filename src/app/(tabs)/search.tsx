/**
 * Search tab — the journey search form (`/search`, DEC-005 route contract).
 *
 * Phase 3 replaces the Phase 2 placeholder with the real form
 * (plan.md §3.1). Journey search works WITHOUT any account (plan.md 17.2).
 */
import { JourneySearchScreen } from '../../features/journey-search';

export default function SearchScreen() {
  return <JourneySearchScreen testID="screen-search" />;
}
