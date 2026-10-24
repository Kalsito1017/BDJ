/**
 * Map tab: station discovery (list + map toggle) from the map-stations
 * workstream. The map area is a labelled placeholder until a human confirms
 * the map SDK decision (DEC-012) — no map SDK is installed, no map is
 * rendered, and no location permission is requested anywhere until the user
 * taps "nearby stations" (foreground only, never stored).
 */
import { View, StyleSheet } from 'react-native';

import { StationsScreen } from '../../features/stations';

export default function MapScreen() {
  return (
    <View style={styles.container} testID="screen-map">
      <StationsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
