import { useState, useEffect, useRef, useCallback } from "react";
import { BrewRecipe, BrewStage, TimerMode, BrewSplit, SplitTag } from "@brewlog/core";
import { coffeeAudio } from "../../lib/audio";

export interface UseBrewTimerReturn {
  elapsedSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  isMuted: boolean;
  currentStageIndex: number;
  currentStage: BrewStage;
  nextStage: BrewStage | undefined;
  totalProgress: number;
  splits: BrewSplit[];
  recordSplit: (label?: string, tag?: SplitTag) => void;
  removeSplit: (id: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggleTimer: () => void;
  toggleMute: () => void;
  startTimeRef: React.RefObject<number>;
  accumulatedMsRef: React.RefObject<number>;
}

const defaultFallbackStage: BrewStage = {
  id: "default-stage",
  name: "Brew",
  startSecond: 0,
  durationSeconds: 0,
  targetWaterWeightGrams: 0,
  instruction: "Brew coffee",
  stageType: "pour",
};

export const useBrewTimer = (
  recipe: BrewRecipe,
  mode: TimerMode = "recipe"
): UseBrewTimerReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [splits, setSplits] = useState<BrewSplit[]>([]);

  // Precision Delta Timing Refs (drift-free wall-clock tracking)
  const startTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);

  // Deduplication & closure preservation refs
  const recipeRef = useRef<BrewRecipe>(recipe);
  recipeRef.current = recipe;

  const modeRef = useRef<TimerMode>(mode);
  modeRef.current = mode;

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const splitsRef = useRef<BrewSplit[]>(splits);
  splitsRef.current = splits;

  const lastChimedStageRef = useRef<number>(-1);
  const lastTickedSecondRef = useRef<number>(-1);
  const lastReportedSecondRef = useRef<number>(0);

  // Active stage determination
  let currentStageIndex = 0;
  if (recipe.stages && recipe.stages.length > 0) {
    for (let i = 0; i < recipe.stages.length; i++) {
      const stage = recipe.stages[i];
      if (
        elapsedSeconds >= stage.startSecond &&
        elapsedSeconds < stage.startSecond + stage.durationSeconds
      ) {
        currentStageIndex = i;
        break;
      }
      if (elapsedSeconds >= stage.startSecond + stage.durationSeconds) {
        currentStageIndex = i;
      }
    }
  }

  const currentStage =
    (recipe.stages && (recipe.stages[currentStageIndex] || recipe.stages[0])) ||
    defaultFallbackStage;
  const nextStage = recipe.stages ? recipe.stages[currentStageIndex + 1] : undefined;

  // Total Progress percentage (0 to 100)
  const totalProgress =
    mode === "free_brew"
      ? 0
      : recipe.totalTimeSeconds > 0
      ? Math.min(100, (elapsedSeconds / recipe.totalTimeSeconds) * 100)
      : 0;

  // High-precision timing loop using performance.now()
  useEffect(() => {
    if (!isRunning) return;

    startTimeRef.current = performance.now() - accumulatedMsRef.current;

    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - startTimeRef.current;
      accumulatedMsRef.current = elapsedMs;

      const currentSec = Math.floor(elapsedMs / 1000);

      // Only trigger state updates when integer second changes (prevents 60fps React re-renders)
      if (currentSec !== lastReportedSecondRef.current) {
        lastReportedSecondRef.current = currentSec;
        setElapsedSeconds(currentSec);

        const currentRecipe = recipeRef.current;
        const currentMode = modeRef.current;
        const muted = isMutedRef.current;

        if (currentMode === "recipe") {
          // 1. Stage transition chime check
          for (let idx = 0; idx < currentRecipe.stages.length; idx++) {
            const stage = currentRecipe.stages[idx];
            if (currentSec === stage.startSecond && lastChimedStageRef.current < idx) {
              lastChimedStageRef.current = idx;
              if (!muted) {
                coffeeAudio.playStageChime();
              }
              break;
            }
          }

          // 2. Countdown ticks (3, 2, 1) before the next stage starts
          const upcomingStage = currentRecipe.stages.find((s) => s.startSecond > currentSec);
          if (upcomingStage) {
            const remainingUntilNext = upcomingStage.startSecond - currentSec;
            if (
              remainingUntilNext >= 1 &&
              remainingUntilNext <= 3 &&
              lastTickedSecondRef.current !== currentSec
            ) {
              lastTickedSecondRef.current = currentSec;
              if (!muted) {
                coffeeAudio.playTick();
              }
            }
          }

          // 3. Brew completion check
          if (currentRecipe.totalTimeSeconds > 0 && currentSec >= currentRecipe.totalTimeSeconds) {
            setIsRunning(false);
            setIsFinished(true);
            if (!muted) {
              coffeeAudio.playCompletionFanfare();
            }
            clearInterval(intervalId);
          }
        }
      }
    }, 100); // Poll every 100ms for sub-frame accuracy without CPU load

    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning]);

  const start = useCallback(() => {
    coffeeAudio.unlock();

    if (isFinished) {
      accumulatedMsRef.current = 0;
      lastReportedSecondRef.current = 0;
      lastChimedStageRef.current = -1;
      lastTickedSecondRef.current = -1;
      setElapsedSeconds(0);
      setIsFinished(false);
      splitsRef.current = [];
      setSplits([]);
    }

    setIsRunning(true);
  }, [isFinished]);

  const pause = useCallback(() => {
    if (isRunning) {
      accumulatedMsRef.current = performance.now() - startTimeRef.current;
      setIsRunning(false);
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    accumulatedMsRef.current = 0;
    lastReportedSecondRef.current = 0;
    lastChimedStageRef.current = -1;
    lastTickedSecondRef.current = -1;
    setElapsedSeconds(0);
    setIsFinished(false);
    splitsRef.current = [];
    setSplits([]);
  }, []);

  const recordSplit = useCallback(
    (label?: string, tag?: SplitTag) => {
      const currentSec = Math.max(elapsedSeconds, lastReportedSecondRef.current);
      const id = `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const currentSplits = splitsRef.current;
      const lastSplitSecond =
        currentSplits.length > 0 ? currentSplits[currentSplits.length - 1].second : 0;
      const intervalSeconds = Math.max(0, currentSec - lastSplitSecond);
      const newSplit: BrewSplit = {
        id,
        second: currentSec,
        intervalSeconds,
        label: label || `Split ${currentSplits.length + 1}`,
        tag: tag || "custom",
      };
      const updated = [...currentSplits, newSplit];
      splitsRef.current = updated;
      setSplits(updated);
      if (!isMutedRef.current) {
        coffeeAudio.playStageChime();
      }
    },
    [elapsedSeconds]
  );

  const removeSplit = useCallback((id: string) => {
    splitsRef.current = splitsRef.current.filter((s) => s.id !== id);
    setSplits((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  }, []);

  return {
    elapsedSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    nextStage,
    totalProgress,
    splits,
    recordSplit,
    removeSplit,
    start,
    pause,
    reset,
    toggleTimer,
    toggleMute,
    startTimeRef,
    accumulatedMsRef,
  };
};
