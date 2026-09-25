/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  TextInput: ({
    onChangeText,
    onBlur,
    onSubmitEditing,
    value,
    accessibilityLabel,
    editable = true,
    ...props
  }: any) => (
    <input
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmitEditing?.();
      }}
      disabled={!editable}
      {...props}
    />
  ),
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
}));

import { render, fireEvent, cleanup } from '@testing-library/react';
import { TimerHero } from './TimerHero';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';

describe('TimerHero Component', () => {
  afterEach(() => {
    cleanup();
  });

  const baseRecipe = DEFAULT_PRESET_RECIPES[0];

  it('renders recipe info, formatted clock, and chassis metrics (read-only when no onChangeDose)', () => {
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

  it('allows inline editing of dose and calls onChangeDose on commit (blur or submit)', () => {
    const onChangeDose = vi.fn();

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
        onChangeDose={onChangeDose}
      />
    );

    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(doseInput.value).toBe('18');

    fireEvent.change(doseInput, { target: { value: '20.5' } });
    expect(doseInput.value).toBe('20.5');
    // Not committed yet before blur/submit
    expect(onChangeDose).not.toHaveBeenCalled();

    fireEvent.blur(doseInput);
    expect(onChangeDose).toHaveBeenCalledWith(20.5);
  });

  it('calls onChangeDose on Enter key submit', () => {
    const onChangeDose = vi.fn();

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
        onChangeDose={onChangeDose}
      />
    );

    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    fireEvent.change(doseInput, { target: { value: '22' } });
    fireEvent.keyDown(doseInput, { key: 'Enter' });
    expect(onChangeDose).toHaveBeenCalledWith(22);
  });

  it('resets to current dose if empty or non-positive input is blurred', () => {
    const onChangeDose = vi.fn();

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
        onChangeDose={onChangeDose}
      />
    );

    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    fireEvent.change(doseInput, { target: { value: '' } });
    fireEvent.blur(doseInput);

    expect(doseInput.value).toBe('18');
    expect(onChangeDose).not.toHaveBeenCalled();

    fireEvent.change(doseInput, { target: { value: '-5' } });
    fireEvent.blur(doseInput);

    expect(doseInput.value).toBe('18');
    expect(onChangeDose).not.toHaveBeenCalled();
  });

  it('clamps input within limits (1g - 100g) on commit', () => {
    const onChangeDose = vi.fn();

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
        onChangeDose={onChangeDose}
      />
    );

    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;

    // Test upper bound clamp
    fireEvent.change(doseInput, { target: { value: '150' } });
    fireEvent.blur(doseInput);
    expect(onChangeDose).toHaveBeenCalledWith(100);
    expect(doseInput.value).toBe('100');

    // Test lower bound clamp
    fireEvent.change(doseInput, { target: { value: '0.2' } });
    fireEvent.blur(doseInput);
    expect(onChangeDose).toHaveBeenCalledWith(1);
    expect(doseInput.value).toBe('1');
  });

  it('locks dose to read-only when timer is running', () => {
    const onChangeDose = vi.fn();

    const { getByText, queryByLabelText } = render(
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
        onChangeDose={onChangeDose}
      />
    );

    expect(queryByLabelText('Timer coffee dose in grams')).toBeNull();
    expect(getByText('18g')).toBeDefined();
  });

  it('locks dose to read-only and displays RESET on primary button when isFinished is true', () => {
    const onToggleTimer = vi.fn();
    const onReset = vi.fn();
    const onChangeDose = vi.fn();

    const { getByText, getByLabelText, queryByText, queryByLabelText } = render(
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
        onChangeDose={onChangeDose}
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

    // Dose is read-only when finished
    expect(queryByLabelText('Timer coffee dose in grams')).toBeNull();
    expect(getByText('30g')).toBeDefined();
  });

  it('syncs local input text when doseGrams prop updates externally', () => {
    const { getByLabelText, rerender } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={0}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={15}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={0}
        onChangeDose={vi.fn()}
      />
    );

    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(doseInput.value).toBe('15');

    rerender(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={0}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={22}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={0}
        onChangeDose={vi.fn()}
      />
    );

    expect(doseInput.value).toBe('22');
  });

  describe('Free Brew Mode', () => {
    it('renders FREE BREW · MANUAL STOPWATCH subtitle and RATIO / SPLITS metrics', () => {
      const { getByText, queryByText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={45}
          isRunning={true}
          isMuted={false}
          currentStageTargetWater={0}
          doseGrams={15}
          onToggleTimer={vi.fn()}
          onReset={vi.fn()}
          onToggleMute={vi.fn()}
          totalProgress={0}
          mode="free_brew"
          splitsCount={3}
        />
      );

      expect(getByText('FREE BREW · MANUAL STOPWATCH')).toBeDefined();
      expect(getByText('RATIO')).toBeDefined();
      expect(getByText(/1:16.67/)).toBeDefined();
      expect(getByText('SPLITS')).toBeDefined();
      expect(getByText('3')).toBeDefined();
      expect(queryByText('WATER TARGET')).toBeNull();
      expect(queryByText('POUR TO')).toBeNull();
    });

    it('renders quick tag chips and invokes onTagSplit when pressed', () => {
      const onTagSplit = vi.fn();

      const { getByText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={30}
          isRunning={true}
          isMuted={false}
          currentStageTargetWater={0}
          doseGrams={15}
          onToggleTimer={vi.fn()}
          onReset={vi.fn()}
          onToggleMute={vi.fn()}
          totalProgress={0}
          mode="free_brew"
          onTagSplit={onTagSplit}
        />
      );

      const bloomChip = getByText('+ BLOOM');
      const pour1Chip = getByText('+ POUR 1');
      const pour2Chip = getByText('+ POUR 2');
      const drawdownChip = getByText('+ DRAWDOWN');

      expect(bloomChip).toBeDefined();
      expect(pour1Chip).toBeDefined();
      expect(pour2Chip).toBeDefined();
      expect(drawdownChip).toBeDefined();

      fireEvent.click(bloomChip);
      expect(onTagSplit).toHaveBeenCalledWith('bloom', 'Bloom');

      fireEvent.click(pour1Chip);
      expect(onTagSplit).toHaveBeenCalledWith('pour', 'Pour 1');

      fireEvent.click(pour2Chip);
      expect(onTagSplit).toHaveBeenCalledWith('pour', 'Pour 2');

      fireEvent.click(drawdownChip);
      expect(onTagSplit).toHaveBeenCalledWith('drawdown', 'Drawdown');
    });

    it('renders SPLIT button when running and calls onSplit when clicked', () => {
      const onSplit = vi.fn();

      const { getByText, queryByText, rerender } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={30}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={0}
          doseGrams={15}
          onToggleTimer={vi.fn()}
          onReset={vi.fn()}
          onToggleMute={vi.fn()}
          totalProgress={0}
          mode="free_brew"
          onSplit={onSplit}
        />
      );

      // SPLIT button not rendered when idle
      expect(queryByText('SPLIT')).toBeNull();

      // Render while running
      rerender(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={30}
          isRunning={true}
          isMuted={false}
          currentStageTargetWater={0}
          doseGrams={15}
          onToggleTimer={vi.fn()}
          onReset={vi.fn()}
          onToggleMute={vi.fn()}
          totalProgress={0}
          mode="free_brew"
          onSplit={onSplit}
        />
      );

      const splitBtn = getByText('SPLIT');
      expect(splitBtn).toBeDefined();
      fireEvent.click(splitBtn);
      expect(onSplit).toHaveBeenCalledTimes(1);
    });

    it('renders FINISH BREW button when running or started and calls onFinish', () => {
      const onFinish = vi.fn();

      const { getByText, queryByText, rerender } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={0}
          doseGrams={15}
          onToggleTimer={vi.fn()}
          onReset={vi.fn()}
          onToggleMute={vi.fn()}
          totalProgress={0}
          mode="free_brew"
          onFinish={onFinish}
        />
      );

      // Not visible before start
      expect(queryByText('FINISH BREW')).toBeNull();

      // Visible when running
      rerender(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={15}
          isRunning={true}
          isMuted={false}
          currentStageTargetWater={0}
          doseGrams={15}
          onToggleTimer={vi.fn()}
          onReset={vi.fn()}
          onToggleMute={vi.fn()}
          totalProgress={0}
          mode="free_brew"
          onFinish={onFinish}
        />
      );

      const finishBtn = getByText('FINISH BREW');
      expect(finishBtn).toBeDefined();
      fireEvent.click(finishBtn);
      expect(onFinish).toHaveBeenCalledTimes(1);
    });
  });
});

