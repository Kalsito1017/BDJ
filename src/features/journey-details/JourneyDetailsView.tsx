/**
 * JourneyDetailsView — the journey details timeline (plan.md §3.3).
 *
 * Renders the full `legs` timeline (train segments + transfers) with a
 * back action, the journey's provenance badge and the always-visible demo
 * notice (rule 6). Presentational: the journey, the station-name resolver
 * and translations are injected (checklist §7: empty/loading/error states
 * are explicit; no provider failure crashes the app).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  DemoDataNotice,
  ListSkeleton,
  ProvenanceBadge,
  RequestErrorState,
  ScreenContainer,
} from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { Journey } from '../../types/journey';

import { JourneyLegRow } from './JourneyLegRow';
import {
  durationText,
  firstTrainLeg,
  journeyLegs,
  lastTrainLeg,
  transfersCount,
  transfersText,
} from '../journey-results/model/journeyDisplay';
import { JOURNEY_KEYS } from '../journey-results/translationKeys';
import { JOURNEY_DETAILS_KEYS } from './translationKeys';

export interface JourneyDetailsViewProps {
  t: TFunction;
  journey: Journey | null;
  loading: boolean;
  /** `ProviderError` (or anything else); null/undefined when healthy. */
  error: unknown;
  onRetry?: () => void;
  onBack: () => void;
  /** Resolves a station id to its display name (screen-level lookup). */
  stationName: (stationId: string) => string;
  testID?: string;
}

export function JourneyDetailsView({
  t,
  journey,
  loading,
  error,
  onRetry,
  onBack,
  stationName,
  testID,
}: JourneyDetailsViewProps) {
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
  } else if (!journey) {
    // No journey and no provider error (e.g. an unknown id): the closest
    // honest state is "not found" — never an invented placeholder journey.
    body = (
      <RequestErrorState
        error={{ code: 'not_found', message: 'journey not found' }}
        onRetry={onRetry}
        testID={testID ? `${testID}-empty` : undefined}
      />
    );
  } else {
    const departure = firstTrainLeg(journey);
    const arrival = lastTrainLeg(journey);
    body = (
      <View style={styles.timelineArea}>
        <ScrollView
          contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
          testID={testID ? `${testID}-timeline` : undefined}
        >
          <Text style={[type.body, { color: colors.textPrimary }]}>
            {`${stationName(departure?.fromStationId ?? '')} → ${stationName(
              arrival?.toStationId ?? '',
            )}`}
          </Text>
          <Text
            style={[type.bodySmall, { color: colors.textSecondary }]}
            testID={testID ? `${testID}-summary` : undefined}
          >
            {`${t(JOURNEY_KEYS.durationLabel)}: ${durationText(
              journey.durationMinutes,
              t,
            )} · ${transfersText(transfersCount(journey), t)}`}
          </Text>
          <ProvenanceBadge
            provenance={journey.provenance}
            testID={testID ? `${testID}-provenance` : undefined}
          />
          <Text
            accessibilityRole="header"
            style={[type.label, { color: colors.textSecondary }]}
          >
            {t(JOURNEY_DETAILS_KEYS.timelineLabel)}
          </Text>
          {journeyLegs(journey).map((leg, index) => (
            <JourneyLegRow
              key={`${leg.kind}-${leg.fromStationId}-${leg.toStationId}-${index}`}
              leg={leg}
              stationName={stationName}
              t={t}
              testID={testID ? `${testID}-leg-${index}` : undefined}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScreenContainer testID={testID} title={t(JOURNEY_DETAILS_KEYS.title)}>
      <Button
        label={t(JOURNEY_DETAILS_KEYS.back)}
        onPress={onBack}
        testID={testID ? `${testID}-back` : undefined}
        variant="secondary"
      />
      <DemoDataNotice testID={testID ? `${testID}-demo-notice` : undefined} />
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  timelineArea: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
