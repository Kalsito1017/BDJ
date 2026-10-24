/**
 * JourneyLegRow — one timeline entry of the journey details
 * (plan.md §3.3: segments and transfer information).
 *
 * Train legs show times with explicit "+N day(s)" markers where
 * `departureDayOffset`/`arrivalDayOffset` are set (midnight crossings,
 * checklist §2); transfer legs show the planned connection time and whether
 * a change of station on foot is required. Null/missing times render the
 * localized `common.unknown` — never an estimate (DEC-006). A verbatim
 * `providerStatus` note is shown attributed to the data source (it is the
 * provider's own text, not an app claim — plan.md §3.2).
 */
import { StyleSheet, Text, View } from 'react-native';

import { Card, ProvenanceBadge } from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { JourneyLeg } from '../../types/journey';

import { dayOffsetText, timeText } from '../journey-results/model/journeyDisplay';
import { JOURNEY_KEYS } from '../journey-results/translationKeys';
import { JOURNEY_DETAILS_KEYS } from './translationKeys';

export interface JourneyLegRowProps {
  t: TFunction;
  leg: JourneyLeg;
  /** Resolves a station id to its display name (screen-level lookup). */
  stationName: (stationId: string) => string;
  testID?: string;
}

export function JourneyLegRow({ t, leg, stationName, testID }: JourneyLegRowProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  const fromName = stationName(leg.fromStationId);
  const toName = stationName(leg.toStationId);
  const provenance = leg.provenance ?? null;
  const departureOffset =
    leg.kind === 'train' ? dayOffsetText(leg.departureDayOffset, t) : null;
  const arrivalOffset =
    leg.kind === 'train' ? dayOffsetText(leg.arrivalDayOffset, t) : null;

  return (
    <Card style={{ gap: spacing.xs }} testID={testID}>
      <Text style={[type.caption, { color: colors.textSecondary }]}>
        {leg.kind === 'train'
          ? t(JOURNEY_DETAILS_KEYS.legTrain)
          : t(JOURNEY_DETAILS_KEYS.legTransfer)}
      </Text>
      <Text style={[type.body, { color: colors.textPrimary }]}>
        {`${fromName} → ${toName}`}
      </Text>

      {leg.kind === 'train' ? (
        <>
          {leg.trainNumber ? (
            <Text
              style={[type.bodySmall, { color: colors.textSecondary }]}
              testID={testID ? `${testID}-train-number` : undefined}
            >
              {t(JOURNEY_DETAILS_KEYS.trainNumber, { number: leg.trainNumber })}
            </Text>
          ) : null}
          <View style={[styles.times, { gap: spacing.lg }]}>
            <View>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {t(JOURNEY_KEYS.departureLabel)}
              </Text>
              <Text
                style={[type.body, { color: colors.textPrimary }]}
                testID={testID ? `${testID}-departure` : undefined}
              >
                {timeText(leg.departureTime, t)}
                {departureOffset ? (
                  <Text style={[type.caption, { color: colors.textSecondary }]}>
                    {` ${departureOffset}`}
                  </Text>
                ) : null}
              </Text>
            </View>
            <View>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {t(JOURNEY_KEYS.arrivalLabel)}
              </Text>
              <Text
                style={[type.body, { color: colors.textPrimary }]}
                testID={testID ? `${testID}-arrival` : undefined}
              >
                {timeText(leg.arrivalTime, t)}
                {arrivalOffset ? (
                  <Text style={[type.caption, { color: colors.textSecondary }]}>
                    {` ${arrivalOffset}`}
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>
          {leg.providerStatus ? (
            <Text
              style={[type.bodySmall, { color: colors.textSecondary }]}
              testID={testID ? `${testID}-provider-note` : undefined}
            >
              {`${t(JOURNEY_DETAILS_KEYS.providerNote)}: ${leg.providerStatus}`}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text
            style={[type.bodySmall, { color: colors.textSecondary }]}
            testID={testID ? `${testID}-wait` : undefined}
          >
            {t(JOURNEY_DETAILS_KEYS.transferWait, {
              minutes:
                typeof leg.plannedMinutes === 'number' && leg.plannedMinutes >= 0
                  ? Math.trunc(leg.plannedMinutes)
                  : t(JOURNEY_KEYS.unknown),
            })}
          </Text>
          {leg.stationChangeRequired ? (
            <Text
              style={[type.bodySmall, { color: colors.textSecondary }]}
              testID={testID ? `${testID}-station-change` : undefined}
            >
              {t(JOURNEY_DETAILS_KEYS.stationChange)}
            </Text>
          ) : null}
        </>
      )}

      {provenance ? (
        <ProvenanceBadge
          provenance={provenance}
          testID={testID ? `${testID}-provenance` : undefined}
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
});
