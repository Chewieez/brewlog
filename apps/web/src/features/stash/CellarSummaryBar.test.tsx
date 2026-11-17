/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CellarSummaryBar } from './CellarSummaryBar';

describe('CellarSummaryBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders ACTIVE BAGS, AT PEAK, and TOTAL STASH metrics', () => {
    render(
      <CellarSummaryBar
        totalBags={4}
        peakBags={2}
        totalRemainingGrams={890}
      />
    );

    const region = screen.getByRole('region', {
      name: 'Cellar summary: 4 active bags, 2 at peak, 890g total stash',
    });
    expect(region).toBeDefined();
    expect(region.className).toContain('rounded-xl');
    expect(region.className).toContain('border-border-subtle');
    expect(region.className).not.toMatch(/border-[lrtb]-/);

    expect(screen.getByText('ACTIVE BAGS')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();

    expect(screen.getByText('AT PEAK')).toBeDefined();
    const peakValue = screen.getByText('2');
    expect(peakValue.className).toContain('text-status-success');

    expect(screen.getByText('TOTAL STASH')).toBeDefined();
    expect(screen.getByText('890')).toBeDefined();
    expect(screen.getByText('g')).toBeDefined();
  });

  it('renders AT PEAK in default color when peakBags is 0', () => {
    render(
      <CellarSummaryBar
        totalBags={1}
        peakBags={0}
        totalRemainingGrams={250}
      />
    );

    const peakValue = screen.getByText('0');
    expect(peakValue.className).toContain('text-foreground');
    expect(peakValue.className).not.toContain('text-status-success');
  });
});
