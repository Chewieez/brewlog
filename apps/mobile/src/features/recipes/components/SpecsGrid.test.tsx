/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Droplets: () => null,
  BookOpen: () => null,
  Clock: () => null,
  Thermometer: () => null,
}));

import { SpecsGrid } from './SpecsGrid';

describe('SpecsGrid', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all four specification cards formatted properly', () => {
    const { getByText } = render(
      <SpecsGrid
        totalWater={250}
        ratio={16.67}
        totalTimeSeconds={180}
        waterTempCelsius={93}
      />
    );

    expect(getByText('250g')).toBeDefined();
    expect(getByText('1:16.7')).toBeDefined();
    expect(getByText('3m 00s')).toBeDefined();
    expect(getByText('93°C')).toBeDefined();
  });

  it('renders fallback temperature range when waterTempCelsius is not provided', () => {
    const { getByText } = render(
      <SpecsGrid
        totalWater={300}
        ratio={15}
        totalTimeSeconds={210}
      />
    );

    expect(getByText('300g')).toBeDefined();
    expect(getByText('1:15')).toBeDefined();
    expect(getByText('3m 30s')).toBeDefined();
    expect(getByText('93-96°C')).toBeDefined();
  });
});
