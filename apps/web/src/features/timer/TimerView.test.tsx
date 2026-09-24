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
});
