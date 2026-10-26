/**
 * Saved-items surface (Phase 5): favourites + recent searches UI and the
 * "Save this route" control (plan.md §3.5 / §9 Phase 5).
 *
 * Route shortcuts for planning journeys — never tickets (rule 3 adjacency;
 * see translationKeys.ts and `favourites.notice`).
 *
 * Data access goes through the shared hooks contract ONLY
 * (src/hooks — data-provider workstream): `useFavouriteRoutes`,
 * `useRecentSearches`, `useStoreNotices`, `useNetworkStatus`,
 * `useStationSearch`, `useJourneySearch().isStale`.
 */
export { FavouritesSection, type FavouritesSectionProps } from './FavouritesSection';
export {
  RecentSearchesSection,
  type RecentSearchesSectionProps,
} from './RecentSearchesSection';
export { SaveRouteControl, type SaveRouteControlProps } from './SaveRouteControl';
export { StoreNoticesBanner, type StoreNoticesBannerProps } from './StoreNoticesBanner';
export {
  FAVOURITES_KEYS,
  NOTICE_KEYS,
  NOTICE_REASON_KEYS,
  RECENTS_KEYS,
} from './translationKeys';
