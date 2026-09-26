/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { TimerView } from './TimerView';
import { BrewRecipe } from '@brewlog/core';

vi.mock('../../lib/audio', () => ({
  coffeeAudio: {
    unlock: vi.fn(),
    playTick: vi.fn(),
    playStageChime: vi.fn(),
    playCompletionFanfare: vi.fn(),
  },
}));

const mockRecipe: BrewRecipe = {
  id: 'test-v60',
  name: 'Test V60',
  brewMethod: 'v60',
  description: 'Test description',
  coffeeDoseGrams: 15,
  waterAmountGrams: 250,
  ratio: 16.67,
  grindSize: 'Medium-Fine',
  waterTempCelsius: 94,
  totalTimeSeconds: 2,
  isPreset: true,
  createdAt: '2026-09-01T12:00:00.000Z',
  stages: [
    {
      id: 'stage-1',
      name: 'Bloom',
      startSecond: 0,
      durationSeconds: 2,
      targetWaterWeightGrams: 50,
      instruction: 'Pour 50g water',
      stageType: 'bloom',
    },
  ],
};

describe('TimerView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      cleanup();
    });
    vi.useRealTimers();
  });

  it('renders START BREW, PAUSE, and RESUME buttons with exact uppercase text', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    // Initial state
    const timerBtn = screen.getByRole('button', { name: /START BREW/ });
    expect(timerBtn).toBeDefined();
    expect(timerBtn.textContent).toContain('START BREW');

    // Click to start -> PAUSE
    act(() => {
      fireEvent.click(timerBtn);
    });
    expect(screen.getByRole('button', { name: /PAUSE/ })).toBeDefined();
    expect(screen.getByText('PAUSE')).toBeDefined();

    // Advance time by 1s so elapsedSeconds > 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Click to pause -> RESUME
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /PAUSE/ }));
    });
    expect(screen.getByRole('button', { name: /RESUME/ })).toBeDefined();
    expect(screen.getByText('RESUME')).toBeDefined();
  });

  it('renders uppercase BREW COMPLETE button when timer finishes', () => {
    const handleLog = vi.fn();
    render(
      <TimerView
        recipe={mockRecipe}
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={handleLog}
      />
    );

    // Start timer
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /START BREW/ }));
    });

    // Advance time past totalTimeSeconds (2s)
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const completeBtn = screen.getByRole('button', {
      name: /BREW COMPLETE! RATE & LOG TO CUPPING SHEET/,
    });
    expect(completeBtn).toBeDefined();
    expect(screen.getByText('BREW COMPLETE! RATE & LOG TO CUPPING SHEET')).toBeDefined();

    act(() => {
      fireEvent.click(completeBtn);
    });
    expect(handleLog).toHaveBeenCalledTimes(1);
  });

  it('switches between Guided Recipe and Free Brew modes', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    const guidedBtn = screen.getByRole('button', { name: /GUIDED RECIPE/i });
    const freeBrewBtn = screen.getByRole('button', { name: /FREE BREW/i });

    expect(guidedBtn).toBeDefined();
    expect(freeBrewBtn).toBeDefined();

    // Initially in recipe mode: shows POUR TIMELINE
    expect(screen.getByText(/POUR TIMELINE/i)).toBeDefined();

    // Switch to Free Brew mode
    act(() => {
      fireEvent.click(freeBrewBtn);
    });

    expect(screen.getByText(/SPLIT LOG/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /^SPLIT$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /\+ BLOOM/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /\+ POUR 1/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /\+ DRAWDOWN/i })).toBeDefined();
  });

  it('records and removes splits in Free Brew mode', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="free_brew"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    // Start timer
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /START BREW/i }));
    });

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Record Bloom split via quick tag
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /\+ BLOOM/i }));
    });

    expect(screen.getByText('Bloom')).toBeDefined();

    // Record second split via SPLIT button
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^SPLIT$/i }));
    });

    expect(screen.getByText('Split 2')).toBeDefined();

    // Remove the first split
    const removeBtns = screen.getAllByRole('button', { name: /Remove split/i });
    expect(removeBtns.length).toBe(2);
    act(() => {
      fireEvent.click(removeBtns[0]);
    });

    expect(screen.queryByText('Bloom')).toBeNull();
    expect(screen.getByText('Split 2')).toBeDefined();
  });

  it('prompts confirmation when switching mode during an active brew', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(
      <TimerView
        recipe={mockRecipe}
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    // Start timer in recipe mode
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /START BREW/i }));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Attempt to switch to free brew, user cancels
    confirmSpy.mockReturnValueOnce(false);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /FREE BREW/i }));
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // Still in recipe mode
    expect(screen.getByText(/POUR TIMELINE/i)).toBeDefined();

    // Attempt to switch, user confirms
    confirmSpy.mockReturnValueOnce(true);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /FREE BREW/i }));
    });

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    // Now switched to Free Brew mode
    expect(screen.getByText(/SPLIT LOG/i)).toBeDefined();
    confirmSpy.mockRestore();
  });

  it('finishes Free Brew, presents cupping log and custom recipe save actions', () => {
    const handleLog = vi.fn();
    const handleSave = vi.fn();

    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="free_brew"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={handleLog}
        onSaveAsRecipe={handleSave}
      />
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /START BREW/i }));
    });
    act(() => {
      vi.advanceTimersByTime(45000);
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /\+ Bloom/i }));
    });

    // Finish brew
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /FINISH BREW/i }));
    });

    // Main action button should now show BREW COMPLETE and be disabled
    const brewCompleteBtn = screen.getByRole('button', { name: /^BREW COMPLETE$/i });
    expect(brewCompleteBtn).toHaveProperty('disabled', true);

    // Split button should not be rendered post-finish
    expect(screen.queryByRole('button', { name: /^SPLIT$/i })).toBeNull();

    // Both action buttons should be visible
    const cuppingBtn = screen.getByRole('button', {
      name: /RATE & LOG TO CUPPING SHEET/i,
    });
    const saveRecipeBtn = screen.getByRole('button', {
      name: /SAVE AS CUSTOM RECIPE/i,
    });

    expect(cuppingBtn).toBeDefined();
    expect(saveRecipeBtn).toBeDefined();

    act(() => {
      fireEvent.click(saveRecipeBtn);
    });
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave.mock.calls[0][0].stages).toHaveLength(1);

    act(() => {
      fireEvent.click(cuppingBtn);
    });
    expect(handleLog).toHaveBeenCalledTimes(1);
  });

  it('adopts translated dose, solved ratio, and target water when applied from translator', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    // Initial recipe ratio is 16.67 and target water is 250g
    expect(screen.getByText('1:16.67')).toBeDefined();
    expect(screen.getByText('250g')).toBeDefined();

    // Open translator
    act(() => {
      fireEvent.click(screen.getByText(/RATIO CALCULATOR/i));
    });

    const sourceCoffee = screen.getByLabelText(/source coffee/i);
    const sourceWater = screen.getByLabelText(/source water/i);
    const targetCoffee = screen.getByLabelText(/target coffee/i);

    // Set source to 20:300 (ratio 15) and target coffee to 20g -> target water 300g
    act(() => {
      fireEvent.change(sourceCoffee, { target: { value: '20' } });
      fireEvent.change(sourceWater, { target: { value: '300' } });
      fireEvent.change(targetCoffee, { target: { value: '20' } });
    });

    // Apply to timer
    act(() => {
      fireEvent.click(screen.getByText(/APPLY DOSE/i));
    });

    // Ratio should now be 1:15 and water target should be 300g
    expect(screen.getByText('1:15')).toBeDefined();
    expect(screen.getAllByText('300g').length).toBeGreaterThan(0);
    const doseInput = screen.getByLabelText(/Coffee dose in grams/i) as HTMLInputElement;
    expect(doseInput.value).toBe('20');
  });
});
