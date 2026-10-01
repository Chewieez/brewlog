/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RootLayout, useRootOutletContext, WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';
import { AuthProvider } from './features/auth/AuthContext';
import { App } from './App';

vi.mock('./features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isPasswordRecovery: false,
    authUrlError: null,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function TestApp({ initialPath = '/' }: { initialPath?: string }) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Navigate to="/timer" replace />} />
            <Route path="/timer" element={<TimerRoute />} />
            <Route path="/stash" element={<StashRoute />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('App Routing', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.pushState({}, 'Test', '/');
  });
  it('redirects from / to /timer', () => {
    render(<TestApp initialPath="/" />);
    // Brew Assistant / Timer elements are present
    expect(screen.getByText(/Start Brew/i)).toBeDefined();
  });

  it('navigates directly to /stash', () => {
    render(<TestApp initialPath="/stash" />);
    expect(screen.getByText(/ADD BEAN/i)).toBeDefined();
  });

  it('renders 404 page for unknown paths', () => {
    render(<TestApp initialPath="/does-not-exist" />);
    expect(screen.getByText(/Brew Spilled/i)).toBeDefined();
  });

  it('renders App component with default route', () => {
    render(<App />);
    expect(screen.getByText(/Start Brew/i)).toBeDefined();
  });

  it('renders a specific recipe detail when deep-linked to /recipes/:recipeId', async () => {
    window.history.pushState({}, 'Test', '/recipes/preset-v60-hoffmann');
    render(<App />);

    const headings = await screen.findAllByRole('heading', { level: 3 });
    expect(headings.some((h) => /hoffmann/i.test(h.textContent || ''))).toBe(true);
    expect(await screen.findByRole('button', { name: /brew with this recipe/i })).toBeDefined();
  });

  it('renders 404 NotFoundRoute when navigating to an unknown recipe ID', async () => {
    window.history.pushState({}, 'Test', '/recipes/unknown-recipe-999');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /brew spilled/i })).toBeDefined();
    expect(screen.getByText(/Error 404/i)).toBeDefined();
  });

  it('renders recipe catalog and placeholder when visiting /recipes', async () => {
    window.history.pushState({}, 'Test', '/recipes');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 3, name: 'Select a Recipe' })).toBeDefined();
    expect(screen.getByText(/choose a recipe from the catalog/i)).toBeDefined();
  });

  it('defaults active recipe on first load of timer to last used recipe from localStorage', () => {
    const aeropressPreset = DEFAULT_PRESET_RECIPES[1];
    localStorage.setItem(
      WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: aeropressPreset.id })
    );

    render(<TestApp initialPath="/timer" />);
    expect(screen.getByText(aeropressPreset.name)).toBeDefined();
  });

  it('updates localStorage when a recipe is chosen to brew from recipe details', async () => {
    window.history.pushState({}, 'Test', '/recipes/preset-v60-hoffmann');
    render(<App />);

    const brewBtn = await screen.findByRole('button', { name: /brew with this recipe/i });
    act(() => {
      brewBtn.click();
    });

    const stored = localStorage.getItem(WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.recipeId).toBe('preset-v60-hoffmann');
  });

  it('defaults active recipe on first load to cached custom recipe from localStorage', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'local-rec-my-custom',
      name: 'My Special Filter V60',
    };
    localStorage.setItem(
      'brewlog_custom_recipes_cache',
      JSON.stringify([customRecipe])
    );
    localStorage.setItem(
      WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: customRecipe.id })
    );

    render(<TestApp initialPath="/timer" />);
    expect(screen.getByText('My Special Filter V60')).toBeDefined();
  });

  it('self-heals localStorage with fallback preset when stored recipe ID cannot be found', () => {
    localStorage.setItem(
      WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: 'non-existent-or-deleted-id' })
    );

    render(<TestApp initialPath="/timer" />);
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();

    const stored = localStorage.getItem(WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.recipeId).toBe(DEFAULT_PRESET_RECIPES[0].id);
  });

  it('falls back to default preset and updates localStorage when active recipe is deleted', async () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'local-rec-to-delete',
      name: 'Temporary Filter V60',
      isPreset: false,
    };
    localStorage.setItem(
      'brewlog_custom_recipes_cache',
      JSON.stringify([customRecipe])
    );
    localStorage.setItem(
      WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId: customRecipe.id })
    );

    const TestDeleteConsumer = () => {
      const { selectedRecipe, onDeleteRecipe } = useRootOutletContext();
      return (
        <div>
          <span data-testid="selected-recipe-id">{selectedRecipe.id}</span>
          <button type="button" onClick={() => onDeleteRecipe(customRecipe.id)}>
            Delete Recipe
          </button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/test']}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/test" element={<TestDeleteConsumer />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByTestId('selected-recipe-id').textContent).toBe(customRecipe.id);

    const deleteBtn = screen.getByRole('button', { name: 'Delete Recipe' });
    await act(async () => {
      deleteBtn.click();
    });

    expect(screen.getByTestId('selected-recipe-id').textContent).toBe(DEFAULT_PRESET_RECIPES[0].id);

    const stored = localStorage.getItem(WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.recipeId).toBe(DEFAULT_PRESET_RECIPES[0].id);
  });
});
