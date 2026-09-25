/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileBrewTimer } from './useMobileBrewTimer';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { mobileFeedback } from '../lib/mobileFeedback';

vi.mock('../lib/mobileFeedback', () => ({
  mobileFeedback: {
    triggerHapticCountdown: vi.fn(),
    triggerHapticStageTransition: vi.fn(),
    triggerHapticBrewComplete: vi.fn(),
    triggerHapticTap: vi.fn(),
    playChime: vi.fn(),
  },
}));

describe('useMobileBrewTimer', () => {
  const recipe = DEFAULT_PRESET_RECIPES[0]; // Ultimate V60 (James Hoffmann), 210s total

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with zero elapsed time and default stage', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.remainingSeconds).toBe(recipe.totalTimeSeconds);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.currentStageIndex).toBe(0);
    expect(result.current.currentStage.name).toBe(recipe.stages[0].name);
    expect(result.current.nextStage?.name).toBe(recipe.stages[1].name);
    expect(result.current.totalProgress).toBe(0);
    expect(result.current.stageProgress).toBe(0);
  });

  it('starts, pauses, and resumes timing', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));

    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);
    expect(mobileFeedback.triggerHapticTap).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(5);
    expect(result.current.remainingSeconds).toBe(recipe.totalTimeSeconds - 5);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedSeconds).toBe(5);

    // Advancing timers while paused should not advance elapsedSeconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsedSeconds).toBe(5);

    // Resume
    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsedSeconds).toBe(7);
  });

  it('resets timer back to zero and initial state', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.elapsedSeconds).toBe(10);

    act(() => {
      result.current.reset();
    });
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.remainingSeconds).toBe(recipe.totalTimeSeconds);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.currentStageIndex).toBe(0);
    expect(result.current.totalProgress).toBe(0);
    expect(result.current.stageProgress).toBe(0);
    expect(mobileFeedback.triggerHapticTap).toHaveBeenCalled();
  });

  it('advances stages across multi-stage recipe and triggers stage feedback', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));

    act(() => {
      result.current.start();
    });

    // At start (0s): stage 0 is Bloom (duration 45s, startSecond 0)
    // First second triggers stage 0 transition haptic & chime
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mobileFeedback.triggerHapticStageTransition).toHaveBeenCalled();
    expect(mobileFeedback.playChime).toHaveBeenCalledWith(false);

    // Advance to 42s (3s before stage 1 start at 45s) -> triggers countdown haptic
    act(() => {
      vi.advanceTimersByTime(42000);
    });
    expect(result.current.elapsedSeconds).toBe(42);
    expect(mobileFeedback.triggerHapticCountdown).toHaveBeenCalled();

    // Advance across boundary to 46s -> stage 1: Main Pour Phase 1 (60%)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.elapsedSeconds).toBe(46);
    expect(result.current.currentStageIndex).toBe(1);
    expect(result.current.currentStage.name).toBe(recipe.stages[1].name);
    expect(result.current.nextStage?.name).toBe(recipe.stages[2].name);

    // Advance to 76s -> stage 2: Main Pour Phase 2 (100%)
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(result.current.elapsedSeconds).toBe(76);
    expect(result.current.currentStageIndex).toBe(2);
    expect(result.current.currentStage.name).toBe(recipe.stages[2].name);
  });

  it('detects finish when reaching totalTimeSeconds', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(recipe.totalTimeSeconds * 1000);
    });

    expect(result.current.elapsedSeconds).toBe(recipe.totalTimeSeconds);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.totalProgress).toBe(100);
    expect(mobileFeedback.triggerHapticBrewComplete).toHaveBeenCalled();
  });

  it('supports toggleTimer and toggleMute controls', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));

    // toggleTimer starts when stopped
    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.isRunning).toBe(true);

    // toggleTimer pauses when running
    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.isRunning).toBe(false);

    // toggleMute toggles mute state
    expect(result.current.isMuted).toBe(false);
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);
  });

  it('resets timer on toggleTimer when isFinished is true', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(recipe.totalTimeSeconds * 1000);
    });
    expect(result.current.isFinished).toBe(true);

    // Calling toggleTimer while finished should reset
    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.isFinished).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('supports free_brew mode with split recording and interval calculation', () => {
    const mockRecipe = recipe;
    const { result } = renderHook(() => useMobileBrewTimer(mockRecipe, 'free_brew'));

    expect(result.current.splits).toEqual([]);

    act(() => {
      result.current.start();
    });

    // Advance clock by 45 seconds
    act(() => {
      vi.advanceTimersByTime(45000);
    });

    act(() => {
      result.current.recordSplit('Bloom', 'bloom');
    });

    expect(result.current.splits).toHaveLength(1);
    expect(result.current.splits[0].label).toBe('Bloom');
    expect(result.current.splits[0].second).toBe(45);
    expect(result.current.splits[0].intervalSeconds).toBe(45);

    // Advance by another 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    act(() => {
      result.current.recordSplit('First Pour', 'pour');
    });

    expect(result.current.splits).toHaveLength(2);
    expect(result.current.splits[1].second).toBe(75);
    expect(result.current.splits[1].intervalSeconds).toBe(30);

    // Test remove split
    const splitId = result.current.splits[0].id;
    act(() => {
      result.current.removeSplit(splitId);
    });
    expect(result.current.splits).toHaveLength(1);
    expect(result.current.splits[0].label).toBe('First Pour');
  });

  it('suppresses stage chimes and countdown haptics when mode is free_brew', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe, 'free_brew'));

    act(() => {
      result.current.start();
    });

    // Advance past stage 0 and 1 boundaries
    act(() => {
      vi.advanceTimersByTime(50000);
    });

    expect(mobileFeedback.triggerHapticStageTransition).not.toHaveBeenCalled();
    expect(mobileFeedback.playChime).not.toHaveBeenCalled();
    expect(mobileFeedback.triggerHapticCountdown).not.toHaveBeenCalled();
  });

  it('clears splits when reset is called and provides defaults for omitted label/tag', () => {
    const { result } = renderHook(() => useMobileBrewTimer(recipe, 'free_brew'));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    act(() => {
      result.current.recordSplit();
    });

    expect(result.current.splits).toHaveLength(1);
    expect(result.current.splits[0].label).toBe('Split 1');
    expect(result.current.splits[0].tag).toBe('custom');

    act(() => {
      result.current.reset();
    });
    expect(result.current.splits).toEqual([]);
  });
});

