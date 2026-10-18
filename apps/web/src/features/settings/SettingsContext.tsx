import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { UserSettings, DEFAULT_USER_SETTINGS } from '@brewlog/core';
import { mapDbToUserSettings, mapUserSettingsToDb } from '@brewlog/supabase';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabase';

export const WEB_SETTINGS_STORAGE_KEY = 'brewlog_settings_cache';
export const SETTINGS_STORAGE_KEY = WEB_SETTINGS_STORAGE_KEY;

export interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadCachedSettings(): UserSettings | null {
  try {
    const raw = localStorage.getItem(WEB_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_USER_SETTINGS,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.error('Failed to read settings from localStorage:', err);
  }
  return null;
}

function persistCachedSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(WEB_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to write settings to localStorage:', err);
  }
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(() => {
    return loadCachedSettings() ?? DEFAULT_USER_SETTINGS;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const settingsRef = useRef<UserSettings>(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    const initSettings = async () => {
      let current = loadCachedSettings() ?? settingsRef.current;

      if (isMounted) {
        setSettings(current);
        setLoading(false);
      }

      if (!supabase || !user) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (!error && data) {
          const remoteSettings = mapDbToUserSettings(data);
          setSettings(remoteSettings);
          persistCachedSettings(remoteSettings);
        } else if (!error && !data) {
          const payload = mapUserSettingsToDb(current, user.id);
          await supabase.from('user_settings').upsert(payload);
        }
      } catch (err) {
        console.error('Failed to sync settings with Supabase:', err);
      }
    };

    initSettings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      const nextSettings: UserSettings = {
        ...settingsRef.current,
        ...updates,
      };
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      persistCachedSettings(nextSettings);

      if (supabase && user) {
        try {
          const payload = mapUserSettingsToDb(nextSettings, user.id);
          await supabase.from('user_settings').upsert(payload);
        } catch (err) {
          console.error('Failed to sync updated settings to Supabase:', err);
        }
      }
    },
    [user]
  );

  const resetToDefaults = useCallback(async () => {
    const nextSettings = DEFAULT_USER_SETTINGS;
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    persistCachedSettings(nextSettings);

    if (supabase && user) {
      try {
        const payload = mapUserSettingsToDb(nextSettings, user.id);
        await supabase.from('user_settings').upsert(payload);
      } catch (err) {
        console.error('Failed to sync reset settings to Supabase:', err);
      }
    }
  }, [user]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      updateSettings,
      resetToDefaults,
    }),
    [settings, loading, updateSettings, resetToDefaults]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useOptionalSettings = (): SettingsContextValue | null => {
  return useContext(SettingsContext);
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
