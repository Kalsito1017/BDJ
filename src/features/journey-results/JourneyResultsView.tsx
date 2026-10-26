/**
 * JourneyResultsView — results list + every screen state (plan.md §3.2,
 * checklist §7).
 *
 * States: loading (skeleton), error/timeout/offline with retry (mapped from
 * `ProviderErrorCode` by `RequestErrorState`), empty ("no journeys for this
 * date/search" + suggest changing the date), and the list itself with
 * pull-to-refresh. Cached-vs-fresh honesty (task contract): the optional
 * "results loaded at HH:mm" line reports when the query data was fetched —
 * it is cache freshness, never labelled as data provenance. Rule 6: a demo
 * notice is always visible and every card carries its provenance badge.
 *
 * Presentational: data, callbacks and translations are injected.
 */
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  DemoDataNotice,
  ListSkeleton,
  RequestErrorState,
  ScreenContainer,
  StatusMessage,
} from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { Journey } from '../../types/journey';

import { JourneyCard } from './JourneyCard';
import { routeA11yText } from './model/journeyDisplay';
import { JOURNEY_RESULTS_KEYS } from './translationKeys';

export interface JourneyResultsViewProps {
  t: TFunction;
  /** Display names for the search endpoints (resolved by the screen). */
  fromName: string;
  toName: string;
  /** Already-formatted travel date (Europe/Sofia). */
  dateLabel: string;
  journeys: readonly Journey[];
  loading: boolean;
  /** `ProviderError` (or anything else); null/undefined when healthy. */
  error: unknown;
  /** Pull-to-refresh spinner state (query refetch in flight). */
  refreshing?: boolean;
  /** `HH:mm` of the last successful fetch, when known (cache freshness). */
  fetchedAtTime?: string | null;
  /** Query staleness flag (`useJourneySearch().isStale`): renders the
   *  "may be out of date" hint — never provenance (rule 6, DEC-021). */
  stale?: boolean;
  /** Extra header-area content rendered in every state (e.g. the offline
   *  banner and the SaveRouteControl slot). */
  headerExtras?: React.ReactNode;
  onRetry?: () => void;
  onRefresh?: () => void;
  onChangeSearch?: () => void;
  onSelectJourney?: (journey: Journey) => void;
  testID?: string;
}

export function JourneyResultsView({
  t,
  fromName,
  toName,
  dateLabel,
  journeys,
  loading,
  error,
  refreshing = false,
  fetchedAtTime,
  stale = false,
  headerExtras,
  onRetry,
  onRefresh,
  onChangeSearch,
  onSelectJourney,
  testID,
}: JourneyResultsViewProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  let body: React.ReactNode;
  if (loading) {
    body = <ListSkeleton rows={3} testID={testID ? `${testID}-loading` : undefined} />;
  } else if (error) {
    body = (
      <RequestErrorState
        error={error}
        onRetry={onRetry}
        testID={testID ? `${testID}-error` : undefined}
      />
    );
  } else if (journeys.length === 0) {
    body = (
      <StatusMessage
        actionLabel={onChangeSearch ? t(JOURNEY_RESULTS_KEYS.changeSearch) : undefined}
        message={t(JOURNEY_RESULTS_KEYS.emptyBody)}
        onAction={onChangeSearch}
        testID={testID ? `${testID}-empty` : undefined}
        title={t(JOURNEY_RESULTS_KEYS.emptyTitle)}
      />
    );
  } else {
    body = (
      <View style={styles.listArea}>
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                onRefresh={onRefresh}
                refreshing={refreshing}
                testID={testID ? `${testID}-refresh` : undefined}
              />
            ) : undefined
          }
          testID={testID ? `${testID}-list` : undefined}
        >
          {journeys.map((journey, index) => (
            <JourneyCard
              fromName={fromName}
              index={index + 1}
              journey={journey}
              key={journey.id}
              onSelect={onSelectJourney}
              t={t}
              testID={testID ? `${testID}-card-${index}` : undefined}
              toName={toName}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScreenContainer testID={testID} title={t(JOURNEY_RESULTS_KEYS.title)}>
      <View accessibilityLabel={routeA11yText(fromName, toName, t)} accessible>
        <Text style={[type.body, { color: colors.textPrimary }]}>
          {`${fromName} → ${toName}`}
        </Text>
        <Text style={[type.bodySmall, { color: colors.textSecondary }]}>{dateLabel}</Text>
      </View>
      {fetchedAtTime ? (
        <Text
          style={[type.caption, { color: colors.textSecondary }]}
          testID={testID ? `${testID}-fetched-at` : undefined}
        >
          {t(JOURNEY_RESULTS_KEYS.fetchedAt, { time: fetchedAtTime })}
        </Text>
      ) : null}
      {stale ? (
        <Text
          style={[type.caption, { color: colors.textSecondary }]}
          testID={testID ? `${testID}-stale-hint` : undefined}
        >
          {t(JOURNEY_RESULTS_KEYS.staleHint)}
        </Text>
      ) : null}
      {headerExtras}
      <DemoDataNotice testID={testID ? `${testID}-demo-notice` : undefined} />
      {onChangeSearch && !loading && !error && journeys.length > 0 ? (
        <Button
          label={t(JOURNEY_RESULTS_KEYS.changeSearch)}
          onPress={onChangeSearch}
          testID={testID ? `${testID}-change-search` : undefined}
          variant="ghost"
        />
      ) : null}
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listArea: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
