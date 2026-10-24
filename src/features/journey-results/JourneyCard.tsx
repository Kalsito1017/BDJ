/**
 * JourneyCard — one journey option in the results list (plan.md §3.2).
 *
 * Shows departure/arrival wall-clock times (Europe/Sofia, DEC-006) with
 * explicit "+N day(s)" markers for midnight crossings, duration, transfers
 * and the journey's PROVENANCE BADGE (rule 6) — plus the screen-level demo
 * notice in `JourneyResultsView`. Missing times are labelled `common.unknown`
 * (never invented); cache freshness ("results loaded at …") is rendered by
 * the view and is deliberately NOT presented as data provenance.
 *
 * Accessibility: the card content stays individually readable for screen
 * readers (no single accessible wrapper) and the details action is a real
 * button whose accessible name repeats the route (checklist §10).
 */
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ProvenanceBadge } from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { Journey } from '../../types/journey';

import {
  dayOffsetText,
  durationText,
  firstTrainLeg,
  lastTrainLeg,
  routeA11yText,
  timeText,
  transfersCount,
  transfersText,
} from './model/journeyDisplay';
import { JOURNEY_KEYS, JOURNEY_RESULTS_KEYS } from './translationKeys';

export interface JourneyCardProps {
  t: TFunction;
  journey: Journey;
  /** Display names of the search endpoints (resolved by the screen). */
  fromName: string;
  toName: string;
  /** 1-based position in the result list (accessible name). */
  index: number;
  onSelect?: (journey: Journey) => void;
  testID?: string;
}

function TimeBlock({
  testID,
  label,
  time,
  offset,
  color,
  headingColor,
  labelStyle,
  headingStyle,
}: {
  testID?: string;
  label: string;
  time: string;
  offset: string | null;
  color: string;
  headingColor: string;
  labelStyle: object;
  headingStyle: object;
}) {
  return (
    <View style={styles.timeBlock}>
      <Text style={[labelStyle, { color }]}>{label}</Text>
      <Text style={[headingStyle, { color: headingColor }]} testID={testID}>
        {time}
        {offset ? <Text style={[labelStyle, { color }]}>{` ${offset}`}</Text> : null}
      </Text>
    </View>
  );
}

export function JourneyCard({
  t,
  journey,
  fromName,
  toName,
  index,
  onSelect,
  testID,
}: JourneyCardProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  const departure = firstTrainLeg(journey);
  const arrival = lastTrainLeg(journey);

  return (
    <Card
      accessibilityLabel={t(JOURNEY_KEYS.cardA11y, { index })}
      style={{ gap: spacing.sm }}
      testID={testID}
    >
      <View>
        <Text style={[type.body, { color: colors.textPrimary }]}>{fromName}</Text>
        <Text style={[type.bodySmall, { color: colors.textSecondary }]}>{'→'}</Text>
        <Text style={[type.body, { color: colors.textPrimary }]}>{toName}</Text>
      </View>

      <View style={[styles.times, { gap: spacing.lg }]}>
        <TimeBlock
          color={colors.textSecondary}
          headingColor={colors.textPrimary}
          headingStyle={type.heading}
          label={t(JOURNEY_KEYS.departureLabel)}
          labelStyle={type.caption}
          offset={dayOffsetText(departure?.departureDayOffset, t)}
          testID={testID ? `${testID}-departure` : undefined}
          time={timeText(departure?.departureTime, t)}
        />
        <TimeBlock
          color={colors.textSecondary}
          headingColor={colors.textPrimary}
          headingStyle={type.heading}
          label={t(JOURNEY_KEYS.arrivalLabel)}
          labelStyle={type.caption}
          offset={dayOffsetText(arrival?.arrivalDayOffset, t)}
          testID={testID ? `${testID}-arrival` : undefined}
          time={timeText(arrival?.arrivalTime, t)}
        />
      </View>

      <Text
        style={[type.bodySmall, { color: colors.textSecondary }]}
        testID={testID ? `${testID}-duration` : undefined}
      >
        {`${t(JOURNEY_KEYS.durationLabel)}: ${durationText(journey.durationMinutes, t)}`}
      </Text>
      <Text
        style={[type.bodySmall, { color: colors.textSecondary }]}
        testID={testID ? `${testID}-transfers` : undefined}
      >
        {transfersText(transfersCount(journey), t)}
      </Text>

      <ProvenanceBadge
        provenance={journey.provenance}
        testID={testID ? `${testID}-provenance` : undefined}
      />

      {onSelect ? (
        <Button
          accessibilityLabel={`${t(JOURNEY_RESULTS_KEYS.detailsCta)}: ${routeA11yText(
            fromName,
            toName,
            t,
          )}`}
          label={t(JOURNEY_RESULTS_KEYS.detailsCta)}
          onPress={() => onSelect(journey)}
          testID={testID ? `${testID}-details` : undefined}
          variant="secondary"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  times: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeBlock: {
    gap: 2,
  },
});
