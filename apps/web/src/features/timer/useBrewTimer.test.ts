/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBrewTimer } from "./useBrewTimer";
import { BrewRecipe } from "@brewlog/core";
import { coffeeAudio } from "../../lib/audio";

vi.mock("../../lib/audio", () => ({
  coffeeAudio: {
    unlock: vi.fn(),
    playTick: vi.fn(),
    playStageChime: vi.fn(),
    playCompletionFanfare: vi.fn(),
  },
}));

const mockRecipe: BrewRecipe = {
  id: "test-v60",
  name: "Test V60",
  brewMethod: "v60",
  description: "Test description",
  coffeeDoseGrams: 15,
  waterAmountGrams: 250,
  ratio: 16.67,
  grindSize: "Medium-Fine",
  waterTempCelsius: 94,
  totalTimeSeconds: 10, // Short for testing
  isPreset: true,
  createdAt: "2026-09-01T12:00:00.000Z",
  stages: [
    {
      id: "stage-1",
      name: "Bloom",
      startSecond: 0,
      durationSeconds: 5,
      targetWaterWeightGrams: 50,
      instruction: "Pour 50g water",
      stageType: "bloom",
    },
    {
      id: "stage-2",
      name: "Main Pour",
      startSecond: 5,
      durationSeconds: 5,
      targetWaterWeightGrams: 250,
      instruction: "Pour up to 250g",
      stageType: "pour",
    },
  ],
};

describe("useBrewTimer hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with 0 seconds and inactive state", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.currentStage.name).toBe("Bloom");
    expect(result.current.totalProgress).toBe(0);
  });

  it("calls coffeeAudio.unlock() and starts timer on start()", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.start();
    });

    expect(coffeeAudio.unlock).toHaveBeenCalledTimes(1);
    expect(result.current.isRunning).toBe(true);
  });

  it("advances seconds and updates active stage accurately", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.start();
    });

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(result.current.elapsedSeconds).toBe(3);
    expect(result.current.currentStage.name).toBe("Bloom");

    // Advance another 3 seconds (total 6s -> into stage 2)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(6);
    expect(result.current.currentStage.name).toBe("Main Pour");
  });

  it("pauses and resumes without losing accumulated time", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isRunning).toBe(false);

    // Advancing timers while paused should not increase elapsed time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(2);

    // Resume
    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(result.current.elapsedSeconds).toBe(3);
  });

  it("plays countdown ticks before next stage (at 2s, 3s, 4s before start at 5s)", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.start();
    });

    // Advance to 3s (2s before stage 2 start at 5s)
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(coffeeAudio.playTick).toHaveBeenCalled();
  });

  it("triggers completion fanfare and sets isFinished when reaching total time", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(10200);
    });

    expect(result.current.elapsedSeconds).toBe(10);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(coffeeAudio.playCompletionFanfare).toHaveBeenCalledTimes(1);
  });

  it("resets timer back to 0 on reset()", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(result.current.elapsedSeconds).toBe(4);

    act(() => {
      result.current.reset();
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.currentStage.name).toBe("Bloom");
  });

  it("does not play audio cues when muted", () => {
    const { result } = renderHook(() => useBrewTimer(mockRecipe));

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.start();
      vi.advanceTimersByTime(10200);
    });

    expect(coffeeAudio.playTick).not.toHaveBeenCalled();
    expect(coffeeAudio.playCompletionFanfare).not.toHaveBeenCalled();
  });
});
