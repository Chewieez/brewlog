/** @vitest-environment jsdom */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsProvider, useSettings, SETTINGS_STORAGE_KEY } from './SettingsContext';
import { DEFAULT_USER_SETTINGS, UserSettings } from '@brewlog/core';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabase';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe('SettingsContext (Mobile)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      upsert: mockUpsert,
    });
  });

  it('hydrates with default settings when storage is empty', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('updates settings and persists to AsyncStorage immediately', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ weightUnit: 'imperial' });
    });

    expect(result.current.settings.weightUnit).toBe('imperial');
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(stored!)).toMatchObject({ weightUnit: 'imperial' });
  });

  it('resets settings to defaults on resetToDefaults()', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ weightUnit: 'imperial', temperatureUnit: 'fahrenheit' });
    });

    await act(async () => {
      await result.current.resetToDefaults();
    });

    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('hydrates with cached settings from AsyncStorage when present', async () => {
    const customSettings: UserSettings = {
      weightUnit: 'imperial',
      temperatureUnit: 'fahrenheit',
      defaultTimerMode: 'recipe',
      dateFormat: 'MM/DD/YYYY',
      theme: 'system',
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(customSettings));

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toEqual(customSettings);
  });

  it('fetches and hydrates remote settings when user is signed in and remote row exists', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-456' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        user_id: 'user-456',
        weight_unit: 'imperial',
        temperature_unit: 'fahrenheit',
        default_timer_mode: 'recipe',
        date_format: 'YYYY-MM-DD',
        created_at: '2026-10-18T00:00:00Z',
        updated_at: '2026-10-18T00:00:00Z',
      },
      error: null,
    });

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => {
      expect(result.current.settings).toEqual({
        weightUnit: 'imperial',
        temperatureUnit: 'fahrenheit',
        defaultTimerMode: 'recipe',
        dateFormat: 'YYYY-MM-DD',
      });
    });

    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(stored!)).toMatchObject({
      weightUnit: 'imperial',
      temperatureUnit: 'fahrenheit',
      defaultTimerMode: 'recipe',
      dateFormat: 'YYYY-MM-DD',
    });
  });

  it('upserts local settings to cloud when user is signed in and no remote row exists', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-789' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-789',
          weight_unit: 'metric',
          temperature_unit: 'celsius',
          default_timer_mode: 'free_brew',
          date_format: 'locale',
        })
      );
    });
  });

  it('syncs setting updates to Supabase when user is authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-789' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ weightUnit: 'imperial' });
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-789',
        weight_unit: 'imperial',
      })
    );
  });

  it('preserves sequential synchronous updates using settingsRef', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const p1 = result.current.updateSettings({ weightUnit: 'imperial' });
      const p2 = result.current.updateSettings({ temperatureUnit: 'fahrenheit' });
      await Promise.all([p1, p2]);
    });

    expect(result.current.settings.weightUnit).toBe('imperial');
    expect(result.current.settings.temperatureUnit).toBe('fahrenheit');
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(stored!)).toMatchObject({
      weightUnit: 'imperial',
      temperatureUnit: 'fahrenheit',
    });
  });

  it('logs an error when Supabase upsert fails with an error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-err' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    mockUpsert.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS check failed', code: '42501' },
    });

    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider>{children}</SettingsProvider>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ weightUnit: 'imperial' });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to sync settings to Supabase:',
      { message: 'RLS check failed', code: '42501' }
    );
    consoleErrorSpy.mockRestore();
  });

  it('throws an error when useSettings is used outside of SettingsProvider', () => {
    // Suppress React boundary console.error during expected throw
    const originalError = console.error;
    console.error = vi.fn();
    try {
      expect(() => renderHook(() => useSettings())).toThrow(
        'useSettings must be used within a SettingsProvider'
      );
    } finally {
      console.error = originalError;
    }
  });
});
