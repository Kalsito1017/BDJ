/**
 * Stations feature — composed presentational view (list + map toggle).
 *
 * Receives everything through props (including `t`) so it is testable and
 * independent of the shared i18n module; `StationsScreen` wires the state,
 * the demo dataset and the translation bridge.
 *
 * Layout note: no nested scroll views. The content area shows exactly one
 * of: loading / detail card / map placeholder / empty state / station list.
 * The nearby panel sits below (checklist 9: everything reachable without
 * location permission).
 */

import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Station } from '../../types';
import { MapPlaceholder } from './components/MapPlaceholder';
import { NearbyStationsSection } from './components/NearbyStationsSection';
import { DemoNotice } from './components/ProvenanceBadge';
import { StationDetailCard } from './components/StationDetailCard';
import { StationList } from './components/StationList';
import { STATIONS_KEYS } from './translationKeys';
import type {
  DirectoryStatus,
  LocationPort,
  NetworkStatus,
  StationsViewMode,
  Translate,
} from './types';

export interface StationsViewProps {
  t: Translate;
  /** Already filtered (the container runs searchStations). */
  stations: readonly Station[];
  query: string;
  onQueryChange: (query: string) => void;
  viewMode: StationsViewMode;
  onViewModeChange: (mode: StationsViewMode) => void;
  status: DirectoryStatus;
  networkStatus: NetworkStatus;
  /** Detail-card selection; null shows the list. */
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onCloseDetail: () => void;
  locationPort: LocationPort;
}

export function StationsView({
  t,
  stations,
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
  status,
  networkStatus,
  selectedStation,
  onSelectStation,
  onCloseDetail,
  locationPort,
}: StationsViewProps) {
  return (
    <View style={styles.container} testID="stations-screen">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t(STATIONS_KEYS.screenTitle)}
        </Text>
        <DemoNotice t={t} />

        {networkStatus === 'offline' ? (
          <Text style={styles.offlineBanner} testID="stations-offline-banner">
            {t(STATIONS_KEYS.offlineBanner)}
          </Text>
        ) : null}

        <TextInput
          testID="stations-search-input"
          style={styles.searchInput}
          accessibilityLabel={t(STATIONS_KEYS.searchLabel)}
          placeholder={t(STATIONS_KEYS.searchPlaceholder)}
          value={query}
          onChangeText={onQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.resultCount} testID="stations-result-count">
          {t(STATIONS_KEYS.resultCount, { count: stations.length })}
        </Text>

        <View style={styles.toggleRow}>
          <Pressable
            testID="stations-toggle-list"
            accessibilityRole="button"
            accessibilityLabel={t(STATIONS_KEYS.viewToggleLabel)}
            accessibilityState={{ selected: viewMode === 'list' }}
            onPress={() => onViewModeChange('list')}
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive,
            ]}
          >
            <Text
              style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}
            >
              {t(STATIONS_KEYS.viewList)}
            </Text>
          </Pressable>
          <Pressable
            testID="stations-toggle-map"
            accessibilityRole="button"
            accessibilityLabel={t(STATIONS_KEYS.viewToggleLabel)}
            accessibilityState={{ selected: viewMode === 'map' }}
            onPress={() => onViewModeChange('map')}
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
          >
            <Text
              style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}
            >
              {t(STATIONS_KEYS.viewMap)}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {status === 'loading' ? (
          <Text style={styles.stateText} testID="stations-list-loading">
            {t(STATIONS_KEYS.listLoading)}
          </Text>
        ) : selectedStation ? (
          <StationDetailCard t={t} station={selectedStation} onClose={onCloseDetail} />
        ) : viewMode === 'map' ? (
          <MapPlaceholder t={t} />
        ) : stations.length === 0 ? (
          <View style={styles.stateBox} testID="stations-list-empty">
            <Text style={styles.stateText}>{t(STATIONS_KEYS.listEmptyTitle)}</Text>
            <Text style={styles.stateText}>{t(STATIONS_KEYS.listEmptyBody)}</Text>
          </View>
        ) : (
          <StationList
            t={t}
            stations={stations}
            onSelectStation={onSelectStation}
            selectedStationId={null}
          />
        )}
      </View>

      <NearbyStationsSection t={t} stations={stations} locationPort={locationPort} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  offlineBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    marginBottom: 8,
    padding: 8,
  },
  searchInput: {
    borderColor: '#9ca3af',
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 16,
    padding: 10,
  },
  resultCount: {
    color: '#4b5563',
    fontSize: 13,
    marginTop: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  toggleButton: {
    borderColor: '#1d4ed8',
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  toggleText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  stateBox: {
    padding: 16,
  },
  stateText: {
    fontSize: 15,
    padding: 16,
  },
});
