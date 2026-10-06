/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from './Header';

afterEach(cleanup);

vi.mock('../../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

describe('Header', () => {
  it('renders navigation links pointing to router paths', () => {
    render(
      <MemoryRouter initialEntries={['/timer']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const timerLink = screen.getAllByRole('link', { name: /Brew Timer/i })[0];
    const stashLink = screen.getAllByRole('link', { name: /Bean Stash/i })[0];
    const recipesLink = screen.getAllByRole('link', { name: /Recipes/i })[0];
    const equipmentLink = screen.getAllByRole('link', { name: /Equipment/i })[0];
    const reviewsLink = screen.getAllByRole('link', { name: /Reviews/i })[0];

    expect(timerLink.getAttribute('href')).toBe('/timer');
    expect(stashLink.getAttribute('href')).toBe('/stash');
    expect(recipesLink.getAttribute('href')).toBe('/recipes');
    expect(equipmentLink.getAttribute('href')).toBe('/equipment');
    expect(reviewsLink.getAttribute('href')).toBe('/reviews');
  });

  it('marks current route as active', () => {
    render(
      <MemoryRouter initialEntries={['/stash']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const stashLink = screen.getAllByRole('link', { name: /Bean Stash/i })[0];
    expect(stashLink.className).toContain('text-accent');
  });

  it('renders logo link pointing to /timer', () => {
    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const logoLink = screen.getByRole('link', { name: /BrewLog Home, switch to Brew Timer/i });
    expect(logoLink.getAttribute('href')).toBe('/timer');
  });
});
