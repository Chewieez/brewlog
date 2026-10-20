/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { SettingsRoute } from './SettingsRoute';
import { SettingsProvider } from '../features/settings/SettingsContext';
import { useAuth } from '../features/auth/AuthContext';
import { UserMenu } from '../features/auth/UserMenu';

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

describe('SettingsRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders settings sections and calibration preview gauge', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /^SETTINGS$/i })).toBeDefined();
    expect(screen.getByText(/SYSTEM \/\/ CALIBRATION/i)).toBeDefined();
    expect(screen.getByText(/WEIGHT UNIT/i)).toBeDefined();
    expect(screen.getByText(/TEMPERATURE UNIT/i)).toBeDefined();
    expect(screen.getByText(/DEFAULT TIMER MODE/i)).toBeDefined();
    expect(screen.getByText(/DATE FORMAT/i)).toBeDefined();
    expect(screen.getByText(/LIVE PREVIEW/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /RESET TO DEFAULTS/i })).toBeDefined();
  });

  it('renders default values in calibration preview gauge', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    // Initial default settings: metric (g), celsius (°C), free_brew
    expect(screen.getByTestId('preview-dose').textContent).toMatch(/18(\.0)?\s*g/);
    expect(screen.getByTestId('preview-water').textContent).toMatch(/300(\.0)?\s*g/);
    expect(screen.getByTestId('preview-temp').textContent).toContain('94°C');
    expect(screen.getByTestId('preview-timer-mode').textContent).toContain('FREE BREW');
  });

  it('updates weight unit and calibration preview when toggling metric / imperial', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    const imperialBtn = screen.getByRole('button', { name: /IMPERIAL \(oz\)/i });
    await act(async () => {
      fireEvent.click(imperialBtn);
    });

    // Preview should now show oz
    await waitFor(() => {
      expect(screen.getByTestId('preview-dose').textContent).toContain('0.63 oz');
      expect(screen.getByTestId('preview-water').textContent).toContain('10.58 oz');
    });

    const metricBtn = screen.getByRole('button', { name: /METRIC \(g\)/i });
    await act(async () => {
      fireEvent.click(metricBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-dose').textContent).toMatch(/18(\.0)?\s*g/);
      expect(screen.getByTestId('preview-water').textContent).toMatch(/300(\.0)?\s*g/);
    });
  });

  it('updates temperature unit and calibration preview when toggling celsius / fahrenheit', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    const fahrenheitBtn = screen.getByRole('button', { name: /FAHRENHEIT \(°F\)/i });
    await act(async () => {
      fireEvent.click(fahrenheitBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-temp').textContent).toBe('201°F');
    });

    const celsiusBtn = screen.getByRole('button', { name: /CELSIUS \(°C\)/i });
    await act(async () => {
      fireEvent.click(celsiusBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-temp').textContent).toBe('94°C');
    });
  });

  it('updates default timer mode when switching between free brew and guided recipe', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    const recipeBtn = screen.getByRole('button', { name: /GUIDED RECIPE/i });
    await act(async () => {
      fireEvent.click(recipeBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-timer-mode').textContent).toContain('GUIDED RECIPE');
    });

    const freeBrewBtn = screen.getByRole('button', { name: /FREE BREW/i });
    await act(async () => {
      fireEvent.click(freeBrewBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-timer-mode').textContent).toContain('FREE BREW');
    });
  });

  it('updates date format when choosing date format segments', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    const isoBtn = screen.getByRole('button', { name: /YYYY-MM-DD/i });
    await act(async () => {
      fireEvent.click(isoBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-date').textContent).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  it('resets settings to factory defaults when reset button is confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    // Switch to imperial and fahrenheit
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /IMPERIAL \(oz\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /FAHRENHEIT \(°F\)/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-dose').textContent).toContain('0.63 oz');
      expect(screen.getByTestId('preview-temp').textContent).toBe('201°F');
    });

    // Click reset
    const resetBtn = screen.getByRole('button', { name: /RESET TO DEFAULTS/i });
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId('preview-dose').textContent).toMatch(/18(\.0)?\s*g/);
      expect(screen.getByTestId('preview-temp').textContent).toBe('94°C');
    });

    confirmSpy.mockRestore();
  });

  it('does not reset settings if user cancels the confirmation dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /IMPERIAL \(oz\)/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-dose').textContent).toContain('0.63 oz');
    });

    const resetBtn = screen.getByRole('button', { name: /RESET TO DEFAULTS/i });
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId('preview-dose').textContent).toContain('0.63 oz');

    confirmSpy.mockRestore();
  });

  it('renders local storage indicator when unauthenticated', async () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/LOCAL STORAGE ONLY/i)).toBeDefined();
    expect(screen.getByText(/Saved to local device/i)).toBeDefined();
  });

  it('renders cloud sync telemetry indicator with email when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'barista@brewlog.app' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter>
        <SettingsProvider>
          <SettingsRoute />
        </SettingsProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/CLOUD SYNC ACTIVE/i)).toBeDefined();
    expect(screen.getByText('barista@brewlog.app')).toBeDefined();
  });

  describe('UserMenu navigation entry', () => {
    it('renders subtle settings link in unauthenticated state', () => {
      render(
        <MemoryRouter>
          <UserMenu onOpenAuthModal={vi.fn()} />
        </MemoryRouter>
      );

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toBeDefined();
      expect(settingsLink.getAttribute('href')).toBe('/settings');
    });

    it('renders settings link in authenticated dropdown menu', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'usr-1', email: 'barista@brewlog.app' } as any,
        session: null,
        loading: false,
        isConfigured: true,
        isPasswordRecovery: false,
        authUrlError: null,
        clearAuthUrlError: vi.fn(),
        setIsPasswordRecovery: vi.fn(),
        signInWithEmail: vi.fn(),
        signUpWithEmail: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updatePassword: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <MemoryRouter>
          <UserMenu onOpenAuthModal={vi.fn()} />
        </MemoryRouter>
      );

      // Open user dropdown
      const menuButton = screen.getByRole('button', { name: /user account menu/i });
      await act(async () => {
        fireEvent.click(menuButton);
      });

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toBeDefined();
      expect(settingsLink.getAttribute('href')).toBe('/settings');
    });
  });
});
