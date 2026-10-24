/**
 * Search tab (placeholder until Phase 3 journey search).
 *
 * No timetable data is shown here yet (DEC-002: mock-only data source), and
 * nothing on this screen requires an account (plan.md 17.2).
 */
import { PlaceholderScreen } from '../../components';
import { useTranslation } from '../../i18n';

export default function SearchScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen testID="screen-search" title={t('nav.search')} />;
}
