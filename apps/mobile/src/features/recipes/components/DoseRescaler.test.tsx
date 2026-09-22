/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  TextInput: ({
    defaultValue,
    value,
    onChangeText,
    onEndEditing,
    accessibilityLabel,
    keyboardType: _keyboardType,
    ...props
  }: any) => (
    <input
      defaultValue={defaultValue}
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      onBlur={(e) => onEndEditing?.({ nativeEvent: { text: e.target.value } })}
      {...props}
    />
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Minus: () => null,
  Plus: () => null,
}));

import { DoseRescaler } from './DoseRescaler';

describe('DoseRescaler', () => {
  afterEach(() => {
    cleanup();
  });

  it('increments and decrements dose by 1g using steppers', () => {
    const onDoseChange = vi.fn();
    const { getByLabelText } = render(
      <DoseRescaler currentDose={15} baseDose={15} onDoseChange={onDoseChange} />
    );

    fireEvent.click(getByLabelText('Increase dose by 1 gram'));
    expect(onDoseChange).toHaveBeenCalledWith(16);

    fireEvent.click(getByLabelText('Decrease dose by 1 gram'));
    expect(onDoseChange).toHaveBeenCalledWith(14);
  });

  it('selects quick preset dose buttons', () => {
    const onDoseChange = vi.fn();
    const { getByText } = render(
      <DoseRescaler currentDose={15} baseDose={15} onDoseChange={onDoseChange} />
    );

    fireEvent.click(getByText('Server (30g)'));
    expect(onDoseChange).toHaveBeenCalledWith(30);
  });

  it('shows reset button when custom dose differs from base dose', () => {
    const onDoseChange = vi.fn();
    const { getByText } = render(
      <DoseRescaler currentDose={20} baseDose={15} onDoseChange={onDoseChange} />
    );

    const resetBtn = getByText('Reset (15g)');
    fireEvent.click(resetBtn);
    expect(onDoseChange).toHaveBeenCalledWith(15);
  });

  it('handles direct text input commit on end editing', () => {
    const onDoseChange = vi.fn();
    const { getByLabelText } = render(
      <DoseRescaler currentDose={15} baseDose={15} onDoseChange={onDoseChange} />
    );

    const input = getByLabelText('Target coffee dose in grams');
    fireEvent.blur(input, { target: { value: '22.5' } });
    expect(onDoseChange).toHaveBeenCalledWith(22.5);
  });

  it('clamps values within bounds 1g to 100g on step', () => {
    const onDoseChange = vi.fn();
    const { getByLabelText } = render(
      <DoseRescaler currentDose={1} baseDose={15} onDoseChange={onDoseChange} />
    );

    fireEvent.click(getByLabelText('Decrease dose by 1 gram'));
    expect(onDoseChange).toHaveBeenCalledWith(1);
  });
});
