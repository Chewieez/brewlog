import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NotFoundRoute } from './NotFoundRoute';

describe('NotFoundRoute', () => {
  it('renders 404 message and a link returning to /timer', () => {
    render(
      <MemoryRouter>
        <NotFoundRoute />
      </MemoryRouter>
    );

    expect(screen.getByText(/404/i)).toBeDefined();
    expect(screen.getByText(/Brew Spilled/i)).toBeDefined();
    const returnLink = screen.getByRole('link', { name: /Return to Brew Assistant/i });
    expect(returnLink).toBeDefined();
    expect(returnLink.getAttribute('href')).toBe('/timer');
  });
});
