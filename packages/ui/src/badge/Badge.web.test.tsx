import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge.web';

describe('Badge (web)', () => {
  it('renders mono badge with JetBrains Mono uppercase styling', () => {
    render(<Badge label="V60" variant="mono" />);
    const badge = screen.getByText('V60');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('font-mono');
    expect(badge.className).toContain('uppercase');
  });

  it('renders default badge with Outfit sans styling', () => {
    render(<Badge label="Anaerobic" variant="default" />);
    const badge = screen.getByText('Anaerobic');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('font-sans');
    expect(badge.className).not.toContain('font-mono');
  });

  it('applies accent variant border and color', () => {
    render(<Badge label="Peak" variant="accent" />);
    const badge = screen.getByText('Peak');
    expect(badge.className).toContain('text-accent');
    expect(badge.className).toContain('border-accent');
  });
});
