/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

import { render, cleanup } from '@testing-library/react';
import { ActiveStageCard } from './ActiveStageCard';
import { BrewStage } from '@brewlog/core';

describe('ActiveStageCard Component', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleStage: BrewStage = {
    id: 'stage-bloom',
    name: 'Bloom',
    startSecond: 0,
    durationSeconds: 45,
    targetWaterWeightGrams: 60,
    instruction: 'Pour 60g quickly and swirl gently.',
    stageType: 'bloom',
  };

  it('renders stage index, remaining countdown, stage name, and target water', () => {
    const { getByText } = render(
      <ActiveStageCard
        stage={sampleStage}
        stageIndex={0}
        totalStages={4}
        elapsedSeconds={15}
      />
    );

    // Stage 1 of 4
    expect(getByText(/STAGE 1 OF 4/i)).toBeDefined();
    // 45 - 15 = 30s remaining
    expect(getByText('30S REMAINING')).toBeDefined();
    expect(getByText('Bloom')).toBeDefined();
    expect(getByText('POUR TARGET')).toBeDefined();
    expect(getByText('60g')).toBeDefined();
    expect(getByText('Pour 60g quickly and swirl gently.')).toBeDefined();
  });

  it('clamps countdown to 0 when elapsed seconds exceeds stage end second', () => {
    const { getByText } = render(
      <ActiveStageCard
        stage={sampleStage}
        stageIndex={0}
        totalStages={4}
        elapsedSeconds={50}
      />
    );

    expect(getByText('0S REMAINING')).toBeDefined();
  });

  it('renders cleanly without instruction description', () => {
    const stageWithoutDesc: BrewStage = {
      ...sampleStage,
      instruction: '',
    };

    const { getByText, queryByText } = render(
      <ActiveStageCard
        stage={stageWithoutDesc}
        stageIndex={1}
        totalStages={3}
        elapsedSeconds={10}
      />
    );

    expect(getByText(/STAGE 2 OF 3/i)).toBeDefined();
    expect(queryByText('Pour 60g quickly and swirl gently.')).toBeNull();
  });
});
