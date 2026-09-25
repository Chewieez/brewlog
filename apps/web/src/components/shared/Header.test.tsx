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

    const timerLink = screen.getAllByRole('link', { name: /Brew Assistant/i })[0];
    const stashLink = screen.getAllByRole('link', { name: /Coffee Stash/i })[0];
    const recipesLink = screen.getAllByRole('link', { name: /Recipe Studio/i })[0];
    const equipmentLink = screen.getAllByRole('link', { name: /Gear & Grinders/i })[0];
    const cuppingLink = screen.getAllByRole('link', { name: /Cupping & Wheel/i })[0];

    expect(timerLink.getAttribute('href')).toBe('/timer');
    expect(stashLink.getAttribute('href')).toBe('/stash');
    expect(recipesLink.getAttribute('href')).toBe('/recipes');
    expect(equipmentLink.getAttribute('href')).toBe('/equipment');
    expect(cuppingLink.getAttribute('href')).toBe('/cupping');
  });

  it('marks current route as active', () => {
    render(
      <MemoryRouter initialEntries={['/stash']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const stashLink = screen.getAllByRole('link', { name: /Coffee Stash/i })[0];
    expect(stashLink.className).toContain('text-accent');
  });

  it('renders logo link pointing to /timer', () => {
    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const logoLink = screen.getByRole('link', { name: /BrewLog Home, switch to Brew Assistant/i });
    expect(logoLink.getAttribute('href')).toBe('/timer');
  });
});
