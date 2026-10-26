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
    expect(getByText('30.0 g')).toBeDefined();
    expect(getByText('500.0 g')).toBeDefined();
    expect(getByText('300.0 g')).toBeDefined();
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

  it('clamps input within limits (1g - 200g) on commit', () => {
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
    fireEvent.change(doseInput, { target: { value: '250' } });
    fireEvent.blur(doseInput);
    expect(onChangeDose).toHaveBeenCalledWith(200);
    expect(doseInput.value).toBe('200');

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
    expect(getByText('18.0 g')).toBeDefined();
  });

  it('locks dose to read-only when timer is paused mid-brew (elapsedSeconds > 0, isRunning = false)', () => {
    const onChangeDose = vi.fn();

    const { getByText, queryByLabelText } = render(
      <TimerHero
        recipe={baseRecipe}
        elapsedSeconds={15}
        isRunning={false}
        isMuted={false}
        currentStageTargetWater={60}
        doseGrams={18}
        onToggleTimer={vi.fn()}
        onReset={vi.fn()}
        onToggleMute={vi.fn()}
        totalProgress={15}
        onChangeDose={onChangeDose}
      />
    );

    expect(queryByLabelText('Timer coffee dose in grams')).toBeNull();
    expect(getByText('18.0 g')).toBeDefined();
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
    expect(getByText('30.0 g')).toBeDefined();
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

  describe('Water Target inline editing', () => {
    it('allows inline editing of water target and calls onChangeWater on commit (blur)', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
        />
      );

      const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
      expect(waterInput.value).toBe('500');

      fireEvent.change(waterInput, { target: { value: '450' } });
      expect(waterInput.value).toBe('450');
      expect(onChangeWater).not.toHaveBeenCalled();

      fireEvent.blur(waterInput);
      expect(onChangeWater).toHaveBeenCalledWith(450);
    });

    it('calls onChangeWater on Enter key submit', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
        />
      );

      const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
      fireEvent.change(waterInput, { target: { value: '350' } });
      fireEvent.keyDown(waterInput, { key: 'Enter' });

      expect(onChangeWater).toHaveBeenCalledWith(350);
    });

    it('resets to current water target if empty or non-positive input is blurred', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
        />
      );

      const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
      fireEvent.change(waterInput, { target: { value: '' } });
      fireEvent.blur(waterInput);

      expect(waterInput.value).toBe('500');
      expect(onChangeWater).not.toHaveBeenCalled();

      fireEvent.change(waterInput, { target: { value: '-10' } });
      fireEvent.blur(waterInput);

      expect(waterInput.value).toBe('500');
      expect(onChangeWater).not.toHaveBeenCalled();
    });

    it('clamps water target input within limits (10g - 3000g) on commit', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
        />
      );

      const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;

      // Upper bound clamp
      fireEvent.change(waterInput, { target: { value: '5000' } });
      fireEvent.blur(waterInput);
      expect(onChangeWater).toHaveBeenCalledWith(3000);
      expect(waterInput.value).toBe('3000');

      // Lower bound clamp
      fireEvent.change(waterInput, { target: { value: '5' } });
      fireEvent.blur(waterInput);
      expect(onChangeWater).toHaveBeenCalledWith(10);
      expect(waterInput.value).toBe('10');
    });

    it('locks water target to read-only when running, paused mid-brew, or finished', () => {
      const onChangeWater = vi.fn();

      // Running
      const { getByText, queryByLabelText, rerender } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={10}
          isRunning={true}
          isMuted={false}
          currentStageTargetWater={60}
          onChangeWater={onChangeWater}
        />
      );

      expect(queryByLabelText('Timer water target in grams')).toBeNull();
      expect(getByText('500.0 g')).toBeDefined();

      // Paused mid-brew
      rerender(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={15}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          onChangeWater={onChangeWater}
        />
      );
      expect(queryByLabelText('Timer water target in grams')).toBeNull();

      // Finished
      rerender(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={200}
          isRunning={false}
          isFinished={true}
          isMuted={false}
          currentStageTargetWater={60}
          onChangeWater={onChangeWater}
        />
      );
      expect(queryByLabelText('Timer water target in grams')).toBeNull();
    });

    it('syncs local input text when recipe.waterAmountGrams updates externally', () => {
      const { getByLabelText, rerender } = render(
        <TimerHero
          recipe={{ ...baseRecipe, waterAmountGrams: 300 }}
          elapsedSeconds={0}
          isRunning={false}
          onChangeWater={vi.fn()}
        />
      );

      const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
      expect(waterInput.value).toBe('300');

      rerender(
        <TimerHero
          recipe={{ ...baseRecipe, waterAmountGrams: 420 }}
          elapsedSeconds={0}
          isRunning={false}
          onChangeWater={vi.fn()}
        />
      );

      expect(waterInput.value).toBe('420');
    });
  });

  describe('Free Brew Mode', () => {
    it('renders MANUAL STOPWATCH subtitle and RATIO / WATER TARGET metrics', () => {
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
        />
      );

      expect(getByText('MANUAL STOPWATCH')).toBeDefined();
      expect(getByText('WATER TARGET')).toBeDefined();
      expect(getByText('500.0 g')).toBeDefined();
      expect(getByText('RATIO')).toBeDefined();
      expect(getByText(/1:16.67/)).toBeDefined();
      expect(queryByText('SPLITS')).toBeNull();
      expect(queryByText('POUR TO')).toBeNull();
    });

    it('renders quick tag chips and invokes onTagSplit when pressed', () => {
      const onTagSplit = vi.fn();

      const { getByText, getByLabelText } = render(
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

      const bloomChip = getByLabelText('Record Bloom split');
      const pour1Chip = getByLabelText('Record Pour 1 split');
      const pour2Chip = getByLabelText('Record Pour 2 split');
      const drawdownChip = getByLabelText('Record Drawdown split');

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

    describe('Ratio inline editing', () => {
      it('allows inline editing of ratio in free brew mode and calls onChangeRatio on commit (blur)', () => {
        const onChangeRatio = vi.fn();

        const { getByLabelText } = render(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={0}
            isRunning={false}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );

        const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
        expect(ratioInput.value).toBe('16.7');

        fireEvent.change(ratioInput, { target: { value: '15' } });
        expect(ratioInput.value).toBe('15');
        expect(onChangeRatio).not.toHaveBeenCalled();

        fireEvent.blur(ratioInput);
        expect(onChangeRatio).toHaveBeenCalledWith(15);
      });

      it('calls onChangeRatio on Enter key submit', () => {
        const onChangeRatio = vi.fn();

        const { getByLabelText } = render(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={0}
            isRunning={false}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );

        const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
        fireEvent.change(ratioInput, { target: { value: '17.5' } });
        fireEvent.keyDown(ratioInput, { key: 'Enter' });

        expect(onChangeRatio).toHaveBeenCalledWith(17.5);
      });

      it('resets to current ratio if empty or non-positive input is blurred', () => {
        const onChangeRatio = vi.fn();

        const { getByLabelText } = render(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={0}
            isRunning={false}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );

        const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
        fireEvent.change(ratioInput, { target: { value: '' } });
        fireEvent.blur(ratioInput);

        expect(ratioInput.value).toBe('16.7');
        expect(onChangeRatio).not.toHaveBeenCalled();

        fireEvent.change(ratioInput, { target: { value: '-2' } });
        fireEvent.blur(ratioInput);

        expect(ratioInput.value).toBe('16.7');
        expect(onChangeRatio).not.toHaveBeenCalled();
      });

      it('clamps ratio input within limits (1.0 - 30.0) on commit', () => {
        const onChangeRatio = vi.fn();

        const { getByLabelText } = render(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={0}
            isRunning={false}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );

        const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;

        // Upper clamp
        fireEvent.change(ratioInput, { target: { value: '45' } });
        fireEvent.blur(ratioInput);
        expect(onChangeRatio).toHaveBeenCalledWith(30);
        expect(ratioInput.value).toBe('30');

        // Lower clamp
        fireEvent.change(ratioInput, { target: { value: '0.5' } });
        fireEvent.blur(ratioInput);
        expect(onChangeRatio).toHaveBeenCalledWith(1);
        expect(ratioInput.value).toBe('1');
      });

      it('locks ratio to read-only when timer is running, paused mid-brew, or finished', () => {
        const onChangeRatio = vi.fn();

        // Running
        const { getByText, queryByLabelText, rerender } = render(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={20}
            isRunning={true}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );

        expect(queryByLabelText('Timer brew ratio')).toBeNull();
        expect(getByText('1:16.67')).toBeDefined();

        // Paused mid-brew
        rerender(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={20}
            isRunning={false}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );
        expect(queryByLabelText('Timer brew ratio')).toBeNull();

        // Finished
        rerender(
          <TimerHero
            recipe={baseRecipe}
            elapsedSeconds={120}
            isRunning={false}
            isFinished={true}
            isMuted={false}
            currentStageTargetWater={0}
            doseGrams={15}
            mode="free_brew"
            onChangeRatio={onChangeRatio}
          />
        );
        expect(queryByLabelText('Timer brew ratio')).toBeNull();
      });

      it('syncs local input text when recipe.ratio updates externally', () => {
        const { getByLabelText, rerender } = render(
          <TimerHero
            recipe={{ ...baseRecipe, ratio: 15 }}
            elapsedSeconds={0}
            isRunning={false}
            mode="free_brew"
            onChangeRatio={vi.fn()}
          />
        );

        const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
        expect(ratioInput.value).toBe('15');

        rerender(
          <TimerHero
            recipe={{ ...baseRecipe, ratio: 18 }}
            elapsedSeconds={0}
            isRunning={false}
            mode="free_brew"
            onChangeRatio={vi.fn()}
          />
        );

        expect(ratioInput.value).toBe('18');
      });
    });
  });

  describe('weightUnit formatting', () => {
    it('formats metrics in imperial ounces when weightUnit="imperial"', () => {
      const { getByText, getAllByText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={30}
          weightUnit="imperial"
        />
      );

      expect(getAllByText(/oz/i).length).toBeGreaterThan(0);
      expect(getByText('1.06 oz')).toBeDefined();
      expect(getByText('17.64 oz')).toBeDefined();
      expect(getByText('2.12 oz')).toBeDefined();
    });

    it('renders editable dose in ounces with oz label when weightUnit="imperial"', () => {
      const onChangeDose = vi.fn();

      const { getByLabelText, getByText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeDose={onChangeDose}
          weightUnit="imperial"
        />
      );

      const doseInput = getByLabelText('Timer coffee dose in ounces') as HTMLInputElement;
      expect(doseInput.value).toBe('0.63');
      expect(getByText('oz')).toBeDefined();
    });

    it('converts edited ounces to grams and calls onChangeDose on commit', () => {
      const onChangeDose = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeDose={onChangeDose}
          weightUnit="imperial"
        />
      );

      const doseInput = getByLabelText('Timer coffee dose in ounces') as HTMLInputElement;
      fireEvent.change(doseInput, { target: { value: '1.0' } });
      fireEvent.blur(doseInput);

      // ozToGrams(1.0) = 28.3g
      expect(onChangeDose).toHaveBeenCalledWith(28.3);
      expect(doseInput.value).toBe('1');
    });

    it('does not trigger onChangeDose or conversion drift when blurring unchanged ounces', () => {
      const onChangeDose = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeDose={onChangeDose}
          weightUnit="imperial"
        />
      );

      const doseInput = getByLabelText('Timer coffee dose in ounces') as HTMLInputElement;
      expect(doseInput.value).toBe('0.63');

      // Blur without changing
      fireEvent.blur(doseInput);
      expect(onChangeDose).not.toHaveBeenCalled();
      expect(doseInput.value).toBe('0.63');
    });

    it('clamps imperial input within safe gram bounds on commit', () => {
      const onChangeDose = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeDose={onChangeDose}
          weightUnit="imperial"
        />
      );

      const doseInput = getByLabelText('Timer coffee dose in ounces') as HTMLInputElement;

      // 10 oz = 283.5g -> clamps to 200g -> gramsToOz(200) = 7.05 oz
      fireEvent.change(doseInput, { target: { value: '10' } });
      fireEvent.blur(doseInput);
      expect(onChangeDose).toHaveBeenCalledWith(200);
      expect(doseInput.value).toBe('7.05');
    });

    it('renders editable water target in ounces with oz label when weightUnit="imperial"', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText, getByText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
          weightUnit="imperial"
        />
      );

      const waterInput = getByLabelText('Timer water target in ounces') as HTMLInputElement;
      expect(waterInput.value).toBe('17.64');
      expect(getByText('oz')).toBeDefined();
    });

    it('converts edited water ounces to grams and calls onChangeWater on commit', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
          weightUnit="imperial"
        />
      );

      const waterInput = getByLabelText('Timer water target in ounces') as HTMLInputElement;
      fireEvent.change(waterInput, { target: { value: '10.0' } });
      fireEvent.blur(waterInput);

      // ozToGrams(10.0) = 283.5g -> Math.round = 284g
      expect(onChangeWater).toHaveBeenCalledWith(284);
      expect(waterInput.value).toBe('10.02');
    });

    it('does not trigger onChangeWater or conversion drift when blurring unchanged water ounces', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
          weightUnit="imperial"
        />
      );

      const waterInput = getByLabelText('Timer water target in ounces') as HTMLInputElement;
      expect(waterInput.value).toBe('17.64');

      // Blur without changing
      fireEvent.blur(waterInput);
      expect(onChangeWater).not.toHaveBeenCalled();
      expect(waterInput.value).toBe('17.64');
    });

    it('clamps imperial water input within safe gram bounds (10g - 3000g) on commit', () => {
      const onChangeWater = vi.fn();

      const { getByLabelText } = render(
        <TimerHero
          recipe={baseRecipe}
          elapsedSeconds={0}
          isRunning={false}
          isMuted={false}
          currentStageTargetWater={60}
          doseGrams={18}
          onChangeWater={onChangeWater}
          weightUnit="imperial"
        />
      );

      const waterInput = getByLabelText('Timer water target in ounces') as HTMLInputElement;

      // 150 oz = 4252.4g -> clamps to 3000g -> gramsToOz(3000) = 105.82 oz
      fireEvent.change(waterInput, { target: { value: '150' } });
      fireEvent.blur(waterInput);
      expect(onChangeWater).toHaveBeenCalledWith(3000);
      expect(waterInput.value).toBe('105.82');
    });
  });
});

