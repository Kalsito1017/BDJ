/**
 * Scaffold landing screen (Phase 1 placeholder, kept for continuity).
 *
 * Finding M2 (DEC-014): the two hard-coded English strings now come from
 * i18n keys — `common.app_name` and `scaffold.placeholder_body`. The
 * screen deliberately shows NO train data: no timetable, no journeys, no
 * positions. Any provider data must carry a visible provenance label
 * (DEC-006, DEC-002).
 *
 * The buttons below are development navigation into the tab shell
 * (routes: /search /map /trips /settings). This screen may be replaced by a
 * redirect to /(tabs)/search once the scaffold smoke test is updated.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, PlaceholderScreen } from '../components';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

export default function PlaceholderHomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <PlaceholderScreen
      body={t('scaffold.placeholder_body')}
      testID="placeholder-screen"
      title={t('common.app_name')}
    >
      <View style={[styles.links, { gap: theme.spacing.md }]}>
        <Button label={t('nav.search')} onPress={() => router.push('/search')} />
        <Button label={t('nav.map')} onPress={() => router.push('/map')} />
        <Button label={t('nav.my_trips')} onPress={() => router.push('/trips')} />
        <Button label={t('nav.settings')} onPress={() => router.push('/settings')} />
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  links: {
    alignSelf: 'stretch',
  },
});
