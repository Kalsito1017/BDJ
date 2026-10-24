/**
 * Station detail card — "verified data only" (plan.md 17.5).
 *
 * Every field is rendered only if the dataset actually provides it; missing
 * data shows t('stations.detail.unknown'), never an invented or implied
 * value. A station without coordinates shows "unknown" for its location.
 * The card always carries the provenance label (rule 6).
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Station } from '../../../types';
import { STATIONS_KEYS } from '../translationKeys';
import type { Translate } from '../types';
import { DemoNotice, ProvenanceBadge } from './ProvenanceBadge';

export interface StationDetailCardProps {
  t: Translate;
  station: Station;
  onClose?: () => void;
}

function formatLocation(station: Station): string | null {
  if (!station.location) return null;
  const lat = station.location.latitude.toFixed(4);
  const lon = station.location.longitude.toFixed(4);
  return `${lat}, ${lon}`;
}

function FieldRow({
  t,
  label,
  value,
}: {
  t: Translate;
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} testID="stations-detail-value">
        {value ?? t(STATIONS_KEYS.detailUnknown)}
      </Text>
    </View>
  );
}

export function StationDetailCard({ t, station, onClose }: StationDetailCardProps) {
  const aliases =
    station.aliases && station.aliases.length > 0 ? station.aliases.join(', ') : null;

  return (
    <View
      style={styles.card}
      testID="stations-detail-card"
      accessibilityLabel={t(STATIONS_KEYS.detailCardLabel)}
    >
      <Text style={styles.title} accessibilityRole="header">
        {station.name}
      </Text>
      <ProvenanceBadge t={t} provenance={station.provenance} />
      <DemoNotice t={t} />

      <FieldRow t={t} label={t(STATIONS_KEYS.detailName)} value={station.name} />
      <FieldRow
        t={t}
        label={t(STATIONS_KEYS.detailAlternateName)}
        value={station.alternateName ?? null}
      />
      <FieldRow t={t} label={t(STATIONS_KEYS.detailAliases)} value={aliases} />
      <FieldRow t={t} label={t(STATIONS_KEYS.detailKind)} value={station.kind ?? null} />
      <FieldRow
        t={t}
        label={t(STATIONS_KEYS.detailCountry)}
        value={station.countryCode}
      />
      <FieldRow
        t={t}
        label={t(STATIONS_KEYS.detailLocation)}
        value={formatLocation(station)}
      />

      {onClose ? (
        <Pressable
          testID="stations-detail-close"
          accessibilityRole="button"
          accessibilityLabel={t(STATIONS_KEYS.detailClose)}
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>{t(STATIONS_KEYS.detailClose)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    margin: 12,
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fieldLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  fieldValue: {
    flexShrink: 1,
    fontSize: 14,
    marginLeft: 12,
    textAlign: 'right',
  },
  closeButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  closeButtonText: {
    color: '#1d4ed8',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
