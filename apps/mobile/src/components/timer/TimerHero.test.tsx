/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    disabled,
    hitSlop,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
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
  Play: () => null,
  Pause: () => null,
  RotateCcw: () => null,
  Volume2: () => null,
  VolumeX: () => null,
  Minus: () => null,
  Plus: () => null,
}));

import { render, fireEvent, cleanup } from '@testing-library/react';
import { TimerHero } from './TimerHero';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';

describe('TimerHero Component', () => {
  afterEach(() => {
    cleanup();
  });

  const baseRecipe = DEFAULT_PRESET_RECIPES[0];

  it('renders recipe info, formatted clock, and chassis metrics', () => {
    const { getByText } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={75}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={300}
        doseGrams={30}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={35}
      />
    );

    expect(getByText('Ultimate V60 (James Hoffmann)')).toBeDefined();
    expect(getByText(/1:16.67/)).toBeDefined();
    expect(getByText('1')).toBeDefined(); // mins
    expect(getByText('15')).toBeDefined(); // secs
    expect(getByText('30g')).toBeDefined();
    expect(getByText('500g')).toBeDefined();
    expect(getByText('300g')).toBeDefined();
  });

  it('handles dose stepper increment and decrement when provided', () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    const { getByLabelText } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={0}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={18}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={0}
        onIncrementDose={onIncrement}
        onDecrementDose={onDecrement}
      />
    );

    const increaseBtn = getByLabelText('Increase dose');
    const decreaseBtn = getByLabelText('Decrease dose');

    fireEvent.click(increaseBtn);
    expect(onIncrement).toHaveBeenCalledTimes(1);

    fireEvent.click(decreaseBtn);
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it('disables stepper buttons during active timer run', () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    const { getByLabelText } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={10}
        isRunning={true}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={18}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={10}
        onIncrementDose={onIncrement}
        onDecrementDose={onDecrement}
      />
    );

    const increaseBtn = getByLabelText('Increase dose') as HTMLButtonElement;
    const decreaseBtn = getByLabelText('Decrease dose') as HTMLButtonElement;

    expect(increaseBtn.disabled).toBe(true);
    expect(decreaseBtn.disabled).toBe(true);

    fireEvent.click(increaseBtn);
    expect(onIncrement).not.toHaveBeenCalled();
  });

  it('disables boundary limits (dose <= 1 disables decrement, dose >= 100 disables increment)', () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    const { getByLabelText, rerender } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={0}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={1}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={0}
        onIncrementDose={onIncrement}
        onDecrementDose={onDecrement}
      />
    );

    expect((getByLabelText('Decrease dose') as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText('Increase dose') as HTMLButtonElement).disabled).toBe(false);

    rerender(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={0}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={100}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={0}
        onIncrementDose={onIncrement}
        onDecrementDose={onDecrement}
      />
    );

    expect((getByLabelText('Increase dose') as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText('Decrease dose') as HTMLButtonElement).disabled).toBe(false);
  });

  it('displays RESET on primary button and disables stepper when isFinished is true', () => {
    const onToggleTimer = vi.fn();
    const onReset = vi.fn();
    const onIncrement = vi.fn();

    const { getByText, getByLabelText, queryByText } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={210}
        isRunning={false}
        isFinished={true}
        isMuted={false}
        currentStageTargetWater={500}
        doseGrams={30}
        onToggleTimer={onToggleTimer}
        onReset={onReset}
        onToggleMute={vi.fn()}
        totalProgress={100}
        onIncrementDose={onIncrement}
        onDecrementDose={vi.fn()}
      />
    );

    // Primary button should display RESET, never RESUME
    expect(getByText('RESET')).toBeDefined();
    expect(queryByText('RESUME')).toBeNull();

    // Tapping the primary button calls onReset
    const resetButton = getByLabelText('Reset brew timer');
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onToggleTimer).not.toHaveBeenCalled();

    // Steppers must be disabled when finished
    const increaseBtn = getByLabelText('Increase dose') as HTMLButtonElement;
    expect(increaseBtn.disabled).toBe(true);
    fireEvent.click(increaseBtn);
    expect(onIncrement).not.toHaveBeenCalled();
  });
});
