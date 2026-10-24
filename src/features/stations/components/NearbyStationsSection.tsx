/**
 * Nearby-stations flow UI (plan.md 17.5). Self-contained: it owns the
 * nearby reducer and calls `runNearbyStationsFlow` ONLY from a user tap on
 * the "nearby stations" button — never on mount, never on search input.
 *
 * Manual selection and the full list work with no location permission at
 * all; the permission-denied state says so explicitly. The privacy note
 * states the position is used once and never stored (model/nearby.ts keeps
 * only derived distances and no history).
 */

import { useReducer, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Station } from '../../../types';
import {
  INITIAL_NEARBY_STATE,
  nearbyReducer,
  runNearbyStationsFlow,
} from '../model/nearby';
import { STATIONS_KEYS } from '../translationKeys';
import type { LocationPort, Translate } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';

export interface NearbyStationsSectionProps {
  t: Translate;
  stations: readonly Station[];
  /** Injected implementation; the screen passes its port (tests pass mocks). */
  locationPort: LocationPort;
  limit?: number;
}

export function NearbyStationsSection({
  t,
  stations,
  locationPort,
  limit,
}: NearbyStationsSectionProps) {
  const [state, dispatch] = useReducer(nearbyReducer, INITIAL_NEARBY_STATE);
  const inFlight =
    state.status === 'requesting-permission' || state.status === 'locating';
  // Ref-based in-flight guard: a second tap can never reach the LocationPort,
  // even before React has re-rendered with the disabled button.
  const inFlightRef = useRef(false);

  const onRequestNearby = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    void runNearbyStationsFlow({ port: locationPort, stations, dispatch, limit }).finally(
      () => {
        inFlightRef.current = false;
      },
    );
  };

  return (
    <View style={styles.container} testID="stations-nearby-panel">
      <Text style={styles.title} accessibilityRole="header">
        {t(STATIONS_KEYS.nearbyTitle)}
      </Text>
      <Text style={styles.intro}>{t(STATIONS_KEYS.nearbyIntro)}</Text>

      <Pressable
        testID="stations-nearby-button"
        accessibilityRole="button"
        accessibilityLabel={t(STATIONS_KEYS.nearbyButton)}
        accessibilityState={{ disabled: inFlight }}
        disabled={inFlight}
        onPress={onRequestNearby}
        style={[styles.button, inFlight && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{t(STATIONS_KEYS.nearbyButton)}</Text>
      </Pressable>

      {state.status === 'requesting-permission' ? (
        <Text testID="stations-nearby-requesting">
          {t(STATIONS_KEYS.nearbyRequesting)}
        </Text>
      ) : null}
      {state.status === 'locating' ? (
        <Text testID="stations-nearby-locating">{t(STATIONS_KEYS.nearbyLocating)}</Text>
      ) : null}

      {state.status === 'denied' ? (
        <View testID="stations-nearby-denied">
          <Text style={styles.stateTitle}>{t(STATIONS_KEYS.nearbyDeniedTitle)}</Text>
          <Text>{t(STATIONS_KEYS.nearbyDeniedBody)}</Text>
          <Text style={styles.note}>{t(STATIONS_KEYS.nearbyManualNote)}</Text>
        </View>
      ) : null}

      {state.status === 'unavailable' ? (
        <View testID="stations-nearby-unavailable">
          <Text>{t(STATIONS_KEYS.nearbyUnavailable)}</Text>
          <Text style={styles.note}>{t(STATIONS_KEYS.nearbyManualNote)}</Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <Text testID="stations-nearby-error">{t(STATIONS_KEYS.nearbyError)}</Text>
      ) : null}

      {state.status === 'empty' ? (
        <Text testID="stations-nearby-empty">{t(STATIONS_KEYS.nearbyEmpty)}</Text>
      ) : null}

      {state.status === 'ready' ? (
        <View testID="stations-nearby-results">
          {state.stations.map((entry) => (
            <View
              key={entry.station.id}
              testID={`stations-nearby-row-${entry.station.id}`}
            >
              <Text style={styles.rowName}>{entry.station.name}</Text>
              <Text style={styles.rowDistance}>
                {t(STATIONS_KEYS.nearbyDistanceMeters, {
                  meters: Math.round(entry.distanceMeters),
                })}
              </Text>
              <ProvenanceBadge t={t} provenance={entry.station.provenance} />
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.note}>{t(STATIONS_KEYS.nearbyPrivacyNote)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    margin: 12,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  intro: {
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#1d4ed8',
    borderRadius: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  stateTitle: {
    fontWeight: '600',
    marginTop: 10,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  rowDistance: {
    color: '#4b5563',
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 10,
  },
});
