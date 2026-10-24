/**
 * RequestErrorState — the single UI mapping point for provider failures
 * (checklist §7: "error messages a user can act on"; DEC-007: raw upstream
 * codes/messages are never rendered).
 *
 * Asserts the FULL `ProviderErrorCode` surface (all 12 codes the UI can
 * receive — src/types/errors.ts) maps to its localised `errors.*` message,
 * that timeout/offline get their dedicated states, that the raw
 * `ProviderError.message` never reaches the screen, and that a malformed
 * error object degrades to `errors.unknown` instead of crashing (plan.md §9
 * Phase 4: "no provider failure crashes the app").
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RequestErrorState } from '../../src/components/RequestErrorState';
import { setI18nLocale, translate } from '../../src/i18n';
import type { ProviderErrorCode } from '../../src/types/errors';

const t = (key: string, params?: Record<string, string | number>) =>
  translate('en', key, params);

/** code -> expected localised message key (pinned per code, not derived). */
const CODE_MESSAGE: readonly [ProviderErrorCode, string][] = [
  ['timeout', 'errors.timeout'],
  ['cancelled', 'errors.cancelled'],
  ['offline', 'errors.offline'],
  ['network', 'errors.network'],
  ['rate_limited', 'errors.rate_limited'],
  ['upstream_error', 'errors.upstream_error'],
  ['invalid_response', 'errors.invalid_response'],
  ['not_found', 'errors.not_found'],
  ['conflict', 'errors.conflict'],
  ['forbidden', 'errors.forbidden'],
  ['unsupported', 'errors.unsupported'],
  ['unknown', 'errors.unknown'],
];

beforeAll(() => {
  setI18nLocale('en');
});

describe('RequestErrorState: ProviderErrorCode -> actionable message', () => {
  it.each(CODE_MESSAGE)('maps %s to %s with a retry action', async (code, messageKey) => {
    const onRetry = jest.fn();
    await render(
      <RequestErrorState
        error={{ code, message: 'RAW PROVIDER PAYLOAD', retryable: true }}
        onRetry={onRetry}
        testID="err"
      />,
    );

    expect(screen.getByTestId('err')).toBeTruthy();
    expect(screen.getByText(t(messageKey))).toBeTruthy();

    // DEC-007: the raw error message is diagnostics only — never rendered.
    expect(screen.queryByText('RAW PROVIDER PAYLOAD')).toBeNull();

    await fireEvent.press(screen.getByText(t('common.retry')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the timeout failure in the dedicated timeout layout', async () => {
    await render(
      <RequestErrorState
        error={{ code: 'timeout', message: 'raw', retryable: true }}
        testID="err-timeout"
      />,
    );
    expect(screen.getByText(t('states.timeout'))).toBeTruthy();
    expect(screen.getByText(t('errors.timeout'))).toBeTruthy();
  });

  it('renders the offline failure in the dedicated offline layout', async () => {
    await render(
      <RequestErrorState
        error={{ code: 'offline', message: 'raw', retryable: true }}
        testID="err-offline"
      />,
    );
    expect(screen.getByText(t('states.offline'))).toBeTruthy();
    expect(screen.getByText(t('errors.offline'))).toBeTruthy();
  });

  it('omits the retry action when no handler is supplied', async () => {
    await render(
      <RequestErrorState
        error={{ code: 'network', message: 'raw', retryable: true }}
        testID="err"
      />,
    );
    expect(screen.queryByText(t('common.retry'))).toBeNull();
  });

  it.each([
    ['a bare string', 'not-an-error-object'],
    ['null', null],
    ['an object with an unknown code', { code: 'made_up', message: 'raw' }],
  ] as const)(
    'degrades %s to the errors.unknown fallback without crashing',
    async (_label, error) => {
      await render(<RequestErrorState error={error} testID="err" />);
      expect(screen.getByText(t('errors.unknown'))).toBeTruthy();
    },
  );
});
