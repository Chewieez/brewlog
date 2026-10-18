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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings, DEFAULT_USER_SETTINGS } from '@brewlog/core';
import { mapDbToUserSettings, mapUserSettingsToDb } from '@brewlog/supabase';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabase';

export const SETTINGS_STORAGE_KEY = '@brewlog/mobile:settings_cache';

export interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

async function loadCachedSettings(): Promise<UserSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
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
    console.error('Failed to read settings from AsyncStorage:', err);
  }
  return null;
}

async function persistCachedSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to write settings to AsyncStorage:', err);
  }
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const settingsRef = useRef<UserSettings>(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    const initSettings = async () => {
      let current = settingsRef.current;
      try {
        const cached = await loadCachedSettings();
        if (cached) {
          current = cached;
        }
      } catch (err) {
        console.error('Failed to load cached settings:', err);
      }

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
          await persistCachedSettings(remoteSettings);
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
      setSettings(nextSettings);
      await persistCachedSettings(nextSettings);

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
    setSettings(nextSettings);
    await persistCachedSettings(nextSettings);

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

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
