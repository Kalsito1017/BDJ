/**
 * ScreenStatesPreview — demonstrates the reusable UI states on a screen
 * (Phase 2 acceptance: loading, empty, error, timeout, offline + retry are
 * built and visible; plan.md §8 "Provide visible loading, error, retry,
 * no-results, and offline states").
 *
 * Placeholder screens show this section until real content replaces it in
 * Phases 3-5. The retry buttons are wired to a documented no-op so the
 * interaction is visible without pretending any data source exists.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ListSkeleton } from './ListSkeleton';
import { Loader } from './Loader';
import { OfflineState } from './OfflineState';
import { TimeoutState } from './TimeoutState';

export interface ScreenStatesPreviewProps {
  /** Retry handler for the state demos; defaults to a no-op. */
  onRetry?: () => void;
  testID?: string;
}

export function ScreenStatesPreview({ onRetry, testID }: ScreenStatesPreviewProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;
  const { t } = useTranslation();

  // Demo-only handler: there is nothing to reload yet (no data source).
  const retry = onRetry ?? (() => {});

  return (
    <View style={[styles.wrapper, { gap: spacing.md }]} testID={testID}>
      <Text
        accessibilityRole="header"
        style={[type.heading, { color: colors.textPrimary }]}
      >
        {t('scaffold.states_preview')}
      </Text>
      <Card>
        <Loader />
      </Card>
      <Card>
        <ListSkeleton rows={2} />
      </Card>
      <Card>
        <EmptyState />
      </Card>
      <Card>
        <ErrorState code="network" onRetry={retry} />
      </Card>
      <Card>
        <TimeoutState onRetry={retry} />
      </Card>
      <Card>
        <OfflineState onRetry={retry} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
});
