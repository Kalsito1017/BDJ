/**
 * ScreenContainer — standard page chrome for every screen.
 *
 * - Themed background + safe-area padding (react-native-safe-area-context's
 *   `SafeAreaView`, which applies insets natively and needs no provider).
 * - Optional screen title exposed as `accessibilityRole="header"` for
 *   VoiceOver/TalkBack rotor navigation.
 * - Optional scrolling: content, not fixed heights, decides the size so
 *   large font scales and long Bulgarian strings never clip (plan.md §8).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

export interface ScreenContainerProps {
  /** Screen title; rendered as an accessible header when present. */
  title?: string;
  children: React.ReactNode;
  /** Wrap the content in a ScrollView (long/dynamic content). */
  scroll?: boolean;
  /** Sticky bottom area (e.g. primary action). */
  footer?: React.ReactNode;
  testID?: string;
}

export function ScreenContainer({
  title,
  children,
  scroll = false,
  footer,
  testID,
}: ScreenContainerProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  const body = (
    <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
      {title ? (
        <Text
          accessibilityRole="header"
          style={[type.title, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? (
        <View style={[styles.footer, { padding: spacing.lg, gap: spacing.md }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    alignSelf: 'stretch',
  },
});
