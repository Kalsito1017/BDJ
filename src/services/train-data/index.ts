/**
 * Train-data service barrel (DEC-005). UI code imports provider SEAMS from
 * here — never fixtures or schemas directly (plan.md §6: provider-specific
 * mapping stays inside `services/train-data/`).
 *
 * There is intentionally NO `LiveTrainDataProvider` in this repository:
 * DEC-002 forbids creating one until a lawful data source is documented and
 * the decision is superseded. Swapping in an authorised provider later only
 * touches this folder.
 */

export type {
  TrainDataProvider,
  TrainDataProviderCapabilities,
  TrainDataProviderHealth,
  TrainDataProviderError,
} from './TrainDataProvider';
export {
  MOCK_DIRECTORY_TTL_MS,
  MOCK_SCENARIOS,
  MOCK_STATION_SEARCH_DEFAULT_LIMIT,
  MOCK_TIMEOUT_SCENARIO_LATENCY_MS,
  MockTrainDataProvider,
  type MockScenario,
  type MockTrainDataProviderConfig,
} from './MockTrainDataProvider';
export { validateJourneyInvariant } from './journeyInvariant';
