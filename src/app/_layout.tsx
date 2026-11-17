/**
 * Root layout (DEC-005: route files live in src/app; DEC-001 Expo Router).
 *
 * Wires the app-wide chrome:
 * - ThemeProvider (src/theme) — dark-mode-ready; currently the light theme.
 * - SafeAreaProvider — inset context for React Navigation's tab bar/headers.
 * - AppDataProvider (src/hooks — data-provider workstream): TanStack Query
 *   + the mock TrainDataProvider (DEC-002, demo-labelled) for the journey
 *   search flow. Journey search works WITHOUT sign-in (plan.md 17.2).
 * - OnboardingGate — first-launch guide until it is completed or skipped
 *   (plan.md 17.7); replayable later from Settings -> Help.
 *
 * Route map (deep-link contract, DEC-005 — record changes in
 * docs/decisions.md):
 *   "/"                     -> this scaffold landing screen (src/app/index.tsx)
 *   "/search"               -> (tabs)/search  (journey search form; also bdztrain://search)
 *   "/search/results"       -> journey results (Phase 3/4; proposed, report)
 *   "/search/station-picker"-> station picker modal (Phase 3; proposed, report)
 *   "/journey/[id]"         -> journey details (Phase 4; proposed, report)
 *   "/map"                  -> (tabs)/map
 *   "/trips"                -> (tabs)/trips      (My trips / Tickets)
 *   "/settings"             -> (tabs)/settings
 *   "/onboarding"           -> onboarding guide (replayable)
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingGate } from '../features/onboarding';
import { AppDataProvider } from '../hooks';
import { ThemeProvider } from '../theme';

/**
 * Deep-link anchor (DEC-029). `search/station-picker` is presented as a modal;
 * without a non-modal screen already in the stack, a direct deep link makes it
 * the first screen, so Expo Router warns and renders it as a card. Anchoring
 * the tab shell keeps the modal presentation and gives Back a sensible target.
 */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppDataProvider>
          <OnboardingGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
            </Stack>
          </OnboardingGate>
        </AppDataProvider>
      </SafeAreaProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
