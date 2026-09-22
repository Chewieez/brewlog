import { BrewStage } from '@brewlog/core';

export function recalculateTiming(stages: BrewStage[]): BrewStage[] {
  let currentStart = 0;
  return stages.map((stage) => {
    const rawDuration = Number(stage.durationSeconds);
    const duration = isNaN(rawDuration) || rawDuration < 0 ? 0 : Math.round(rawDuration);
    const updated: BrewStage = {
      ...stage,
      startSecond: currentStart,
      durationSeconds: duration,
    };
    currentStart += duration;
    return updated;
  });
}

export function calculateTotalBrewTime(stages: BrewStage[]): number {
  return stages.reduce((acc, stage) => {
    const rawDuration = Number(stage.durationSeconds);
    const duration = isNaN(rawDuration) || rawDuration < 0 ? 0 : Math.round(rawDuration);
    return acc + duration;
  }, 0);
}
