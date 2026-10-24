/**
 * UI-state component tests: loading, empty, error (all provider error codes),
 * timeout, offline, list skeleton and the destructive-action confirmation
 * dialog (addbeforerelease.txt §7, §10; DEC-007 error-code mapping).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Loader,
  OfflineState,
  TimeoutState,
} from '../../src/components';
import { ERROR_MESSAGE_KEYS, setI18nLocale, translate } from '../../src/i18n';
import type { ProviderErrorCode } from '../../src/types/errors';

// Load-robustness (defect found in Docker verification 2026-10-24): the
// ConfirmDialog flow uses async RNTL updates and exceeded Jest's 5s default
// when the whole suite runs on a CPU-constrained container. Bounded at 20s.
jest.setTimeout(20000);

beforeAll(() => {
  setI18nLocale('en');
});

describe('Loader and ListSkeleton', () => {
  it('announces loading once via a busy progressbar', async () => {
    await render(<Loader testID="loader" />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityState).toMatchObject({
      busy: true,
    });
    expect(screen.getByText(translate('en', 'states.loading'))).toBeTruthy();
  });

  it('renders the requested number of skeleton rows with a single label', async () => {
    await render(<ListSkeleton rows={4} testID="skeleton" />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe(
      translate('en', 'states.loading'),
    );
  });
});

describe('EmptyState', () => {
  it('renders the empty message and an optional action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState actionLabel={translate('en', 'common.retry')} onAction={onAction} />,
    );

    expect(screen.getByText(translate('en', 'states.empty'))).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: translate('en', 'common.retry') }),
    );
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  const codes = Object.keys(ERROR_MESSAGE_KEYS) as ProviderErrorCode[];

  it.each(codes)(
    'maps provider error code %s to its actionable message',
    async (code) => {
      await render(<ErrorState code={code} />);

      expect(screen.getByText(translate('en', 'states.error'))).toBeTruthy();
      expect(screen.getByText(translate('en', ERROR_MESSAGE_KEYS[code]))).toBeTruthy();
    },
  );

  it('offers retry only when a handler is provided', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState code="network" onRetry={onRetry} />);
    expect(
      screen.getByRole('button', { name: translate('en', 'common.retry') }),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: translate('en', 'common.retry') }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry action when no handler is provided', async () => {
    await render(<ErrorState code="network" />);
    expect(
      screen.queryByRole('button', { name: translate('en', 'common.retry') }),
    ).toBeNull();
  });

  it('exposes the state as an alert for screen readers', async () => {
    await render(<ErrorState code="unknown" />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('OfflineState and TimeoutState', () => {
  it('shows the offline state with retry', async () => {
    const onRetry = jest.fn();
    await render(<OfflineState onRetry={onRetry} />);

    expect(screen.getByText(translate('en', 'states.offline'))).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: translate('en', 'common.retry') }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the timeout state with retry', async () => {
    const onRetry = jest.fn();
    await render(<TimeoutState onRetry={onRetry} />);

    expect(screen.getByText(translate('en', 'states.timeout'))).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: translate('en', 'common.retry') }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog', () => {
  it('confirms destructive actions only after explicit confirmation', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ConfirmDialog
        destructive
        message="This cannot be undone."
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Remove this favourite?"
        visible
        testID="dialog"
      />,
    );

    expect(screen.getByRole('alert').props.accessibilityLabel).toBe(
      'Remove this favourite?',
    );
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('labels the destructive confirm action with the delete key', async () => {
    await render(
      <ConfirmDialog
        destructive
        onCancel={() => {}}
        onConfirm={() => {}}
        title="Remove this favourite?"
        visible
      />,
    );

    expect(
      screen.getByRole('button', { name: translate('en', 'common.delete') }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: translate('en', 'common.cancel') }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: translate('en', 'common.close') }),
    ).toBeTruthy();
  });

  it('renders nothing while not visible', async () => {
    await render(
      <ConfirmDialog
        onCancel={() => {}}
        onConfirm={() => {}}
        title="Remove this favourite?"
        visible={false}
      />,
    );

    expect(screen.queryByText('Remove this favourite?')).toBeNull();
  });
});

describe('Card', () => {
  it('groups labelled content for screen readers and stays plain otherwise', async () => {
    await render(
      <Card accessibilityLabel="Grouped" testID="card">
        <EmptyState />
      </Card>,
    );
    expect(screen.getByTestId('card').props.accessibilityRole).toBe('summary');
    expect(screen.getByText(translate('en', 'states.empty'))).toBeTruthy();
  });
});
