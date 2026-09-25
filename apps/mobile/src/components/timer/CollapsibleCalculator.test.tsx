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
  });

  it('renders collapsed by default with summary badge', () => {
    const { getByText, queryByLabelText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} />
    );

    expect(getByText('RATIO CALCULATOR')).toBeDefined();
    expect(getByText('18g @ 1:16 ➔ 288.0g')).toBeDefined();

    // Inputs should not be visible when collapsed
    expect(queryByLabelText('Coffee dose in grams')).toBeNull();
  });

  it('expands and collapses on header press', () => {
    const { getByLabelText, queryByLabelText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} />
    );

    const toggleButton = getByLabelText('Toggle Ratio Calculator');

    // Click to expand
    fireEvent.click(toggleButton);
    expect(getByLabelText('Coffee dose in grams')).toBeDefined();
    expect(getByLabelText('Brew ratio 1 to X')).toBeDefined();

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(queryByLabelText('Coffee dose in grams')).toBeNull();
  });

  it('recalculates water target when inputs change', () => {
    const { getByLabelText, getByText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));

    const doseInput = getByLabelText('Coffee dose in grams');
    const ratioInput = getByLabelText('Brew ratio 1 to X');

    // Change dose to 20
    fireEvent.change(doseInput, { target: { value: '20' } });
    // Change ratio to 15
    fireEvent.change(ratioInput, { target: { value: '15' } });

    // Target water = 20 * 15 = 300.0g
    expect(getByText('300.0g')).toBeDefined();
    expect(getByText('20g @ 1:15 ➔ 300.0g')).toBeDefined();
  });

  it('syncs internal state when initial props change', () => {
    const { getByLabelText, getByText, rerender } = render(
      <CollapsibleCalculator initialDose={15} initialRatio={16.67} />
    );

    fireEvent.click(getByLabelText('Toggle Ratio Calculator'));
    expect(getByText('15g @ 1:16.67 ➔ 250.0g')).toBeDefined();

    // Rerender with new recipe props (e.g. method switch to Flair)
    rerender(<CollapsibleCalculator initialDose={18} initialRatio={2.5} />);

    expect(getByText('18g @ 1:2.5 ➔ 45.0g')).toBeDefined();
    const doseInput = getByLabelText('Coffee dose in grams') as HTMLInputElement;
    expect(doseInput.value).toBe('18');
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

    const doseInput = getByLabelText('Coffee dose in grams');
    fireEvent.change(doseInput, { target: { value: '22' } });

    expect(getByText('APPLY DOSE TO TIMER (22g)')).toBeDefined();

    const applyButton = getByLabelText('Apply dose to timer');
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(22);
    expect(mobileFeedback.triggerHapticTap).toHaveBeenCalledTimes(1);

    // Visual confirmation state
    expect(getByText('DOSE APPLIED (22g)')).toBeDefined();

    // After 1500ms timeout expires, button resets to idle label
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(getByText('APPLY DOSE TO TIMER (22g)')).toBeDefined();
    vi.useRealTimers();
  });

  describe('Nested Ratio Translator Accordion', () => {
    it('expands nested translator drawer when clicked', () => {
      const { getByText, queryByText } = render(
        <CollapsibleCalculator initialDose={18} initialRatio={16} />
      );

      // Expand main calculator
      fireEvent.press(getByText('RATIO CALCULATOR'));
      expect(getByText('CONVERTER')).toBeTruthy();

      // Drawer starts collapsed
      expect(queryByText('BASELINE RECIPE')).toBeNull();

      // Expand translator drawer
      fireEvent.press(getByText('CONVERTER'));
      expect(getByText('BASELINE RECIPE')).toBeTruthy();
      expect(getByText('TARGET SOLVER')).toBeTruthy();
    });

    it('calculates implied ratio and solves target water from target coffee', () => {
      const onApplyDose = vi.fn();
      const { getByText, getByLabelText } = render(
        <CollapsibleCalculator initialDose={18} initialRatio={16} onApplyDose={onApplyDose} />
      );

      fireEvent.press(getByText('RATIO CALCULATOR'));
      fireEvent.press(getByText('CONVERTER'));

      const sourceCoffeeInput = getByLabelText('Baseline coffee dose in grams');
      const sourceWaterInput = getByLabelText('Baseline water amount in grams');
      const targetCoffeeInput = getByLabelText('Target coffee dose in grams');

      fireEvent.changeText(sourceCoffeeInput, '20');
      fireEvent.changeText(sourceWaterInput, '300');

      // Implied ratio should be 1:15.0
      expect(getByText(/1:15/)).toBeTruthy();

      fireEvent.changeText(targetCoffeeInput, '16');

      // Target water should solve to 240g
      expect(getByText(/Target Water: 240g/i)).toBeTruthy();

      // Apply solved dose to timer
      const applyTranslatorBtn = getByText('APPLY TRANSLATOR DOSE (16g)');
      fireEvent.press(applyTranslatorBtn);
      expect(onApplyDose).toHaveBeenCalledWith(16);
    });

    it('solves target coffee proportionally when target water is changed and rounds applied dose', () => {
      const onApplyDose = vi.fn();
      const { getByText, getByLabelText } = render(
        <CollapsibleCalculator initialDose={18} initialRatio={16} onApplyDose={onApplyDose} />
      );

      fireEvent.press(getByText('RATIO CALCULATOR'));
      fireEvent.press(getByText('CONVERTER'));

      const sourceCoffeeInput = getByLabelText('Baseline coffee dose in grams');
      const sourceWaterInput = getByLabelText('Baseline water amount in grams');
      const targetWaterInput = getByLabelText('Target water amount in grams');
      const targetCoffeeInput = getByLabelText('Target coffee dose in grams') as HTMLInputElement;

      fireEvent.changeText(sourceCoffeeInput, '20');
      fireEvent.changeText(sourceWaterInput, '300');

      // Changing target water to 250g with 1:15 ratio should solve coffee to 16.7g
      fireEvent.changeText(targetWaterInput, '250');
      expect(targetCoffeeInput.value).toBe('16.7');

      const applyBtn = getByText('APPLY TRANSLATOR DOSE (16.7g)');
      fireEvent.press(applyBtn);
      expect(onApplyDose).toHaveBeenCalledWith(16.7);
    });
  });
});
