/**
 * TrainDataProvider — the single seam between the UI and any train data
 * source (plan.md section 4.3, section 6 architecture rules).
 *
 * CONTRACT (DEC-007):
 *  - Screens/hooks call THIS interface only. Provider-specific mapping,
 *    field names, endpoints and quirks live inside `services/train-data/`
 *    implementations — never in features/ or components/.
 *  - Every external payload is runtime-validated (Zod) at the
 *    implementation boundary before mapping to these types; a failed
 *    validation rejects with `ProviderError { code: 'invalid_response' }`.
 *  - Methods reject with `ProviderError` (src/types/errors.ts) and honour
 *    timeout + cancellation + bounded-retry semantics from
 *    `services/common/RequestOptions.ts`.
 *  - All returned travel information MUST carry `InformationProvenance`.
 *    Only an authorised, verified live source may produce `real-time`
 *    (rule 6; DEC-002). The mock produces `demo` only.
 *  - Missing data is returned as `null`/absent fields and shown as
 *    "unknown" — implementations never invent times, statuses or names
 *    (plan.md section 4).
 *
 * Implementations (built in later phases, per docs/decisions.md Appendix A):
 *  - MockTrainDataProvider (Phase 4) — demo data, clearly labelled.
 *  - LiveTrainDataProvider — ONLY after DEC-002 is superseded with a
 *    documented, lawful data source. Do not create it before then.
 *
 * Spec-only file: types + constants, no logic, no dependency imports.
 */

import type { RequestOptions } from '../common/RequestOptions';
import type { ProviderError } from '../../types/errors';
import type { Journey, JourneySearch, JourneySearchResult } from '../../types/journey';
import type { ProvenanceKind } from '../../types/provenance';
import type { Station, StationDirectory, StationQuery } from '../../types/station';

/** What an implementation can honestly provide. The UI uses this to hide or
 *  disable features instead of showing broken ones — e.g. real-time badges are
 *  rendered only when `provenanceKinds` includes 'real-time'. */
export interface TrainDataProviderCapabilities {
  /** Provenance kinds this provider may attach to returned data. */
  readonly provenanceKinds: readonly ProvenanceKind[];
  readonly supportsStationAliases: boolean;
  readonly supportsJourneyDetails: boolean;
  readonly supportsStationCoordinates: boolean;
  /** True only when the source's terms explicitly permit offline caching. */
  readonly licensedForOfflineCaching: boolean;
  /** Attribution text required by the source's terms; MUST be rendered in the UI. */
  readonly attribution?: string;
}

export interface TrainDataProvider {
  /** Stable machine id, e.g. 'mock', 'bdz-official' (only once authorised). */
  readonly id: string;
  /** Display name for the "data source" disclosure in Settings/Details. */
  readonly displayName: string;
  readonly capabilities: TrainDataProviderCapabilities;

  /**
   * Search journeys between two stations on a travel date.
   * Resolves with a `JourneySearchResult` whose `journeys` array is empty
   * (never throws) when the source has no journeys; rejects only on
   * transport/validation failures. (plan.md §4's `Promise<Journey[]>` sketch
   * is extended by the envelope — DEC-006/DEC-007.)
   */
  searchJourneys(input: JourneySearch, options?: RequestOptions): Promise<JourneySearchResult>;

  /**
   * Fetch a single journey by id (details view). Optional: when a provider
   * cannot resolve ids, the UI passes the full `Journey` from the search
   * result instead. Rejects `not_found` when the id is unknown.
   */
  getJourney?(journeyId: string, options?: RequestOptions): Promise<Journey>;

  /** Station directory search (station picker, map list). */
  searchStations(query: StationQuery, options?: RequestOptions): Promise<readonly Station[]>;

  /** Full station directory for offline caching; only when
   *  `capabilities.licensedForOfflineCaching` is true. */
  getStationDirectory?(options?: RequestOptions): Promise<StationDirectory>;

  getStation(stationId: string, options?: RequestOptions): Promise<Station>;

  /**
   * Optional cheap liveness/freshness probe for the "data source" line in
   * Settings. Must not fabricate health: it reports what it can verify.
   */
  healthCheck?(options?: RequestOptions): Promise<TrainDataProviderHealth>;
}

export interface TrainDataProviderHealth {
  reachable: boolean;
  /** Last successful data update known to the source, when supplied. */
  sourceUpdatedAt?: string;
  checkedAt: string;
}

/**
 * Error semantics recap for implementers:
 * - unknown station ids in a search input -> `not_found`
 * - provider 429 -> `rate_limited` (retryable)
 * - provider 5xx -> `upstream_error` (retryable)
 * - schema violation -> `invalid_response` (not retryable; log + surface)
 * - AbortSignal aborted -> `cancelled`
 * - timeout budget exceeded -> `timeout` (retryable for reads)
 */
export type TrainDataProviderError = ProviderError;
