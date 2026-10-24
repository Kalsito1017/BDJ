/* eslint-disable import/namespace, import/no-unresolved, import/no-duplicates --
 * The repository's ESLint import resolver cannot read package `exports`
 * subpaths: it throws "Resolve error: typescript with invalid interface
 * loaded as resolver" for `expo-router/js-tabs`. `npm run typecheck` resolves
 * this import correctly (the subpath is part of expo-router's exports map).
 * Fixing the resolver configuration is a follow-up for the lint-tooling
 * owner; this file-level disable must not be used to hide real resolution
 * failures elsewhere. */

/**
 * Tab shell — the whole app-level navigation (plan.md 17.7 "Core navigation
 * should stay simple"; checklist §10 "Navigation limited to Search, Map, My
 * trips/Tickets, Settings").
 *
 * Route names (deep-link contract — DEC-005):
 *   (tabs)/search    -> /search
 *   (tabs)/map       -> /map
 *   (tabs)/trips     -> /trips   (My trips / Tickets)
 *   (tabs)/settings  -> /settings
 *
 * Search, Map and My trips/Tickets are reachable WITHOUT any account
 * (plan.md 17.2/17.7): nothing in this shell gates on sign-in.
 */
import { Tabs } from 'expo-router/js-tabs';

import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors } = theme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: t('nav.search'),
          tabBarAccessibilityLabel: t('a11y.tab_search_label'),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('nav.map'),
          tabBarAccessibilityLabel: t('a11y.tab_map_label'),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('nav.my_trips'),
          tabBarAccessibilityLabel: t('a11y.tab_my_trips_label'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          tabBarAccessibilityLabel: t('a11y.tab_settings_label'),
        }}
      />
    </Tabs>
  );
}
