import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder home screen (Phase 1 scaffold).
 *
 * Deliberately shows NO train data: no timetable, no journeys, no live
 * positions. Journey search, results and provider integration arrive in
 * Phase 3/4 and any provider data must carry a visible provenance label
 * (DEC-006, DEC-002). Do not add data here.
 */
export default function PlaceholderScreen() {
  return (
    <View style={styles.container} testID="placeholder-screen">
      <Text style={styles.title} accessibilityRole="header">
        BDZ Train Companion
      </Text>
      <Text style={styles.body}>
        Project scaffold placeholder. No timetable data is available in the app yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
  },
});
