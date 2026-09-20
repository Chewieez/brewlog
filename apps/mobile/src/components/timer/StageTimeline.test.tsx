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

vi.mock('lucide-react-native', () => ({
  CheckCircle2: () => <span data-testid="icon-done" />,
  CircleDot: () => <span data-testid="icon-active" />,
  Circle: () => <span data-testid="icon-upcoming" />,
}));

import { render, cleanup } from '@testing-library/react';
import { StageTimeline } from './StageTimeline';
import { BrewStage } from '@brewlog/core';

describe('StageTimeline Component', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleStages: BrewStage[] = [
    {
      id: 's1',
      name: 'Bloom',
      startSecond: 0,
      durationSeconds: 45,
      targetWaterWeightGrams: 60,
      instruction: 'Pour 60g bloom',
      stageType: 'bloom',
    },
    {
      id: 's2',
      name: 'Main Pour',
      startSecond: 45,
      durationSeconds: 60,
      targetWaterWeightGrams: 250,
      instruction: 'Pour to 250g',
      stageType: 'pour',
    },
    {
      id: 's3',
      name: 'Drawdown',
      startSecond: 105,
      durationSeconds: 45,
      targetWaterWeightGrams: 250,
      instruction: 'Allow to draw down',
      stageType: 'drawdown',
    },
  ];

  it('renders all stages with formatted timestamps and target weights', () => {
    const { getByText } = render(
      <StageTimeline stages={sampleStages} currentStageIndex={1} />
    );

    expect(getByText('BREW TIMELINE')).toBeDefined();
    expect(getByText('Bloom')).toBeDefined();
    expect(getByText('0:00 · 60g')).toBeDefined();
    expect(getByText('Main Pour')).toBeDefined();
    expect(getByText('0:45 · 250g')).toBeDefined();
    expect(getByText('Drawdown')).toBeDefined();
    expect(getByText('1:45 · 250g')).toBeDefined();
  });

  it('renders appropriate status icons for completed, active, and upcoming stages', () => {
    const { getAllByTestId } = render(
      <StageTimeline stages={sampleStages} currentStageIndex={1} />
    );

    // Stage 0 is completed (index < currentStageIndex 1)
    expect(getAllByTestId('icon-done')).toHaveLength(1);
    // Stage 1 is active (index === currentStageIndex 1)
    expect(getAllByTestId('icon-active')).toHaveLength(1);
    // Stage 2 is upcoming (index > currentStageIndex 1)
    expect(getAllByTestId('icon-upcoming')).toHaveLength(1);
  });
});
