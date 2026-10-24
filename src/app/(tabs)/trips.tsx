/**
 * My trips / Tickets tab (placeholder until Phase 5/6).
 *
 * Ticketing is DISABLED (feature flag `ticketSales` OFF, DEC-004): this
 * screen has no purchase UI, no prices and no payment fields — only an
 * honest notice about where tickets are actually sold (plan.md 17.1).
 * Nothing here requires an account (plan.md 17.2).
 */
import { Text } from 'react-native';

import { Card, PlaceholderScreen } from '../../components';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme';

export default function TripsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  return (
    <PlaceholderScreen testID="screen-trips" title={t('nav.my_trips')}>
      <Card testID="screen-trips-tickets">
        <Text
          accessibilityRole="header"
          style={[type.heading, { color: colors.textPrimary, marginBottom: spacing.sm }]}
        >
          {t('nav.tickets')}
        </Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>
          {t('tickets.unavailable_notice')}
        </Text>
      </Card>
    </PlaceholderScreen>
  );
}
