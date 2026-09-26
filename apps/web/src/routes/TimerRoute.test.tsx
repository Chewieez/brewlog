/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { TimerRoute } from './TimerRoute';
import { RootOutletContext } from '../layouts/RootLayout';

vi.mock('../lib/audio', () => ({
  coffeeAudio: {
    unlock: vi.fn(),
    playTick: vi.fn(),
    playStageChime: vi.fn(),
    playCompletionFanfare: vi.fn(),
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

describe('TimerRoute', () => {
  let mockContext: Partial<RootOutletContext>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockContext = {
      selectedRecipe: DEFAULT_PRESET_RECIPES[0],
      selectedBean: null,
      beans: [],
      setSelectedBean: vi.fn(),
      setSelectedRecipe: vi.fn(),
      setPendingBrewSession: vi.fn(),
      onAddRecipe: vi.fn().mockResolvedValue(DEFAULT_PRESET_RECIPES[0]),
    };
  });

  afterEach(() => {
    act(() => {
      cleanup();
    });
    vi.useRealTimers();
  });

  it('saves recipe via onAddRecipe and navigates to /recipes from Free Brew mode', async () => {
    render(
      <MemoryRouter initialEntries={['/timer']}>
        <LocationDisplay />
        <Routes>
          <Route element={<Outlet context={mockContext} />}>
            <Route path="timer" element={<TimerRoute />} />
            <Route path="recipes" element={<div>Recipes Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Switch to Free Brew mode
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /FREE BREW/i }));
    });

    // Start timer & advance
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /START BREW/i }));
    });
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Record a split
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /\+ Bloom/i }));
    });

    // Finish brew
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /FINISH BREW/i }));
    });

    // Click SAVE AS CUSTOM RECIPE
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /SAVE AS CUSTOM RECIPE/i }));
    });

    expect(mockContext.onAddRecipe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-display').textContent).toBe('/recipes');
  });
});
