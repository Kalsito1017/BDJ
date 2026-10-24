/**
 * JourneySearchScreen — the Search tab (`/search`).
 *
 * Composes the form (react-hook-form + Zod) with the rule-6 demo notice and
 * routes to the station picker modal and the results screen. Works WITHOUT
 * sign-in (plan.md 17.2/17.7). No data hook is needed here: the form is
 * user input only, so this screen stays independent of the data-provider
 * workstream's hooks module.
 */

import { useRouter } from 'expo-router';

import { DemoDataNotice, ScreenContainer } from '../../components';
import { useTranslation } from '../../i18n';
import type { JourneySearch } from '../../types/journey';

import { JourneySearchForm } from './JourneySearchForm';
import { JOURNEY_SEARCH_KEYS } from './translationKeys';

export interface JourneySearchScreenProps {
  testID?: string;
}

export function JourneySearchScreen({ testID }: JourneySearchScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const openPicker = (field: 'from' | 'to') => {
    router.push({ pathname: '/search/station-picker', params: { field } });
  };

  const runSearch = (search: JourneySearch) => {
    router.push({
      pathname: '/search/results',
      params: {
        from: search.fromStationId,
        to: search.toStationId,
        date: search.date,
      },
    });
  };

  return (
    <ScreenContainer
      testID={testID ?? 'screen-search'}
      title={t(JOURNEY_SEARCH_KEYS.title)}
    >
      <JourneySearchForm
        onSelectFromStation={() => openPicker('from')}
        onSelectToStation={() => openPicker('to')}
        onSubmit={runSearch}
        t={t}
        testID="journey-search-form"
      />
      <DemoDataNotice testID="journey-search-demo-notice" />
    </ScreenContainer>
  );
}

export default JourneySearchScreen;
