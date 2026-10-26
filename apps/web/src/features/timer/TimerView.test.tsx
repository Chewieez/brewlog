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
        initialMode="recipe"
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
      name: /ADD REVIEW/,
    });
    expect(completeBtn).toBeDefined();
    expect(screen.getByText('ADD REVIEW')).toBeDefined();

    act(() => {
      fireEvent.click(completeBtn);
    });
    expect(handleLog).toHaveBeenCalledTimes(1);
  });

  it('switches between Guided Recipe and Free Brew modes', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="recipe"
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
        initialMode="recipe"
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

  it('finishes Free Brew, presents review and custom recipe save actions', () => {
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
      fireEvent.click(screen.getByRole('button', { name: /\+ BLOOM/i }));
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
    const addReviewBtn = screen.getByRole('button', {
      name: /ADD REVIEW/i,
    });
    const saveRecipeBtn = screen.getByRole('button', {
      name: /SAVE AS CUSTOM RECIPE/i,
    });

    expect(addReviewBtn).toBeDefined();
    expect(saveRecipeBtn).toBeDefined();

    act(() => {
      fireEvent.click(saveRecipeBtn);
    });
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave.mock.calls[0][0].stages).toHaveLength(1);

    act(() => {
      fireEvent.click(addReviewBtn);
    });
    expect(handleLog).toHaveBeenCalledTimes(1);
  });

  it('adopts translated dose, solved ratio, and target water when applied from translator', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="free_brew"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    // Initial Free Brew starting ratio is 1:16 and target water is 320g
    const initialRatioInput = screen.getByLabelText(/Timer brew ratio/i) as HTMLInputElement;
    expect(initialRatioInput.value).toBe('16');
    const waterInput = screen.getByLabelText(/Timer water target in grams/i) as HTMLInputElement;
    expect(waterInput.value).toBe('320');

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

    // Ratio should now be 15 and water target should be 300g
    const ratioInput = screen.getByLabelText(/Timer brew ratio/i) as HTMLInputElement;
    expect(ratioInput.value).toBe('15');
    expect(waterInput.value).toBe('300');
    const doseInput = screen.getByLabelText(/Timer coffee dose in grams/i) as HTMLInputElement;
    expect(doseInput.value).toBe('20');
  });

  it('opens in free_brew mode by default on cold start when uninitialized', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    expect(screen.getByText('MANUAL STOPWATCH')).toBeDefined();
    expect(screen.getByText(/SPLIT LOG/i)).toBeDefined();
  });

  it('formats telemetry metrics in imperial units when weightUnit="imperial"', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="recipe"
        weightUnit="imperial"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    expect(screen.getAllByText(/oz/i).length).toBeGreaterThan(0);
    const doseInput = screen.getByLabelText(/Timer coffee dose in ounces/i) as HTMLInputElement;
    expect(doseInput.value).toBe('0.53'); // 15g
    expect(doseInput.getAttribute('min')).toBe('0.05');
    expect(doseInput.getAttribute('max')).toBe('7');

    const waterInput = screen.getByLabelText(/Timer water target in ounces/i) as HTMLInputElement;
    expect(waterInput.value).toBe('8.82'); // 250g
    expect(waterInput.getAttribute('min')).toBe('1');
    expect(waterInput.getAttribute('max')).toBe('100');
    expect(screen.getAllByText('1.76 oz').length).toBeGreaterThan(0); // 50g stage water
  });

  it('allows inline editing of coffee dose and water target when idle', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="free_brew"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    const doseInput = screen.getByLabelText(/Timer coffee dose in grams/i) as HTMLInputElement;
    const waterInput = screen.getByLabelText(/Timer water target in grams/i) as HTMLInputElement;
    const ratioInput = screen.getByLabelText(/Timer brew ratio/i) as HTMLInputElement;

    expect(doseInput.value).toBe('20');
    expect(doseInput.getAttribute('min')).toBe('1');
    expect(doseInput.getAttribute('max')).toBe('200');
    expect(waterInput.value).toBe('320');
    expect(waterInput.getAttribute('min')).toBe('10');
    expect(waterInput.getAttribute('max')).toBe('3000');
    expect(ratioInput.value).toBe('16');
    expect(screen.getByText('1:')).toBeDefined();

    // Inline edit dose to 25g
    act(() => {
      fireEvent.change(doseInput, { target: { value: '25' } });
      fireEvent.blur(doseInput);
    });

    expect(doseInput.value).toBe('25');
    // When dose changes to 25g, water rescales proportionally with ratio 16 -> 400g
    expect(waterInput.value).toBe('400');
    expect(ratioInput.value).toBe('16');

    // Inline edit water to 350g
    act(() => {
      fireEvent.change(waterInput, { target: { value: '350' } });
      fireEvent.blur(waterInput);
    });

    expect(waterInput.value).toBe('350');
    // In free brew, updating water target recalculates ratio: 350 / 25 = 14
    expect(ratioInput.value).toBe('14');
  });

  it('allows inline editing of ratio in Free Brew mode and changes only coffee dose', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="free_brew"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    const doseInput = screen.getByLabelText(/Timer coffee dose in grams/i) as HTMLInputElement;
    const waterInput = screen.getByLabelText(/Timer water target in grams/i) as HTMLInputElement;
    const ratioInput = screen.getByLabelText(/Timer brew ratio/i) as HTMLInputElement;

    expect(doseInput.value).toBe('20');
    expect(waterInput.value).toBe('320');
    expect(ratioInput.value).toBe('16');

    // Inline edit ratio to 15
    act(() => {
      fireEvent.change(ratioInput, { target: { value: '15' } });
      fireEvent.blur(ratioInput);
    });

    expect(ratioInput.value).toBe('15');
    // Water remains fixed at 320g
    expect(waterInput.value).toBe('320');
    // calculateCoffeeDose(320, 15) = 21.3g
    expect(doseInput.value).toBe('21.3');

    // Ratio also reverts on Escape
    act(() => {
      fireEvent.change(ratioInput, { target: { value: '18' } });
      fireEvent.keyDown(ratioInput, { key: 'Escape' });
    });

    expect(ratioInput.value).toBe('15');
  });

  it('locks dose and water readouts to static text during active and paused brews', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="recipe"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    // Initial state: inputs should be editable
    expect(screen.queryByLabelText(/Timer coffee dose in grams/i)).not.toBeNull();
    expect(screen.queryByLabelText(/Timer water target in grams/i)).not.toBeNull();

    // Start timer (active brew: isRunning = true, elapsedSeconds = 0)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /START BREW/ }));
    });

    // During active brew, readouts must switch to static text
    expect(screen.queryByLabelText(/Timer coffee dose in grams/i)).toBeNull();
    expect(screen.queryByLabelText(/Timer water target in grams/i)).toBeNull();
    expect(screen.getByText('15.0 g')).toBeDefined();
    expect(screen.getByText('250.0 g')).toBeDefined();

    // Advance 1s mid-brew (active brew: isRunning = true, elapsedSeconds = 1)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByLabelText(/Timer coffee dose in grams/i)).toBeNull();
    expect(screen.queryByLabelText(/Timer water target in grams/i)).toBeNull();

    // Pause timer mid-brew (paused brew: isRunning = false, elapsedSeconds = 1)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /PAUSE/ }));
    });

    expect(screen.getByRole('button', { name: /RESUME/ })).toBeDefined();

    // Readouts must still be locked to static text, no editable inputs
    expect(screen.queryByLabelText(/Timer coffee dose in grams/i)).toBeNull();
    expect(screen.queryByLabelText(/Timer water target in grams/i)).toBeNull();
    expect(screen.getByText('15.0 g')).toBeDefined();
    expect(screen.getByText('250.0 g')).toBeDefined();

    // Reset timer back to idle state
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Reset Timer/i }));
    });

    // Inputs should become editable again
    expect(screen.queryByLabelText(/Timer coffee dose in grams/i)).not.toBeNull();
    expect(screen.queryByLabelText(/Timer water target in grams/i)).not.toBeNull();
  });

  it('reverts inline edits on Escape key press without committing changes', () => {
    render(
      <TimerView
        recipe={mockRecipe}
        initialMode="free_brew"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    const doseInput = screen.getByLabelText(/Timer coffee dose in grams/i) as HTMLInputElement;
    const waterInput = screen.getByLabelText(/Timer water target in grams/i) as HTMLInputElement;
    const ratioInput = screen.getByLabelText(/Timer brew ratio/i) as HTMLInputElement;

    expect(doseInput.value).toBe('20');
    expect(waterInput.value).toBe('320');
    expect(ratioInput.value).toBe('16');

    // Change dose input then press Escape
    act(() => {
      fireEvent.change(doseInput, { target: { value: '25' } });
      fireEvent.keyDown(doseInput, { key: 'Escape' });
    });

    // Dose should have reverted to 20 and water remained 320
    expect(doseInput.value).toBe('20');
    expect(waterInput.value).toBe('320');
    expect(ratioInput.value).toBe('16');

    // Change water input then press Escape
    act(() => {
      fireEvent.change(waterInput, { target: { value: '450' } });
      fireEvent.keyDown(waterInput, { key: 'Escape' });
    });

    // Water should have reverted to 320 and dose remained 20
    expect(waterInput.value).toBe('320');
    expect(doseInput.value).toBe('20');
    expect(ratioInput.value).toBe('16');
  });

  it('prevents imperial precision drift on blur and Escape in imperial mode (e.g. 18g -> 0.63 oz invariance)', () => {
    const recipeWith18gDose: BrewRecipe = {
      ...mockRecipe,
      id: 'test-18g-v60',
      coffeeDoseGrams: 18,
      waterAmountGrams: 300,
      ratio: 16.67,
    };

    render(
      <TimerView
        recipe={recipeWith18gDose}
        initialMode="recipe"
        weightUnit="imperial"
        onSelectOtherRecipe={vi.fn()}
        onLogCompletedBrew={vi.fn()}
      />
    );

    const doseInput = screen.getByLabelText(/Timer coffee dose in ounces/i) as HTMLInputElement;
    const waterInput = screen.getByLabelText(/Timer water target in ounces/i) as HTMLInputElement;

    // 18g = 0.63 oz; without guard, ozToGrams(0.63) = 17.86g -> rounds to 17.9g (precision drift)
    expect(doseInput.value).toBe('0.63');
    expect(waterInput.value).toBe('10.58'); // 300g

    // Focus and blur dose without changing value (must not drift from 18.0g to 17.9g)
    act(() => {
      fireEvent.focus(doseInput);
      fireEvent.blur(doseInput);
    });

    expect(doseInput.value).toBe('0.63');
    expect(waterInput.value).toBe('10.58');

    // Focus and blur water target without changing value
    act(() => {
      fireEvent.focus(waterInput);
      fireEvent.blur(waterInput);
    });

    expect(waterInput.value).toBe('10.58');
    expect(doseInput.value).toBe('0.63');

    // Change dose then press Escape (must restore 0.63 without drifting dose to 17.9g)
    act(() => {
      fireEvent.change(doseInput, { target: { value: '0.85' } });
      fireEvent.keyDown(doseInput, { key: 'Escape' });
    });

    expect(doseInput.value).toBe('0.63');
    expect(waterInput.value).toBe('10.58');

    // Change water target then press Escape (must restore 10.58 without drift)
    act(() => {
      fireEvent.change(waterInput, { target: { value: '14.0' } });
      fireEvent.keyDown(waterInput, { key: 'Escape' });
    });

    expect(waterInput.value).toBe('10.58');
    expect(doseInput.value).toBe('0.63');
  });
});
