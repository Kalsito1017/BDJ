/**
 * Accessible station list — the primary, always-available station discovery
 * surface (checklist 9: the list is the accessible alternative to the map
 * and must work without location permission). Rows show provenance labels.
 */

import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Station } from '../../../types';
import { STATIONS_KEYS } from '../translationKeys';
import type { Translate } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';

export interface StationListProps {
  t: Translate;
  stations: readonly Station[];
  onSelectStation: (station: Station) => void;
  selectedStationId?: string | null;
}

export function StationList({
  t,
  stations,
  onSelectStation,
  selectedStationId,
}: StationListProps) {
  return (
    <FlatList
      testID="stations-list"
      data={stations}
      keyExtractor={(item) => item.id}
      // Small bundled directory: render up to 50 rows eagerly (avoids
      // virtualization surprises on long-name layout checks and tests).
      initialNumToRender={50}
      accessibilityLabel={t(STATIONS_KEYS.listLabel)}
      renderItem={({ item }) => {
        const isSelected = item.id === selectedStationId;
        return (
          <Pressable
            testID={`stations-list-row-${item.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={item.name}
            onPress={() => onSelectStation(item)}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              {item.alternateName ? (
                <Text style={styles.alternate}>{item.alternateName}</Text>
              ) : null}
              <ProvenanceBadge t={t} provenance={item.provenance} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowSelected: {
    backgroundColor: '#eff6ff',
  },
  rowText: {
    flexDirection: 'column',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  alternate: {
    color: '#4b5563',
    fontSize: 13,
    marginTop: 2,
  },
});
