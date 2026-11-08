/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { TimerRoute } from './TimerRoute';

const mockAddRecipe = vi.fn();
const mockSetSelectedBean = vi.fn();
const mockSetPendingBrewSession = vi.fn();

vi.mock('../features/recipes/RecipeContext', () => ({
  useRecipes: () => ({
    selectedRecipe: DEFAULT_PRESET_RECIPES[0],
    addRecipe: mockAddRecipe,
  }),
}));

vi.mock('../features/stash/BeansContext', () => ({
  useBeans: () => ({
    beans: [],
    selectedBean: null,
    setSelectedBean: mockSetSelectedBean,
  }),
}));

vi.mock('../features/reviews/ReviewsContext', () => ({
  useReviews: () => ({
    setPendingBrewSession: mockSetPendingBrewSession,
  }),
}));

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
  beforeEach(() => {
    vi.useFakeTimers();
    mockAddRecipe.mockReset().mockResolvedValue(DEFAULT_PRESET_RECIPES[0]);
    mockSetSelectedBean.mockReset();
    mockSetPendingBrewSession.mockReset();
  });

  afterEach(() => {
    act(() => {
      cleanup();
    });
    vi.useRealTimers();
  });

  it('saves recipe via addRecipe and navigates to /recipes from Free Brew mode', async () => {
    render(
      <MemoryRouter initialEntries={['/timer']}>
        <LocationDisplay />
        <Routes>
          <Route path="timer" element={<TimerRoute />} />
          <Route path="recipes" element={<div>Recipes Screen</div>} />
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

    expect(mockAddRecipe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-display').textContent).toBe('/recipes');
  });
});
