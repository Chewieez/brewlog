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
import { offsetRoastDateForThaw } from './utils/restingUtils';

export const STASH_STORAGE_KEY = '@brewlog/mobile:stash_cache';
export const STASH_PENDING_UPDATES_KEY = '@brewlog/mobile:stash_pending_updates';
export const STASH_PENDING_DELETES_KEY = '@brewlog/mobile:stash_pending_deletes';

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

async function loadPendingUpdates(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STASH_PENDING_UPDATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read pending updates from AsyncStorage:', err);
  }
  return new Set();
}

async function persistPendingUpdates(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STASH_PENDING_UPDATES_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (err) {
    console.error('Failed to write pending updates to AsyncStorage:', err);
  }
}

async function loadPendingDeletes(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STASH_PENDING_DELETES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read pending deletes from AsyncStorage:', err);
  }
  return new Set();
}

async function persistPendingDeletes(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STASH_PENDING_DELETES_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (err) {
    console.error('Failed to write pending deletes to AsyncStorage:', err);
  }
}

export const StashProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [beans, setBeans] = useState<Bean[]>([]);
  const [activeBrewBean, setActiveBrewBeanState] = useState<Bean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isHydrated = useRef<boolean>(false);
  const beansRef = useRef<Bean[]>([]);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    beansRef.current = beans;
  }, [beans]);

  const fetchBeans = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    try {
      if (!isHydrated.current) {
        setLoading(true);
        const [local, pendingUpdates, pendingDeletes] = await Promise.all([
          loadCachedBeans(),
          loadPendingUpdates(),
          loadPendingDeletes(),
        ]);
        if (!isHydrated.current) {
          beansRef.current = local;
          pendingUpdatesRef.current = pendingUpdates;
          pendingDeletesRef.current = pendingDeletes;
          setBeans(local);
          isHydrated.current = true;
        }
        setLoading(false);
      }
      if (!supabase || !user) {
        return;
      }

      // 1. Flush pending deletes to Supabase
      const syncedDeleteIds = new Set<string>();
      if (pendingDeletesRef.current.size > 0) {
        const toDelete = Array.from(pendingDeletesRef.current);
        for (const id of toDelete) {
          try {
            const { error: delErr } = await supabase.from('beans').delete().eq('id', id);
            if (!delErr) {
              syncedDeleteIds.add(id);
              pendingDeletesRef.current.delete(id);
            } else {
              console.error('Failed to sync pending delete:', id, delErr);
            }
          } catch (delEx) {
            console.error('Exception syncing pending delete:', id, delEx);
          }
        }
        await persistPendingDeletes(pendingDeletesRef.current);
      }

      // 2. Auto-sync genuinely unsynced offline beans (!b.userId).
      // Beans with existing b.userId belong to previously synced cloud accounts and must not be re-uploaded.
      const unsynced = beansRef.current.filter((b) => !b.userId);
      const syncedIds = new Set<string>();

      if (unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            const payload = {
              ...mapBeanDomainToInsert(item, user.id),
              id: item.id,
            };
            const query = typeof supabase.from('beans').upsert === 'function'
              ? supabase.from('beans').upsert(payload)
              : supabase.from('beans').insert(payload);
            const { data: beanData, error: beanErr } = await query
              .select()
              .single();

            if (!beanErr && beanData) {
              syncedIds.add(item.id);
            } else if (beanErr) {
              if ((beanErr as { code?: string }).code === '23505') {
                syncedIds.add(item.id);
              } else {
                console.error('Failed to sync offline bean:', item.name, beanErr);
              }
            }
          } catch (syncErr) {
            console.error('Failed to sync offline bean:', item.name, syncErr);
          }
        }
      }

      // 3. Flush pending updates for already-synced beans
      const syncedUpdateIds = new Set<string>();
      if (pendingUpdatesRef.current.size > 0) {
        const toUpdate = Array.from(pendingUpdatesRef.current);
        for (const id of toUpdate) {
          const target = beansRef.current.find((b) => b.id === id);
          if (target && target.userId === user.id) {
            try {
              const payload = mapBeanDomainToInsert(target, user.id);
              const { error: updErr } = await supabase
                .from('beans')
                .update(payload)
                .eq('id', id);

              if (!updErr) {
                syncedUpdateIds.add(id);
                pendingUpdatesRef.current.delete(id);
              } else {
                console.error('Failed to push pending update:', target.name, updErr);
              }
            } catch (updEx) {
              console.error('Exception pushing pending update:', target.name, updEx);
            }
          } else {
            pendingUpdatesRef.current.delete(id);
          }
        }
        await persistPendingUpdates(pendingUpdatesRef.current);
      }

      // 4. Fetch cloud beans
      const { data, error } = await supabase
        .from('beans')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Bean[] = (data as BeanRow[]).map(mapBeanRowToDomain);

        // Filter out any remote rows with pending or just-synced local deletions
        const withoutDeleted = mapped.filter(
          (b) => !pendingDeletesRef.current.has(b.id) && !syncedDeleteIds.has(b.id)
        );

        // Reconcile: If a bean has a pending or just-synced local update,
        // preserve the local version from beansRef.current rather than overwriting with remote row.
        const reconciled = withoutDeleted.map((remoteBean) => {
          if (
            pendingUpdatesRef.current.has(remoteBean.id) ||
            syncedUpdateIds.has(remoteBean.id)
          ) {
            const localBean = beansRef.current.find((b) => b.id === remoteBean.id);
            return localBean || remoteBean;
          }
          return remoteBean;
        });

        // Only preserve genuinely unsynced offline beans (!b.userId) that failed to sync or were added concurrently.
        // Deduplicate against remoteIds so that if an item already exists in the cloud
        // (e.g. from an earlier interrupted sync or concurrent upsert), we do not keep a duplicate
        // local record with !b.userId in local state.
        const remoteIds = new Set(withoutDeleted.map((b) => b.id));
        const remainingUnsynced = beansRef.current.filter(
          (b) => !b.userId && !remoteIds.has(b.id) && !syncedIds.has(b.id)
        );
        const merged = [...remainingUnsynced, ...reconciled];
        beansRef.current = merged;
        setBeans(merged);
        await persistCachedBeans(merged);
      } else if (error) {
        console.error('fetchBeans select error:', error);
      }
    } catch (err) {
      console.error('fetchBeans error:', err);
    } finally {
      isFetchingRef.current = false;
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
        userId: undefined,
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
        const query = typeof supabase.from('beans').upsert === 'function'
          ? supabase.from('beans').upsert(payload)
          : supabase.from('beans').insert(payload);
        const { data: beanData, error: beanError } = await query
          .select()
          .single();

        if (beanError || !beanData) {
          console.error('addBean supabase error:', beanError);
          // Supabase failed: preserve local bean as unsynced (already has userId: undefined) for subsequent sync
          return fallback;
        }

        const created = mapBeanRowToDomain(beanData as BeanRow);
        beansRef.current = beansRef.current.map((b) =>
          b.id === fallback.id ? { ...created, ...b, userId: created.userId } : b
        );
        setBeans((prev) =>
          prev.map((b) =>
            b.id === fallback.id ? { ...created, ...b, userId: created.userId } : b
          )
        );
        await persistCachedBeans(beansRef.current);
        return created;
      } catch (err) {
        console.error('addBean exception:', err);
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
        pendingUpdatesRef.current.add(id);
        await persistPendingUpdates(pendingUpdatesRef.current);
        try {
          const payload = mapBeanDomainToInsert(updatedTarget, user.id);
          const { error } = await supabase.from('beans').update(payload).eq('id', id);
          if (error) {
            console.error('updateBean supabase error:', error);
          } else {
            pendingUpdatesRef.current.delete(id);
            await persistPendingUpdates(pendingUpdatesRef.current);
          }
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
        pendingDeletesRef.current.add(id);
        pendingUpdatesRef.current.delete(id);
        await Promise.all([
          persistPendingDeletes(pendingDeletesRef.current),
          persistPendingUpdates(pendingUpdatesRef.current),
        ]);
        try {
          const { error } = await supabase.from('beans').delete().eq('id', id);
          if (error) {
            console.error('deleteBean supabase error:', error);
          } else {
            pendingDeletesRef.current.delete(id);
            await persistPendingDeletes(pendingDeletesRef.current);
          }
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
        let frozenDate: string | undefined;
        let roastDate = existing.roastDate;

        if (nextFrozen) {
          frozenDate = new Date().toISOString().split('T')[0];
        } else {
          frozenDate = undefined;
          if (existing.roastDate && existing.frozenDate) {
            roastDate = offsetRoastDateForThaw(existing.roastDate, existing.frozenDate);
          }
        }

        return { isFrozen: nextFrozen, frozenDate, roastDate };
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
