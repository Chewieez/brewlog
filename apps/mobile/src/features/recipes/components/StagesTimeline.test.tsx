/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BrewStage } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

import { StagesTimeline } from './StagesTimeline';

describe('StagesTimeline', () => {
  afterEach(() => {
    cleanup();
  });

  const stages: BrewStage[] = [
    {
      id: 's1',
      name: 'Bloom',
      stageType: 'bloom',
      startSecond: 0,
      durationSeconds: 45,
      targetWaterWeightGrams: 50,
      instruction: 'Pour 50g water',
    },
    {
      id: 's2',
      name: 'Main Pour',
      stageType: 'pour',
      startSecond: 45,
      durationSeconds: 60,
      targetWaterWeightGrams: 250,
      instruction: 'Spiral pour',
    },
  ];

  it('renders stages in sequence with badges, durations, and weights', () => {
    const { getByText } = render(<StagesTimeline stages={stages} />);

    expect(getByText('1')).toBeDefined();
    expect(getByText('Bloom')).toBeDefined();
    expect(getByText('45s')).toBeDefined();
    expect(getByText('50g')).toBeDefined();

    expect(getByText('2')).toBeDefined();
    expect(getByText('Main Pour')).toBeDefined();
    expect(getByText('60s')).toBeDefined();
    expect(getByText('250g')).toBeDefined();
    expect(getByText('Spiral pour')).toBeDefined();
  });

  it('handles stages with empty instructions gracefully', () => {
    const minimalStages: BrewStage[] = [
      {
        id: 's3',
        name: 'Drawdown',
        stageType: 'drawdown',
        startSecond: 105,
        durationSeconds: 45,
        targetWaterWeightGrams: 250,
        instruction: '',
      },
    ];

    const { getByText, queryByText } = render(<StagesTimeline stages={minimalStages} />);
    expect(getByText('1')).toBeDefined();
    expect(getByText('Drawdown')).toBeDefined();
    expect(getByText('45s')).toBeDefined();
    expect(getByText('250g')).toBeDefined();
    expect(queryByText('Spiral pour')).toBeNull();
  });
});
