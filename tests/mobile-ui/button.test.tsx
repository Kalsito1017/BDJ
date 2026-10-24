/**
 * Button component tests (touch targets, roles/labels, states).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from '../../src/components';
import { setI18nLocale } from '../../src/i18n';

beforeAll(() => {
  setI18nLocale('en');
});

function flattenStyle(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe('Button', () => {
  it('renders its label as an accessible button and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} testID="btn" />);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeTruthy();

    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps a touch target of at least 44x44 dp', async () => {
    await render(<Button label="Continue" onPress={() => {}} testID="btn" />);

    const style = flattenStyle('btn');
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
  });

  it('marks itself disabled and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} testID="btn" disabled />);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a busy spinner while loading and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} testID="btn" loading />);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
    // The visible label is replaced by the (decorative) spinner.
    expect(screen.queryByText('Continue')).toBeNull();

    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('allows a caller-provided accessible name and hint', async () => {
    await render(
      <Button
        accessibilityHint="Reopens the first-launch guide"
        accessibilityLabel="Replay the intro guide"
        label="Replay"
        onPress={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Replay the intro guide' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Replay the intro guide' }).props
        .accessibilityHint,
    ).toBe('Reopens the first-launch guide');
  });
});
