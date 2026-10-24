/**
 * Station picker — behaviour tests with MOCKED hook results (Phase 3
 * acceptance: "Cyrillic station search works"; checklist §8: Cyrillic AND
 * Latin AND mixed input).
 *
 * `useStationSearch` (src/hooks — data-provider workstream) is mocked at the
 * contract boundary: the mock mirrors the provider's documented matching
 * (case-insensitive substring over names/alternate names/aliases) so the
 * tests exercise the real screen wiring: query text -> hook -> rows. Route
 * navigation is mocked too (the picker publishes its choice through the
 * pending-selection store and calls router.back()).
 *
 * Synthetic demo stations only. Rule 6: every row must show its demo
 * provenance badge and the demo notice must be visible in every state.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { useStationSearch } from '../../src/hooks';
import { StationPickerScreen } from '../../src/features/station-picker/StationPickerScreen';
import { StationPickerView } from '../../src/features/station-picker/StationPickerView';
import {
  resetPendingStationSelection,
  takePendingStationSelection,
} from '../../src/features/station-picker/selection';
import { setI18nLocale, translate } from '../../src/i18n';
import type { ProviderError } from '../../src/types/errors';
import type { Station } from '../../src/types/station';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => ({ field: 'from' }),
}));

jest.mock('../../src/hooks', () => ({
  useStationSearch: jest.fn(),
}));

const mockedUseStationSearch = jest.mocked(useStationSearch);

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

function station(id: string, name: string, alternateName?: string): Station {
  return {
    id,
    name,
    alternateName,
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  };
}

const DIRECTORY: readonly Station[] = [
  station('sofia', 'София', 'Sofia'),
  station('sofia-sever', 'София Север'),
  station('varna', 'Варна', 'Varna'),
  station('plovdiv', 'Пловдив'),
  station(
    'long',
    'Карлуково-Община Роман Северозападна гара с дълго име',
    'Karlukovo long name halt',
  ),
];

function matches(station: Station, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return [station.name, station.alternateName ?? '']
    .concat([...(station.aliases ?? [])])
    .some((candidate) => candidate.toLowerCase().includes(q));
}

/** Contract-shaped mock: the hook does the searching, the UI renders it. */
function mockSearchResult(options: {
  query: string;
  loading?: boolean;
  error?: ProviderError | null;
}) {
  mockedUseStationSearch.mockImplementation((query: string) => ({
    stations:
      options.loading || options.error ? [] : DIRECTORY.filter((s) => matches(s, query)),
    isLoading: options.loading ?? false,
    isError: Boolean(options.error),
    error: options.error ?? null,
    refetch: () => {},
  }));
}

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(() => {
  resetPendingStationSelection();
  mockBack.mockClear();
  mockedUseStationSearch.mockReset();
});

describe('station picker: search behaviour (mocked hook results)', () => {
  it('shows the full directory for an empty query', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    expect(screen.getByText('София')).toBeTruthy();
    expect(screen.getByText('Варна')).toBeTruthy();
    expect(screen.getByText('Пловдив')).toBeTruthy();
    expect(screen.getByTestId('picker-count').props.children).toBe(
      t('stations.result_count', { count: DIRECTORY.length }),
    );
  });

  it('filters with Cyrillic input (incl. partial words)', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    await fireEvent.changeText(screen.getByTestId('picker-search'), 'Соф');

    expect(screen.getByText('София')).toBeTruthy();
    expect(screen.getByText('София Север')).toBeTruthy();
    expect(screen.queryByText('Варна')).toBeNull();
    expect(mockedUseStationSearch).toHaveBeenCalledWith('Соф');
  });

  it('filters with Latin and mixed-case input', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    await fireEvent.changeText(screen.getByTestId('picker-search'), 'vAr');
    expect(screen.getByText('Варна')).toBeTruthy();
    expect(screen.queryByText('София')).toBeNull();

    // Latin input matches Latin alternate names; transliteration between
    // scripts is NOT assumed (the data source defines aliases — plan.md §3.4).
    await fireEvent.changeText(screen.getByTestId('picker-search'), 'SOFIA');
    expect(screen.getByText('София')).toBeTruthy();
    expect(screen.queryByText('София Север')).toBeNull();
    expect(screen.queryByText('Варна')).toBeNull();
  });

  it('finds a station by its alternate (Latin) name', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    await fireEvent.changeText(screen.getByTestId('picker-search'), 'Karlukovo');
    expect(
      screen.getByText('Карлуково-Община Роман Северозападна гара с дълго име'),
    ).toBeTruthy();
    expect(screen.queryByText('София')).toBeNull();
  });

  it('labels a no-match query with the typed text', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    await fireEvent.changeText(screen.getByTestId('picker-search'), 'zzz');

    expect(screen.getByText(t('stations.no_results', { query: 'zzz' }))).toBeTruthy();
    expect(screen.getByText(t('states.empty'))).toBeTruthy();
  });
});

describe('station picker: states', () => {
  it('renders the loading skeleton', async () => {
    mockSearchResult({ query: '', loading: true });
    await render(<StationPickerScreen testID="picker" />);
    expect(screen.getByTestId('picker-loading')).toBeTruthy();
  });

  it.each([
    ['timeout', 'errors.timeout'],
    ['offline', 'errors.offline'],
    ['network', 'errors.network'],
    ['upstream_error', 'errors.upstream_error'],
    ['invalid_response', 'errors.invalid_response'],
    ['rate_limited', 'errors.rate_limited'],
    ['unknown', 'errors.unknown'],
  ] as const)(
    'maps a %s failure to the actionable %s message',
    async (code, messageKey) => {
      mockSearchResult({
        query: '',
        error: {
          code,
          message: 'synthetic failure',
          retryable: true,
          occurredAt: '2026-10-24T00:00:00.000Z',
        },
      });
      await render(<StationPickerScreen testID="picker" />);
      expect(screen.getByTestId('picker-error')).toBeTruthy();
      expect(screen.getByText(t(messageKey))).toBeTruthy();
    },
  );
});

describe('station picker: demo labelling (rule 6)', () => {
  it('labels EVERY row as demo data and shows the demo notice', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    const rows = DIRECTORY.length;
    expect(screen.getAllByText(t('provenance.demo')).length).toBeGreaterThanOrEqual(rows);
    expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
  });

  it('keeps the demo notice visible in the empty state', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    await fireEvent.changeText(screen.getByTestId('picker-search'), 'zzz');
    expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
  });
});

describe('station picker: selection', () => {
  it('publishes the chosen station and closes the modal', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);

    await fireEvent.press(screen.getByText('Варна'));

    expect(takePendingStationSelection()).toEqual({
      field: 'from',
      station: expect.objectContaining({ id: 'varna', name: 'Варна' }),
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('exposes each row as an accessible station button', async () => {
    mockSearchResult({ query: '' });
    await render(<StationPickerScreen testID="picker" />);
    expect(
      screen.getByLabelText(t('a11y.search_result', { name: 'София' })),
    ).toBeTruthy();
  });
});

describe('station picker view: long names and hints', () => {
  it('renders long Bulgarian names and alternate names in rows', async () => {
    await render(
      <StationPickerView
        error={null}
        loading={false}
        onClose={() => {}}
        onSelectStation={() => {}}
        onQueryChange={() => {}}
        query=""
        stations={DIRECTORY}
        t={t}
        testID="view"
      />,
    );

    expect(
      screen.getByText('Карлуково-Община Роман Северозападна гара с дълго име'),
    ).toBeTruthy();
    expect(screen.getByText('Karlukovo long name halt')).toBeTruthy();
    expect(screen.getByText(t('stations.search_hint'))).toBeTruthy();
    expect(
      screen.getByText(t('stations.result_count', { count: DIRECTORY.length })),
    ).toBeTruthy();
  });

  it('labels the empty directory case', async () => {
    await render(
      <StationPickerView
        error={null}
        loading={false}
        onClose={() => {}}
        onSelectStation={() => {}}
        onQueryChange={() => {}}
        query=""
        stations={[]}
        t={t}
        testID="view"
      />,
    );
    expect(screen.getByText(t('stations.empty'))).toBeTruthy();
    expect(screen.getByText(t('stations.demo.notice'))).toBeTruthy();
  });
});
