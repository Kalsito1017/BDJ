/**
 * StationPickerView — the station picker surface (Phase 3, plan.md §3.4).
 *
 * Presentational: data and translations are injected, so it is fully
 * testable without the hooks module or catalogs. Behaviour:
 * - free-text search (Cyrillic, Latin and mixed input — checklist §8),
 *   delegated to the station search hook (provider-side matching);
 * - an EMPTY query shows the full directory (task contract) plus the
 *   search hint;
 * - every row carries its demo provenance badge and the demo notice is
 *   always visible (rule 6);
 * - loading / empty / error states are explicit (checklist §7); NO location
 *   permission is requested anywhere on this screen (plan.md §8).
 *
 * The input is length-limited (DEC-019 W3-L5) until a real directory lands.
 */
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ListSkeleton,
  RequestErrorState,
  ScreenContainer,
  TextInput,
} from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { Station } from '../../types/station';

import { StationRow } from './StationRow';
import { STATION_PICKER_KEYS } from './translationKeys';

/** DEC-019 W3-L5: bound the query until a real directory lands. */
export const STATION_QUERY_MAX_LENGTH = 128;

export interface StationPickerViewProps {
  t: TFunction;
  query: string;
  onQueryChange: (query: string) => void;
  stations: readonly Station[];
  loading: boolean;
  /** `ProviderError` (or anything else); null/undefined when healthy. */
  error: unknown;
  onRetry?: () => void;
  onSelectStation: (station: Station) => void;
  onClose: () => void;
  testID?: string;
}

export function StationPickerView({
  t,
  query,
  onQueryChange,
  stations,
  loading,
  error,
  onRetry,
  onSelectStation,
  onClose,
  testID,
}: StationPickerViewProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  let body: React.ReactNode;
  if (loading) {
    body = <ListSkeleton rows={4} testID={testID ? `${testID}-loading` : undefined} />;
  } else if (error) {
    body = (
      <RequestErrorState
        error={error}
        onRetry={onRetry}
        testID={testID ? `${testID}-error` : undefined}
      />
    );
  } else if (stations.length === 0) {
    body = (
      <EmptyState
        message={
          query.trim().length > 0
            ? t(STATION_PICKER_KEYS.noResults, { query })
            : t(STATION_PICKER_KEYS.empty)
        }
        testID={testID ? `${testID}-empty` : undefined}
      />
    );
  } else {
    body = (
      <FlatList
        accessibilityLabel={t(STATION_PICKER_KEYS.listLabel)}
        contentContainerStyle={{ gap: spacing.sm }}
        data={[...stations]}
        keyExtractor={(station) => station.id}
        renderItem={({ item, index }) => (
          <StationRow
            onSelect={onSelectStation}
            station={item}
            t={t}
            testID={testID ? `${testID}-row-${index}` : undefined}
          />
        )}
        testID={testID ? `${testID}-list` : undefined}
      />
    );
  }

  return (
    <ScreenContainer
      footer={
        <Button
          label={t(STATION_PICKER_KEYS.close)}
          onPress={onClose}
          testID={testID ? `${testID}-close` : undefined}
          variant="secondary"
        />
      }
      testID={testID}
      title={t(STATION_PICKER_KEYS.screenTitle)}
    >
      <TextInput
        hint={t(STATION_PICKER_KEYS.searchInputHint)}
        label={t(STATION_PICKER_KEYS.searchLabel)}
        maxLength={STATION_QUERY_MAX_LENGTH}
        onChangeText={onQueryChange}
        placeholder={t(STATION_PICKER_KEYS.searchPlaceholder)}
        testID={testID ? `${testID}-search` : undefined}
        value={query}
      />
      <Text style={[type.caption, { color: colors.textSecondary }]}>
        {t(STATION_PICKER_KEYS.searchHint)}
      </Text>
      <Text
        accessibilityLabel={t(STATION_PICKER_KEYS.resultCount, {
          count: stations.length,
        })}
        style={[type.caption, { color: colors.textSecondary }]}
        testID={testID ? `${testID}-count` : undefined}
      >
        {t(STATION_PICKER_KEYS.resultCount, { count: stations.length })}
      </Text>
      <View
        style={[styles.notice, { borderColor: colors.demoBorder, padding: spacing.md }]}
      >
        <Text style={[type.bodySmall, { color: colors.demoText }]}>
          {t(STATION_PICKER_KEYS.demoNotice)}
        </Text>
      </View>
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 4,
  },
});
