import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * Root layout for the placeholder scaffold (Phase 1).
 *
 * Wave 3 owns the real navigation, theme and screens (DEC-005). This file only
 * proves that the Expo Router entry with routes in `src/app` (app.json
 * `expo-router.root`) compiles and boots.
 */
export default function RootLayout() {
  return (
    <>
      <Stack />
      <StatusBar style="auto" />
    </>
  );
}
