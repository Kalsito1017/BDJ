/**
 * Root layout (DEC-005: route files live in src/app; DEC-001 Expo Router).
 *
 * Wires the app-wide chrome:
 * - ThemeProvider (src/theme) — dark-mode-ready; currently the light theme.
 * - SafeAreaProvider — inset context for React Navigation's tab bar/headers.
 * - OnboardingGate — first-launch guide until it is completed or skipped
 *   (plan.md 17.7); replayable later from Settings -> Help.
 *
 * Route map (deep-link contract, DEC-005 — record changes in
 * docs/decisions.md):
 *   "/"            -> this scaffold landing screen (src/app/index.tsx)
 *   "/search"      -> (tabs)/search     (also bdztrain://search)
 *   "/map"         -> (tabs)/map
 *   "/trips"       -> (tabs)/trips      (My trips / Tickets)
 *   "/settings"    -> (tabs)/settings
 *   "/onboarding"  -> onboarding guide (replayable)
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingGate } from '../features/onboarding';
import { ThemeProvider } from '../theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <OnboardingGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          </Stack>
        </OnboardingGate>
      </SafeAreaProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
