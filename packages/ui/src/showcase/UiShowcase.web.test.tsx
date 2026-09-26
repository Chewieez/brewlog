import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UiShowcase } from './UiShowcase.web';

describe('UiShowcase (web)', () => {
  it('renders all 5 primitives in the showcase fixture', () => {
    render(<UiShowcase />);
    expect(screen.getByText('SHOWCASE: BUTTONS')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: METRIC TILES')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: BADGES')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: INPUTS')).toBeInTheDocument();
    expect(screen.getByText('SHOWCASE: CARDS')).toBeInTheDocument();
  });
});
