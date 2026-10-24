/**
 * Station picker route (`/search/station-picker` — deep-link contract
 * recorded in docs/decisions.md DEC-022 §1).
 *
 * Presented as a modal over the search form (the modal presentation is set
 * here — Expo Router warns only when this route is opened as the very first
 * screen, e.g. a direct deep link, where there is nothing to present over;
 * the normal flow is form -> modal -> form). `?field=from|to` selects which
 * form field the chosen station fills (the hand-off goes through the
 * pending-selection store in the station-picker feature). Works WITHOUT
 * sign-in and requests NO location permission (plan.md §8).
 */
import { Stack } from 'expo-router';

import { StationPickerScreen } from '../../features/station-picker';

export default function StationPickerRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <StationPickerScreen testID="screen-station-picker" />
    </>
  );
}
