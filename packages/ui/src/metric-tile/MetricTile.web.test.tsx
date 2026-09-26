import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricTile } from './MetricTile.web';

describe('MetricTile (web)', () => {
  it('renders uppercase eyebrow label and tabular Outfit value', () => {
    render(<MetricTile label="COFFEE DOSE" value="15.0" unit="g" />);
    const label = screen.getByText('COFFEE DOSE');
    expect(label).toBeInTheDocument();
    expect(label.className).toContain('font-mono');
    expect(label.className).toContain('uppercase');

    const value = screen.getByText('15.0');
    expect(value).toBeInTheDocument();
    expect(value.className).toContain("font-['Outfit']");
    expect(value.className).toContain('tabular-nums');
    expect(value.className).not.toContain('font-mono');
  });

  it('renders accent variant in copper color', () => {
    render(<MetricTile label="POUR TO" value="250" variant="accent" />);
    const value = screen.getByText('250');
    expect(value.className).toContain('text-accent');
  });
});
