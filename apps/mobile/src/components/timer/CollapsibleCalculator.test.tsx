/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  TextInput: ({ onChangeText, value, accessibilityLabel, ...props }: any) => (
    <input
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      {...props}
    />
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-expanded={accessibilityState?.expanded}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  ChevronRight: () => null,
  Calculator: () => null,
  Scale: () => null,
  Check: () => null,
}));

vi.mock('../../lib/mobileFeedback', () => ({
  mobileFeedback: {
    triggerHapticTap: vi.fn(),
  },
}));

import { render, fireEvent as rtlFireEvent, cleanup, act } from '@testing-library/react';
import { CollapsibleCalculator } from './CollapsibleCalculator';
import { mobileFeedback } from '../../lib/mobileFeedback';

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
  changeText: (element: Element | Node | Document | Window, text: string) => {
    rtlFireEvent.change(element, { target: { value: text } });
  },
};

describe('CollapsibleCalculator Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders collapsed by default', () => {
    const { getByText, queryByLabelText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} />
    );

    expect(getByText('RATIO CALCULATOR')).toBeDefined();

    // Inputs should not be visible when collapsed
    expect(queryByLabelText('Source coffee dose in grams')).toBeNull();
  });

  it('expands and collapses on header press', () => {
    const { getByLabelText, queryByLabelText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} />
    );

    const toggleButton = getByLabelText('Toggle Ratio Calculator');

    // Click to expand
    fireEvent.click(toggleButton);
    expect(getByLabelText('Source coffee dose in grams')).toBeDefined();
    expect(getByLabelText('Source water amount in grams')).toBeDefined();
    expect(getByLabelText('Target coffee dose in grams')).toBeDefined();
    expect(getByLabelText('Target water amount in grams')).toBeDefined();

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(queryByLabelText('Source coffee dose in grams')).toBeNull();
  });

  it('calculates implied ratio and solves target water from target coffee', () => {
    const onApplyDose = vi.fn();
    const { getByLabelText, getByText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} onApplyDose={onApplyDose} />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));

    const sourceCoffeeInput = getByLabelText('Source coffee dose in grams');
    const sourceWaterInput = getByLabelText('Source water amount in grams');
    const targetCoffeeInput = getByLabelText('Target coffee dose in grams');
    const targetWaterInput = getByLabelText('Target water amount in grams') as HTMLInputElement;

    fireEvent.changeText(sourceCoffeeInput, '20');
    fireEvent.changeText(sourceWaterInput, '300');
    fireEvent.changeText(targetCoffeeInput, '16');

    // Target water should solve to 240g
    expect(targetWaterInput.value).toBe('240');

    // Apply solved dose to timer
    const applyBtn = getByText('APPLY DOSE');
    fireEvent.press(applyBtn);
    expect(onApplyDose).toHaveBeenCalledWith(16, 15, 240);
  });

  it('solves target coffee proportionally when target water is changed and rounds applied dose', () => {
    const onApplyDose = vi.fn();
    const { getByLabelText, getByText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} onApplyDose={onApplyDose} />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));

    const sourceCoffeeInput = getByLabelText('Source coffee dose in grams');
    const sourceWaterInput = getByLabelText('Source water amount in grams');
    const targetWaterInput = getByLabelText('Target water amount in grams');
    const targetCoffeeInput = getByLabelText('Target coffee dose in grams') as HTMLInputElement;

    fireEvent.changeText(sourceCoffeeInput, '20');
    fireEvent.changeText(sourceWaterInput, '300');

    // Changing target water to 250g with 1:15 ratio should solve coffee to 16.7g
    fireEvent.changeText(targetWaterInput, '250');
    expect(targetCoffeeInput.value).toBe('16.7');

    const applyBtn = getByText('APPLY DOSE');
    fireEvent.press(applyBtn);
    expect(onApplyDose).toHaveBeenCalledWith(16.7, 15, 250);
  });

  it('initializes baseline recipe values from initialDose/initialWater and solves target coffee', () => {
    const onApplyDose = vi.fn();
    const { getByLabelText, getByText } = render(
      <CollapsibleCalculator
        initialDose={30}
        initialRatio={16.67}
        initialWater={500}
        onApplyDose={onApplyDose}
      />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));

    const sourceCoffeeInput = getByLabelText('Source coffee dose in grams') as HTMLInputElement;
    const sourceWaterInput = getByLabelText('Source water amount in grams') as HTMLInputElement;
    const targetWaterInput = getByLabelText('Target water amount in grams');
    const targetCoffeeInput = getByLabelText('Target coffee dose in grams') as HTMLInputElement;

    // Baseline should match recipe values 30 : 500
    expect(sourceCoffeeInput.value).toBe('30');
    expect(sourceWaterInput.value).toBe('500');

    // Change target water to 300g
    fireEvent.changeText(targetWaterInput, '300');
    expect(targetCoffeeInput.value).toBe('18');

    // Apply solved dose to timer
    const applyBtn = getByText('APPLY DOSE');
    fireEvent.press(applyBtn);
    expect(onApplyDose).toHaveBeenCalledWith(18, 16.7, 300);
  });

  it('syncs internal state when initial props change', () => {
    const { getByLabelText, rerender } = render(
      <CollapsibleCalculator initialDose={15} initialRatio={16.67} />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));
    const sourceCoffeeInput = getByLabelText('Source coffee dose in grams') as HTMLInputElement;
    const sourceWaterInput = getByLabelText('Source water amount in grams') as HTMLInputElement;
    expect(sourceCoffeeInput.value).toBe('15');
    expect(sourceWaterInput.value).toBe('250');

    // Rerender with new recipe props (e.g. method switch to Flair)
    rerender(<CollapsibleCalculator initialDose={18} initialRatio={2.5} initialWater={45} />);

    expect(sourceCoffeeInput.value).toBe('18');
    expect(sourceWaterInput.value).toBe('45');
  });

  it('invokes onApplyDose, triggers haptic tap, and shows temporary success state when apply button is clicked', () => {
    vi.useFakeTimers();
    const onApply = vi.fn();
    const { getByLabelText, getByText } = render(
      <CollapsibleCalculator
        initialDose={15}
        initialRatio={16}
        onApplyDose={onApply}
      />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));

    const targetCoffeeInput = getByLabelText('Target coffee dose in grams');
    fireEvent.changeText(targetCoffeeInput, '22');

    expect(getByText('APPLY DOSE')).toBeDefined();

    const applyButton = getByLabelText('Apply dose to timer');
    fireEvent.press(applyButton);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(22, 16, 352);
    expect(mobileFeedback.triggerHapticTap).toHaveBeenCalledTimes(1);

    // Visual confirmation state
    expect(getByText('DOSE APPLIED')).toBeDefined();

    // After 1500ms timeout expires, button resets to idle label
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(getByText('APPLY DOSE')).toBeDefined();
    vi.useRealTimers();
  });

  it('cleans up applied badge timeout on unmount without errors', () => {
    vi.useFakeTimers();
    const onApply = vi.fn();
    const { getByLabelText, unmount } = render(
      <CollapsibleCalculator
        initialDose={18}
        initialRatio={16}
        onApplyDose={onApply}
      />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));
    fireEvent.press(getByLabelText('Apply dose to timer'));

    unmount();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
  });
});
