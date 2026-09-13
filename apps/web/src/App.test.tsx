import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
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
  it('redirects from / to /timer', () => {
    render(<TestApp initialPath="/" />);
    // Brew Assistant / Timer elements are present
    expect(screen.getByText(/Start Brew/i)).toBeDefined();
  });

  it('navigates directly to /stash', () => {
    render(<TestApp initialPath="/stash" />);
    expect(screen.getByText(/Add Coffee Beans?/i)).toBeDefined();
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
});
