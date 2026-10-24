/**
 * Journey search form — component tests (Phase 3 acceptance + checklist §7:
 * "forms keep typed values when one field fails validation").
 *
 * Real catalogs are used through `translate('en', …)` (existing
 * `validation.*` keys render real copy; keys still pending the lead's locale
 * merge render as their key — see tests/mobile-ui/i18n-integrity.test.tsx).
 * Synthetic stations and an injected "today" only.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { JourneySearchForm } from '../../src/features/journey-search/JourneySearchForm';
import {
  addDaysIso,
  type JourneySearchFormValues,
} from '../../src/features/journey-search/validation';
import {
  resetPendingStationSelection,
  setPendingStationSelection,
} from '../../src/features/station-picker/selection';
import { setI18nLocale, translate } from '../../src/i18n';
import type { JourneySearch } from '../../src/types/journey';
import type { Station } from '../../src/types/station';

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

const TODAY = '2026-10-24';

function station(id: string, name: string): Station {
  return {
    id,
    name,
    countryCode: 'BG',
    provenance: { kind: 'demo', fetchedAt: '2026-10-24T00:00:00.000Z' },
  };
}

const SOFIA = station('sofia', 'София');
const VARNA = station('varna', 'Варна');
const PLOVDIV = station('plovdiv', 'Пловдив');

interface HarnessProps {
  defaultValues?: Partial<JourneySearchFormValues>;
  onSubmit?: (search: JourneySearch) => void;
}

function Harness({ defaultValues, onSubmit = () => {} }: HarnessProps) {
  return (
    <JourneySearchForm
      defaultValues={defaultValues}
      onSelectFromStation={() => {}}
      onSelectToStation={() => {}}
      onSubmit={onSubmit}
      getToday={() => TODAY}
      t={t}
      testID="form"
    />
  );
}

beforeAll(() => {
  setI18nLocale('en');
});

beforeEach(() => {
  resetPendingStationSelection();
});

describe('journey search form: required fields', () => {
  it('rejects an empty submit and keeps everything the user typed', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('form-date'), '2026-13-99');
    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('form-from-error')).toBeTruthy();
    expect(await screen.findByTestId('form-to-error')).toBeTruthy();
    expect(await screen.findByTestId('form-date-error')).toBeTruthy();
    expect(screen.getByTestId('form-from-error').props.children).toBe(
      t('validation.required'),
    );
    expect(screen.getByTestId('form-to-error').props.children).toBe(
      t('validation.required'),
    );
    // Retention: the malformed date is still there (checklist §7).
    expect(screen.getByTestId('form-date').props.value).toBe('2026-13-99');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('journey search form: station rules', () => {
  it('rejects identical departure and arrival stations', async () => {
    const onSubmit = jest.fn();
    await render(
      <Harness
        defaultValues={{ fromStation: SOFIA, toStation: SOFIA, date: TODAY }}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('form-to-error')).toBeTruthy();
    expect(screen.getByTestId('form-to-error').props.children).toBe(
      t('validation.stations_must_differ'),
    );
    // Retention: both selections survive the failed submit.
    expect(screen.getAllByText('София').length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a valid search and submits typed values', async () => {
    const onSubmit = jest.fn();
    await render(
      <Harness
        defaultValues={{ fromStation: SOFIA, toStation: VARNA, date: TODAY }}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      fromStationId: 'sofia',
      toStationId: 'varna',
      date: TODAY,
    });
  });
});

describe('journey search form: date rules', () => {
  it.each([
    ['24.10.2026', 'validation.invalid_date'],
    ['2026-02-30', 'validation.invalid_date'],
    ['soon', 'validation.invalid_date'],
    ['2026-10-23', 'validation.date_in_past'],
    ['2020-01-01', 'validation.date_in_past'],
    [addDaysIso(TODAY, 91), 'validation.date_too_far'],
  ])('rejects %s with %s and retains the typed value', async (date, messageKey) => {
    const onSubmit = jest.fn();
    await render(
      <Harness
        defaultValues={{ fromStation: SOFIA, toStation: VARNA }}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('form-date'), date);
    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('form-date-error')).toBeTruthy();
    expect(screen.getByTestId('form-date-error').props.children).toBe(t(messageKey));
    expect(screen.getByTestId('form-date').props.value).toBe(date);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts today and the last day of the 90-day horizon', async () => {
    const onSubmit = jest.fn();
    await render(
      <Harness
        defaultValues={{ fromStation: SOFIA, toStation: VARNA }}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('form-date'), addDaysIso(TODAY, 90));
    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('form-date-error')).toBeNull();
  });

  it('fills the date from the Today and Tomorrow chips', async () => {
    await render(<Harness />);

    await fireEvent.press(screen.getByTestId('form-today'));
    expect(screen.getByTestId('form-date').props.value).toBe(TODAY);

    await fireEvent.press(screen.getByTestId('form-tomorrow'));
    expect(screen.getByTestId('form-date').props.value).toBe(addDaysIso(TODAY, 1));
  });
});

describe('journey search form: station selection', () => {
  it('swaps departure and arrival', async () => {
    await render(<Harness defaultValues={{ fromStation: SOFIA, toStation: VARNA }} />);

    expect(screen.getByText('София')).toBeTruthy();
    expect(screen.getByText('Варна')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('form-swap'));

    // The field testIDs are stable; the displayed names swap sides.
    expect(screen.getByTestId('form-from').props.accessibilityLabel).toBe(
      `${t('journey_search.from_label')}: Варна`,
    );
    expect(screen.getByTestId('form-to').props.accessibilityLabel).toBe(
      `${t('journey_search.to_label')}: София`,
    );
  });

  it('takes a station picked in the picker modal (pending-selection store)', async () => {
    await render(<Harness defaultValues={{ fromStation: SOFIA }} />);

    // External-store update: needs an async act() to flush under React 19.
    await act(async () => {
      setPendingStationSelection({ field: 'to', station: PLOVDIV });
    });

    expect(screen.getByText('Пловдив')).toBeTruthy();
    expect(screen.getByTestId('form-to').props.accessibilityLabel).toBe(
      `${t('journey_search.to_label')}: Пловдив`,
    );
  });
});
