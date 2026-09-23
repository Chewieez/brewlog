import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bean } from '@brewlog/core';
import { mapBeanRowToDomain, mapBeanDomainToInsert } from '@brewlog/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export const STASH_STORAGE_KEY = '@brewlog/mobile:stash_cache';

export type AddBeanInput = Omit<Bean, 'id' | 'createdAt' | 'flavorNotes'> & {
  flavorNotes?: string[];
  id?: string;
  createdAt?: string;
};

export interface StashContextValue {
  beans: Bean[];
  activeBeans: Bean[];
  frozenBeans: Bean[];
  archivedBeans: Bean[];
  activeBrewBean: Bean | null;
  loading: boolean;
  addBean: (bean: AddBeanInput) => Promise<Bean>;
  updateBean: (id: string, updates: Partial<Bean>) => Promise<Bean>;
  deleteBean: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleFrozen: (id: string) => Promise<void>;
  archiveBean: (id: string) => Promise<void>;
  unarchiveBean: (id: string) => Promise<void>;
  deductBeanDose: (id: string, doseGrams: number) => Promise<void>;
  setActiveBrewBean: (bean: Bean | null) => void;
  refreshBeans: () => Promise<void>;
}

export const StashContext = createContext<StashContextValue | null>(null);

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function loadCachedBeans(): Promise<Bean[]> {
  try {
    const raw = await AsyncStorage.getItem(STASH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read cached beans from AsyncStorage:', err);
  }
  return [];
}

async function persistCachedBeans(items: Bean[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to write cached beans to AsyncStorage:', err);
  }
}

export const StashProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [beans, setBeans] = useState<Bean[]>([]);
  const [activeBrewBean, setActiveBrewBeanState] = useState<Bean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBeans = useCallback(async () => {
    setLoading(true);
    try {
      const local = await loadCachedBeans();
      setBeans(local);

      if (!supabase || !user) {
        return;
      }

      // Auto-sync unsynced local beans (where userId is missing or does not match current user)
      const unsynced = local.filter((b) => !b.userId || b.userId !== user.id);
      const syncedIds = new Set<string>();

      if (unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            const payload = {
              ...mapBeanDomainToInsert(item, user.id),
              id: item.id,
            };
            const { data: beanData, error: beanErr } = await supabase
              .from('beans')
              .insert(payload)
              .select()
              .single();

            if (!beanErr && beanData) {
              syncedIds.add(item.id);
            }
          } catch (syncErr) {
            console.error('Failed to sync offline bean:', item.name, syncErr);
          }
        }
      }

      // Fetch cloud beans
      const { data, error } = await supabase
        .from('beans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Bean[] = data.map((row: any) => mapBeanRowToDomain(row));
        const mappedIds = new Set(mapped.map((b) => b.id));
        const remainingUnsynced = local.filter(
          (b) => !mappedIds.has(b.id) && !syncedIds.has(b.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        setBeans(merged);
        await persistCachedBeans(merged);
      }
    } catch (err) {
      console.error('fetchBeans error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBeans();
  }, [fetchBeans]);

  const addBean = useCallback(
    async (newBean: AddBeanInput): Promise<Bean> => {
      const id = newBean.id || generateUUID();
      const createdAt = newBean.createdAt || new Date().toISOString();
      const isFrozen = Boolean(newBean.isFrozen);
      const frozenDate =
        newBean.frozenDate ||
        (isFrozen ? new Date().toISOString().split('T')[0] : undefined);
      const bagWeightGrams = newBean.bagWeightGrams;
      const remainingGrams =
        newBean.remainingGrams !== undefined
          ? newBean.remainingGrams
          : bagWeightGrams;

      const fallback: Bean = {
        ...newBean,
        id,
        createdAt,
        flavorNotes: newBean.flavorNotes || [],
        isFavorite: Boolean(newBean.isFavorite),
        isFrozen,
        frozenDate,
        isArchived: Boolean(newBean.isArchived),
        bagWeightGrams,
        remainingGrams,
        userId: user ? user.id : undefined,
      };

      if (!supabase || !user) {
        fallback.userId = undefined;
        const nextBeans = [fallback, ...beans];
        setBeans(nextBeans);
        await persistCachedBeans(nextBeans);
        return fallback;
      }

      try {
        const payload = {
          ...mapBeanDomainToInsert(fallback, user.id),
          id: fallback.id,
        };
        const { data: beanData, error: beanError } = await supabase
          .from('beans')
          .insert(payload)
          .select()
          .single();

        if (beanError || !beanData) {
          console.error('addBean supabase error:', beanError);
          fallback.userId = undefined;
          const nextBeans = [fallback, ...beans];
          setBeans(nextBeans);
          await persistCachedBeans(nextBeans);
          return fallback;
        }

        const created = mapBeanRowToDomain(beanData);
        const nextBeans = [created, ...beans.filter((b) => b.id !== fallback.id)];
        setBeans(nextBeans);
        await persistCachedBeans(nextBeans);
        return created;
      } catch (err) {
        console.error('addBean exception:', err);
        fallback.userId = undefined;
        const nextBeans = [fallback, ...beans];
        setBeans(nextBeans);
        await persistCachedBeans(nextBeans);
        return fallback;
      }
    },
    [user, beans]
  );

  const updateBean = useCallback(
    async (id: string, updates: Partial<Bean>): Promise<Bean> => {
      const existing = beans.find((b) => b.id === id);
      if (!existing) {
        console.warn('Cannot find bean to update:', id);
        throw new Error(`Bean with id ${id} not found`);
      }

      const updatedTarget: Bean = { ...existing, ...updates };
      const nextBeans = beans.map((item) => (item.id === id ? updatedTarget : item));
      setBeans(nextBeans);
      if (activeBrewBean?.id === id) {
        setActiveBrewBeanState(updatedTarget);
      }
      await persistCachedBeans(nextBeans);

      if (supabase && user && updatedTarget.userId === user.id) {
        try {
          const payload = mapBeanDomainToInsert(updatedTarget, user.id);
          await supabase.from('beans').update(payload).eq('id', id);
        } catch (err) {
          console.error('updateBean exception:', err);
        }
      }

      return updatedTarget;
    },
    [user, beans, activeBrewBean]
  );

  const deleteBean = useCallback(
    async (id: string): Promise<void> => {
      const existing = beans.find((b) => b.id === id);
      const nextBeans = beans.filter((b) => b.id !== id);
      setBeans(nextBeans);
      if (activeBrewBean?.id === id) {
        setActiveBrewBeanState(null);
      }
      await persistCachedBeans(nextBeans);

      if (supabase && user && existing?.userId === user.id) {
        try {
          await supabase.from('beans').delete().eq('id', id);
        } catch (err) {
          console.error('deleteBean exception:', err);
        }
      }
    },
    [user, beans, activeBrewBean]
  );

  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      const existing = beans.find((b) => b.id === id);
      if (!existing) return;
      await updateBean(id, { isFavorite: !existing.isFavorite });
    },
    [beans, updateBean]
  );

  const toggleFrozen = useCallback(
    async (id: string): Promise<void> => {
      const existing = beans.find((b) => b.id === id);
      if (!existing) return;
      const nextFrozen = !existing.isFrozen;
      const frozenDate = nextFrozen
        ? new Date().toISOString().split('T')[0]
        : undefined;
      await updateBean(id, { isFrozen: nextFrozen, frozenDate });
    },
    [beans, updateBean]
  );

  const archiveBean = useCallback(
    async (id: string): Promise<void> => {
      await updateBean(id, { isArchived: true });
    },
    [updateBean]
  );

  const unarchiveBean = useCallback(
    async (id: string): Promise<void> => {
      await updateBean(id, { isArchived: false });
    },
    [updateBean]
  );

  const deductBeanDose = useCallback(
    async (id: string, doseGrams: number): Promise<void> => {
      const existing = beans.find((b) => b.id === id);
      if (!existing) {
        console.warn('Cannot find bean for deductBeanDose:', id);
        return;
      }
      const currentRemaining =
        existing.remainingGrams !== undefined
          ? existing.remainingGrams
          : existing.bagWeightGrams || 0;
      const remainingGrams = Math.max(0, currentRemaining - doseGrams);
      await updateBean(id, { remainingGrams });
    },
    [beans, updateBean]
  );

  const setActiveBrewBean = useCallback((bean: Bean | null) => {
    setActiveBrewBeanState(bean);
  }, []);

  const activeBeans = useMemo(
    () => beans.filter((b) => !b.isArchived && !b.isFrozen),
    [beans]
  );

  const frozenBeans = useMemo(
    () => beans.filter((b) => !b.isArchived && b.isFrozen),
    [beans]
  );

  const archivedBeans = useMemo(
    () => beans.filter((b) => Boolean(b.isArchived)),
    [beans]
  );

  const value = useMemo<StashContextValue>(
    () => ({
      beans,
      activeBeans,
      frozenBeans,
      archivedBeans,
      activeBrewBean,
      loading,
      addBean,
      updateBean,
      deleteBean,
      toggleFavorite,
      toggleFrozen,
      archiveBean,
      unarchiveBean,
      deductBeanDose,
      setActiveBrewBean,
      refreshBeans: fetchBeans,
    }),
    [
      beans,
      activeBeans,
      frozenBeans,
      archivedBeans,
      activeBrewBean,
      loading,
      addBean,
      updateBean,
      deleteBean,
      toggleFavorite,
      toggleFrozen,
      archiveBean,
      unarchiveBean,
      deductBeanDose,
      setActiveBrewBean,
      fetchBeans,
    ]
  );

  return <StashContext.Provider value={value}>{children}</StashContext.Provider>;
};

export const useStash = (): StashContextValue => {
  const context = useContext(StashContext);
  if (!context) {
    throw new Error('useStash must be used within a StashProvider');
  }
  return context;
};
