/**
 * Onboarding route (plan.md 17.7 "reopen the guide from Settings -> Help").
 *
 * Route: "/onboarding" (deep link: bdztrain://onboarding).
 * Completing or skipping returns to the previous screen.
 */
import { router } from 'expo-router';

import { OnboardingFlow } from '../features/onboarding';

export default function OnboardingScreen() {
  return (
    <OnboardingFlow
      onComplete={() => router.back()}
      onSkip={() => router.back()}
      testID="onboarding-screen"
    />
  );
}
