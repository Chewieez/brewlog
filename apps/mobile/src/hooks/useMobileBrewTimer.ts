import { useState, useEffect, useRef, useCallback } from 'react';
import { BrewRecipe, BrewStage } from '@brewlog/core';
import { mobileFeedback } from '../lib/mobileFeedback';

export interface UseMobileBrewTimerReturn {
  elapsedSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  isMuted: boolean;
  currentStageIndex: number;
  currentStage: BrewStage;
  nextStage: BrewStage | undefined;
  totalProgress: number;
  stageProgress: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggleTimer: () => void;
  toggleMute: () => void;
}

const defaultFallbackStage: BrewStage = {
  id: 'default-stage',
  name: 'Brew',
  startSecond: 0,
  durationSeconds: 0,
  targetWaterWeightGrams: 0,
  instruction: 'Brew coffee',
  stageType: 'pour',
};

export const useMobileBrewTimer = (recipe: BrewRecipe): UseMobileBrewTimerReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const startTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const recipeRef = useRef<BrewRecipe>(recipe);
  recipeRef.current = recipe;

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const lastChimedStageRef = useRef<number>(-1);
  const lastTickedSecondRef = useRef<number>(-1);
  const lastReportedSecondRef = useRef<number>(-1);

  // Active stage determination
  let currentStageIndex = 0;
  for (let i = 0; i < recipe.stages.length; i++) {
    const stage = recipe.stages[i];
    if (elapsedSeconds >= stage.startSecond && elapsedSeconds < stage.startSecond + stage.durationSeconds) {
      currentStageIndex = i;
      break;
    }
    if (elapsedSeconds >= stage.startSecond + stage.durationSeconds) {
      currentStageIndex = i;
    }
  }

  const currentStage = recipe.stages[currentStageIndex] || recipe.stages[0] || defaultFallbackStage;
  const nextStage = recipe.stages[currentStageIndex + 1];

  // Progress metrics
  const totalProgress = recipe.totalTimeSeconds > 0
    ? Math.min(100, (elapsedSeconds / recipe.totalTimeSeconds) * 100)
    : 0;

  const stageElapsed = elapsedSeconds - currentStage.startSecond;
  const stageProgress = currentStage.durationSeconds > 0
    ? Math.min(100, Math.max(0, (stageElapsed / currentStage.durationSeconds) * 100))
    : 0;

  const remainingSeconds = Math.max(0, recipe.totalTimeSeconds - elapsedSeconds);

  // Drift-free delta clock
  useEffect(() => {
    if (!isRunning) return;

    startTimeRef.current = performance.now() - accumulatedMsRef.current;

    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - startTimeRef.current;
      accumulatedMsRef.current = elapsedMs;

      const currentSec = Math.floor(elapsedMs / 1000);

      if (currentSec !== lastReportedSecondRef.current) {
        lastReportedSecondRef.current = currentSec;
        setElapsedSeconds(currentSec);

        const currentRecipe = recipeRef.current;
        const muted = isMutedRef.current;

        // Stage transition trigger
        for (let idx = 0; idx < currentRecipe.stages.length; idx++) {
          const stage = currentRecipe.stages[idx];
          if (currentSec === stage.startSecond && lastChimedStageRef.current < idx) {
            lastChimedStageRef.current = idx;
            mobileFeedback.triggerHapticStageTransition();
            mobileFeedback.playChime(muted);
            break;
          }
        }

        // 3-2-1 countdown ticks
        const upcomingStage = currentRecipe.stages.find((s) => s.startSecond > currentSec);
        if (upcomingStage) {
          const secondsUntil = upcomingStage.startSecond - currentSec;
          if (secondsUntil <= 3 && secondsUntil > 0 && lastTickedSecondRef.current !== currentSec) {
            lastTickedSecondRef.current = currentSec;
            mobileFeedback.triggerHapticCountdown();
          }
        }

        // Finish detection
        if (currentSec >= currentRecipe.totalTimeSeconds && currentRecipe.totalTimeSeconds > 0) {
          setIsFinished(true);
          setIsRunning(false);
          mobileFeedback.triggerHapticBrewComplete();
          clearInterval(intervalId);
        }
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [isRunning]);

  const start = useCallback(() => {
    if (isFinished) return;
    mobileFeedback.triggerHapticTap();
    setIsRunning(true);
  }, [isFinished]);

  const pause = useCallback(() => {
    mobileFeedback.triggerHapticTap();
    setIsRunning((running) => {
      if (running) {
        accumulatedMsRef.current = performance.now() - startTimeRef.current;
      }
      return false;
    });
  }, []);

  const reset = useCallback(() => {
    mobileFeedback.triggerHapticTap();
    setIsRunning(false);
    setElapsedSeconds(0);
    setIsFinished(false);
    accumulatedMsRef.current = 0;
    lastReportedSecondRef.current = -1;
    lastChimedStageRef.current = -1;
    lastTickedSecondRef.current = -1;
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const toggleMute = useCallback(() => {
    mobileFeedback.triggerHapticTap();
    setIsMuted((prev) => !prev);
  }, []);

  return {
    elapsedSeconds,
    remainingSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    nextStage,
    totalProgress,
    stageProgress,
    start,
    pause,
    reset,
    toggleTimer,
    toggleMute,
  };
};
