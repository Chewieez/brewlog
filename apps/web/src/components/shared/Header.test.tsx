/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from './Header';
import { SettingsProvider } from '../../features/settings/SettingsContext';

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
        <SettingsProvider>
          <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
        </SettingsProvider>
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
        <SettingsProvider>
          <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
        </SettingsProvider>
      </MemoryRouter>
    );

    const stashLink = screen.getAllByRole('link', { name: /Bean Stash/i })[0];
    expect(stashLink.className).toContain('text-accent');
  });

  it('renders logo link pointing to /timer', () => {
    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <SettingsProvider>
          <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
        </SettingsProvider>
      </MemoryRouter>
    );

    const logoLink = screen.getByRole('link', { name: /BrewLog Home, switch to Brew Timer/i });
    expect(logoLink.getAttribute('href')).toBe('/timer');
  });

  it('renders theme toggle button and cycles theme on click', () => {
    render(
      <MemoryRouter initialEntries={['/timer']}>
        <SettingsProvider>
          <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
        </SettingsProvider>
      </MemoryRouter>
    );

    const toggleBtn = screen.getByTestId('theme-toggle-button');
    expect(toggleBtn).toBeDefined();

    // Default is system theme
    expect(toggleBtn.getAttribute('aria-label')).toContain('Theme: System');

    // Click cycles to Dark
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-label')).toContain('Theme: Dark');

    // Click cycles to Light
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-label')).toContain('Theme: Light');

    // Click cycles back to System
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-label')).toContain('Theme: System');
  });
});
