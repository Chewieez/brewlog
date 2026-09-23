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
import { Bean } from '@brewlog/core';
import { BeanRow, mapBeanRowToDomain, mapBeanDomainToInsert } from '@brewlog/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export const STASH_STORAGE_KEY = '@brewlog/mobile:stash_cache';

export type AddBeanInput = Omit<Bean, 'id' | 'createdAt' | 'flavorNotes'> & {
  flavorNotes?: string[];
  id?: string;
  createdAt?: string;
};

export type BeanUpdater = Partial<Bean> | ((prev: Bean) => Partial<Bean>);

export interface StashContextValue {
  beans: Bean[];
  activeBeans: Bean[];
  frozenBeans: Bean[];
  archivedBeans: Bean[];
  activeBrewBean: Bean | null;
  loading: boolean;
  addBean: (bean: AddBeanInput) => Promise<Bean>;
  updateBean: (id: string, updates: BeanUpdater) => Promise<Bean>;
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
  const isHydrated = useRef<boolean>(false);
  const beansRef = useRef<Bean[]>([]);

  useEffect(() => {
    beansRef.current = beans;
  }, [beans]);

  const fetchBeans = useCallback(async () => {
    if (!isHydrated.current) {
      setLoading(true);
    }
    try {
      const local = await loadCachedBeans();
      beansRef.current = local;
      setBeans(local);
      if (!isHydrated.current) {
        isHydrated.current = true;
        setLoading(false);
      }

      if (!supabase || !user) {
        return;
      }

      // Auto-sync genuinely unsynced offline beans (!b.userId).
      // Beans with existing b.userId belong to previously synced cloud accounts and must not be re-uploaded.
      const unsynced = local.filter((b) => !b.userId);
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
        const mapped: Bean[] = (data as BeanRow[]).map(mapBeanRowToDomain);
        // Only preserve genuinely unsynced offline beans (!b.userId) that failed to sync.
        // Previously synced beans (with a userId) missing from cloud were deleted on remote; do not resurrect them.
        const remainingUnsynced = local.filter(
          (b) => !b.userId && !syncedIds.has(b.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        beansRef.current = merged;
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

      // Optimistic immediate UI response: update state and AsyncStorage before awaiting Supabase
      const nextBeans = [fallback, ...beansRef.current.filter((b) => b.id !== fallback.id)];
      beansRef.current = nextBeans;
      setBeans((prev) => [fallback, ...prev.filter((b) => b.id !== fallback.id)]);
      await persistCachedBeans(nextBeans);

      if (!supabase || !user) {
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
          // Supabase failed: preserve local bean as unsynced (clear userId) for subsequent sync
          beansRef.current = beansRef.current.map((b) =>
            b.id === fallback.id ? { ...b, userId: undefined } : b
          );
          setBeans((prev) =>
            prev.map((b) => (b.id === fallback.id ? { ...b, userId: undefined } : b))
          );
          await persistCachedBeans(beansRef.current);
          return fallback;
        }

        const created = mapBeanRowToDomain(beanData as BeanRow);
        beansRef.current = beansRef.current.map((b) =>
          b.id === fallback.id ? created : b
        );
        setBeans((prev) =>
          prev.map((b) => (b.id === fallback.id ? created : b))
        );
        await persistCachedBeans(beansRef.current);
        return created;
      } catch (err) {
        console.error('addBean exception:', err);
        beansRef.current = beansRef.current.map((b) =>
          b.id === fallback.id ? { ...b, userId: undefined } : b
        );
        setBeans((prev) =>
          prev.map((b) => (b.id === fallback.id ? { ...b, userId: undefined } : b))
        );
        await persistCachedBeans(beansRef.current);
        return fallback;
      }
    },
    [user]
  );

  const updateBean = useCallback(
    async (id: string, updates: BeanUpdater): Promise<Bean> => {
      const existing = beansRef.current.find((b) => b.id === id);
      if (!existing) {
        console.warn('Cannot find bean to update:', id);
        throw new Error(`Bean with id ${id} not found`);
      }

      const resolved =
        typeof updates === 'function' ? updates(existing) : updates;
      const updatedTarget: Bean = { ...existing, ...resolved };
      const nextBeansList = beansRef.current.map((item) =>
        item.id === id ? updatedTarget : item
      );
      beansRef.current = nextBeansList;
      setBeans((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...resolved } : item))
      );

      setActiveBrewBeanState((prevActive) =>
        prevActive?.id === id ? updatedTarget : prevActive
      );
      await persistCachedBeans(nextBeansList);

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
    [user]
  );

  const deleteBean = useCallback(
    async (id: string): Promise<void> => {
      const targetBean = beansRef.current.find((b) => b.id === id);
      const nextBeansList = beansRef.current.filter((b) => b.id !== id);
      beansRef.current = nextBeansList;
      setBeans((prev) => prev.filter((b) => b.id !== id));

      setActiveBrewBeanState((prevActive) =>
        prevActive?.id === id ? null : prevActive
      );
      await persistCachedBeans(nextBeansList);

      if (supabase && user && targetBean?.userId === user.id) {
        try {
          await supabase.from('beans').delete().eq('id', id);
        } catch (err) {
          console.error('deleteBean exception:', err);
        }
      }
    },
    [user]
  );

  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      await updateBean(id, (existing) => ({ isFavorite: !existing.isFavorite }));
    },
    [updateBean]
  );

  const toggleFrozen = useCallback(
    async (id: string): Promise<void> => {
      await updateBean(id, (existing) => {
        const nextFrozen = !existing.isFrozen;
        const frozenDate = nextFrozen
          ? new Date().toISOString().split('T')[0]
          : undefined;
        return { isFrozen: nextFrozen, frozenDate };
      });
    },
    [updateBean]
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
      await updateBean(id, (existing) => {
        const currentRemaining =
          existing.remainingGrams !== undefined
            ? existing.remainingGrams
            : existing.bagWeightGrams || 0;
        const remainingGrams = Math.max(0, currentRemaining - doseGrams);
        return { remainingGrams };
      });
    },
    [updateBean]
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

export const useOptionalStash = (): StashContextValue | null => {
  return useContext(StashContext);
};

export const useStash = (): StashContextValue => {
  const context = useContext(StashContext);
  if (!context) {
    throw new Error('useStash must be used within a StashProvider');
  }
  return context;
};
