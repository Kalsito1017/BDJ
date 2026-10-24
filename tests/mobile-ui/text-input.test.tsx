/**
 * TextInput component tests (labels, validation, value retention).
 *
 * Checklist §7: "Forms keep typed values when one field fails validation."
 */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextInput } from '../../src/components';
import { setI18nLocale, translate } from '../../src/i18n';

beforeAll(() => {
  setI18nLocale('en');
});

describe('TextInput', () => {
  it('exposes its label as the accessible name and accepts input', async () => {
    const onChangeText = jest.fn();
    await render(
      <TextInput
        label="Departure station"
        onChangeText={onChangeText}
        testID="field"
        value=""
      />,
    );

    const field = screen.getByLabelText('Departure station');
    expect(field).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('field'), 'София');
    expect(onChangeText).toHaveBeenCalledWith('София');
  });

  it('announces the validation message as an alert and keeps typed values', async () => {
    function Harness() {
      const [a, setA] = useState('Варна');
      const [b, setB] = useState('12');
      return (
        <>
          <TextInput
            error={translate('en', 'validation.required')}
            label="Departure station"
            onChangeText={setA}
            testID="field-a"
            value={a}
          />
          <TextInput label="Date" onChangeText={setB} testID="field-b" value={b} />
        </>
      );
    }

    await render(<Harness />);

    expect(screen.getByTestId('field-a-error')).toBeTruthy();
    expect(screen.getByRole('alert').props.children).toBe(
      translate('en', 'validation.required'),
    );

    // Values survive validation failure (checklist §7).
    expect(screen.getByTestId('field-a').props.value).toBe('Варна');
    expect(screen.getByTestId('field-b').props.value).toBe('12');

    // And typing keeps working while the error is shown.
    await fireEvent.changeText(screen.getByTestId('field-a'), 'София');
    expect(screen.getByTestId('field-a').props.value).toBe('София');
  });

  it('falls back to the required-field hint for screen readers when required', async () => {
    await render(
      <TextInput
        label="Travel date"
        onChangeText={() => {}}
        required
        testID="field"
        value=""
      />,
    );

    expect(screen.getByLabelText('Travel date').props.accessibilityHint).toBe(
      translate('en', 'validation.required'),
    );
    expect(screen.getByText('*')).toBeTruthy();
  });
});
