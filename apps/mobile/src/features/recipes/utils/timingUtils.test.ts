import { describe, it, expect } from 'vitest';
import { BrewStage } from '@brewlog/core';
import { recalculateTiming, calculateTotalBrewTime } from './timingUtils';

describe('timingUtils', () => {
  const sampleStages: BrewStage[] = [
    {
      id: 's1',
      name: 'Bloom',
      stageType: 'bloom',
      startSecond: 10, // deliberately wrong to test recalculation
      durationSeconds: 45,
      targetWaterWeightGrams: 50,
      instruction: 'Bloom pour',
    },
    {
      id: 's2',
      name: 'Second Pour',
      stageType: 'pour',
      startSecond: 99, // deliberately wrong
      durationSeconds: 30,
      targetWaterWeightGrams: 150,
      instruction: 'Main pour',
    },
    {
      id: 's3',
      name: 'Drawdown',
      stageType: 'drawdown',
      startSecond: 0,
      durationSeconds: 45,
      targetWaterWeightGrams: 250,
      instruction: 'Let drain',
    },
  ];

  it('recalculates sequential startSecond values starting from 0', () => {
    const recalculated = recalculateTiming(sampleStages);
    expect(recalculated).toHaveLength(3);
    expect(recalculated[0].startSecond).toBe(0);
    expect(recalculated[0].durationSeconds).toBe(45);
    expect(recalculated[1].startSecond).toBe(45);
    expect(recalculated[1].durationSeconds).toBe(30);
    expect(recalculated[2].startSecond).toBe(75);
    expect(recalculated[2].durationSeconds).toBe(45);
  });

  it('calculates total brew time as the sum of all durations', () => {
    expect(calculateTotalBrewTime(sampleStages)).toBe(120);
  });

  it('handles empty stage lists cleanly', () => {
    expect(recalculateTiming([])).toEqual([]);
    expect(calculateTotalBrewTime([])).toBe(0);
  });

  it('sanitizes negative or NaN durations to 0', () => {
    const dirtyStages: BrewStage[] = [
      {
        id: 's1',
        name: 'Bloom',
        stageType: 'bloom',
        startSecond: 0,
        durationSeconds: -15,
        targetWaterWeightGrams: 50,
        instruction: 'Bloom',
      },
      {
        id: 's2',
        name: 'Pour',
        stageType: 'pour',
        startSecond: 0,
        durationSeconds: (NaN as unknown as number),
        targetWaterWeightGrams: 150,
        instruction: 'Pour',
      },
    ];
    const recalculated = recalculateTiming(dirtyStages);
    expect(recalculated[0].durationSeconds).toBe(0);
    expect(recalculated[0].startSecond).toBe(0);
    expect(recalculated[1].durationSeconds).toBe(0);
    expect(recalculated[1].startSecond).toBe(0);
    expect(calculateTotalBrewTime(dirtyStages)).toBe(0);
  });
});
