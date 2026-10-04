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
import { Equipment, DEFAULT_INITIAL_EQUIPMENT } from '@brewlog/core';
import {
  EquipmentRow,
  mapEquipmentRowToDomain,
  mapEquipmentDomainToInsert,
} from '@brewlog/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export const EQUIPMENT_STORAGE_KEY = '@brewlog/mobile:equipment_cache';
export const EQUIPMENT_PENDING_UPDATES_KEY = '@brewlog/mobile:equipment_pending_updates';
export const EQUIPMENT_PENDING_DELETES_KEY = '@brewlog/mobile:equipment_pending_deletes';

export type AddEquipmentInput = Omit<Equipment, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

export type EquipmentUpdater =
  | Partial<Equipment>
  | ((prev: Equipment) => Partial<Equipment>);

export interface EquipmentContextValue {
  equipment: Equipment[];
  grinders: Equipment[];
  brewers: Equipment[];
  scales: Equipment[];
  kettles: Equipment[];
  other: Equipment[];
  loading: boolean;
  addEquipment: (item: AddEquipmentInput) => Promise<Equipment>;
  updateEquipment: (id: string, updates: EquipmentUpdater) => Promise<Equipment>;
  deleteEquipment: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refreshEquipment: () => Promise<void>;
}

export const EquipmentContext = createContext<EquipmentContextValue | null>(null);

async function loadCachedEquipment(): Promise<Equipment[]> {
  try {
    const raw = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read cached equipment from AsyncStorage:', err);
  }
  await persistCachedEquipment(DEFAULT_INITIAL_EQUIPMENT);
  return DEFAULT_INITIAL_EQUIPMENT;
}

async function persistCachedEquipment(items: Equipment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to write cached equipment to AsyncStorage:', err);
  }
}

async function loadPendingUpdates(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(EQUIPMENT_PENDING_UPDATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read pending equipment updates from AsyncStorage:', err);
  }
  return new Set();
}

async function persistPendingUpdates(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      EQUIPMENT_PENDING_UPDATES_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (err) {
    console.error('Failed to write pending equipment updates to AsyncStorage:', err);
  }
}

async function loadPendingDeletes(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(EQUIPMENT_PENDING_DELETES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read pending equipment deletes from AsyncStorage:', err);
  }
  return new Set();
}

async function persistPendingDeletes(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      EQUIPMENT_PENDING_DELETES_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (err) {
    console.error('Failed to write pending equipment deletes to AsyncStorage:', err);
  }
}

export const EquipmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isHydrated = useRef<boolean>(false);
  const equipmentRef = useRef<Equipment[]>([]);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    equipmentRef.current = equipment;
  }, [equipment]);

  const fetchEquipment = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    try {
      if (!isHydrated.current) {
        setLoading(true);
        const [local, pendingUpdates, pendingDeletes] = await Promise.all([
          loadCachedEquipment(),
          loadPendingUpdates(),
          loadPendingDeletes(),
        ]);
        if (!isHydrated.current) {
          equipmentRef.current = local;
          pendingUpdatesRef.current = pendingUpdates;
          pendingDeletesRef.current = pendingDeletes;
          setEquipment(local);
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
            const { error: delErr } = await supabase.from('equipment').delete().eq('id', id);
            if (!delErr) {
              syncedDeleteIds.add(id);
              pendingDeletesRef.current.delete(id);
            } else {
              console.error('Failed to sync pending equipment delete:', id, delErr);
            }
          } catch (delEx) {
            console.error('Exception syncing pending equipment delete:', id, delEx);
          }
        }
        await persistPendingDeletes(pendingDeletesRef.current);
      }

      // 2. Auto-sync genuinely unsynced offline equipment (id starts with local-eq-)
      const unsynced = equipmentRef.current.filter((e) => e.id.startsWith('local-eq-'));
      const syncedIds = new Set<string>();

      if (unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            const payload = mapEquipmentDomainToInsert(item, user.id);
            const query = typeof supabase.from('equipment').upsert === 'function'
              ? supabase.from('equipment').upsert(payload)
              : supabase.from('equipment').insert(payload);
            const { data: eqData, error: eqErr } = await query
              .select()
              .single();

            if (!eqErr && eqData) {
              syncedIds.add(item.id);
              const mapped = mapEquipmentRowToDomain(eqData);
              equipmentRef.current = equipmentRef.current.map((e) =>
                e.id === item.id ? mapped : e
              );
              setEquipment([...equipmentRef.current]);
              await persistCachedEquipment(equipmentRef.current);

              if (pendingUpdatesRef.current.has(item.id)) {
                pendingUpdatesRef.current.delete(item.id);
                pendingUpdatesRef.current.add(mapped.id);
                await persistPendingUpdates(pendingUpdatesRef.current);
              }

              if (pendingDeletesRef.current.has(item.id)) {
                pendingDeletesRef.current.delete(item.id);
                pendingDeletesRef.current.add(mapped.id);
                await persistPendingDeletes(pendingDeletesRef.current);
              }
            } else if (eqErr) {
              console.error('Failed to sync offline equipment:', item.model, eqErr);
            }
          } catch (syncErr) {
            console.error('Failed to sync offline equipment:', item.model, syncErr);
          }
        }
      }

      // 3. Flush pending updates for already-synced equipment
      const syncedUpdateIds = new Set<string>();
      if (pendingUpdatesRef.current.size > 0) {
        const toUpdate = Array.from(pendingUpdatesRef.current);
        for (const id of toUpdate) {
          const target = equipmentRef.current.find((e) => e.id === id);
          if (target && target.userId === user.id) {
            try {
              const payload = mapEquipmentDomainToInsert(target, user.id);
              const { error: updErr } = await supabase
                .from('equipment')
                .update(payload)
                .eq('id', id);

              if (!updErr) {
                syncedUpdateIds.add(id);
                pendingUpdatesRef.current.delete(id);
              } else {
                console.error('Failed to push pending equipment update:', target.model, updErr);
              }
            } catch (updEx) {
              console.error('Exception pushing pending equipment update:', target.model, updEx);
            }
          } else {
            pendingUpdatesRef.current.delete(id);
          }
        }
        await persistPendingUpdates(pendingUpdatesRef.current);
      }

      // 4. Fetch cloud equipment
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Equipment[] = (data as EquipmentRow[]).map(mapEquipmentRowToDomain);

        // Filter out any remote rows with pending or just-synced local deletions
        const withoutDeleted = mapped.filter(
          (e) => !pendingDeletesRef.current.has(e.id) && !syncedDeleteIds.has(e.id)
        );

        // Reconcile: If an item has a pending or just-synced local update, preserve local version
        const reconciled = withoutDeleted.map((remoteEq) => {
          if (
            pendingUpdatesRef.current.has(remoteEq.id) ||
            syncedUpdateIds.has(remoteEq.id)
          ) {
            const localEq = equipmentRef.current.find((e) => e.id === remoteEq.id);
            return localEq || remoteEq;
          }
          return remoteEq;
        });

        // Only preserve genuinely unsynced offline items (starts with local-eq-) that failed to sync or were added concurrently
        const remoteIds = new Set(withoutDeleted.map((e) => e.id));
        const remainingUnsynced = equipmentRef.current.filter(
          (e) => e.id.startsWith('local-eq-') && !remoteIds.has(e.id) && !syncedIds.has(e.id)
        );
        const merged = [...remainingUnsynced, ...reconciled];
        equipmentRef.current = merged;
        setEquipment(merged);
        await persistCachedEquipment(merged);
      } else if (error) {
        console.error('fetchEquipment select error:', error);
      }
    } catch (err) {
      console.error('fetchEquipment error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const addEquipment = useCallback(
    async (item: AddEquipmentInput): Promise<Equipment> => {
      const id =
        item.id ||
        `local-eq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = item.createdAt || new Date().toISOString();
      const isFavorite = Boolean(item.isFavorite);

      const fallback: Equipment = {
        ...item,
        id,
        createdAt,
        isFavorite,
        userId: undefined,
      };

      // Optimistic immediate UI response: update state and AsyncStorage before awaiting Supabase
      const nextEquipment = [fallback, ...equipmentRef.current.filter((e) => e.id !== fallback.id)];
      equipmentRef.current = nextEquipment;
      setEquipment((prev) => [fallback, ...prev.filter((e) => e.id !== fallback.id)]);
      await persistCachedEquipment(nextEquipment);

      if (!supabase || !user) {
        return fallback;
      }

      try {
        const payload = {
          ...mapEquipmentDomainToInsert(fallback, user.id),
          ...(item.id && !item.id.startsWith('local-eq-') ? { id: item.id } : {}),
        };
        const query = typeof supabase.from('equipment').upsert === 'function'
          ? supabase.from('equipment').upsert(payload)
          : supabase.from('equipment').insert(payload);
        const { data: eqData, error: eqError } = await query
          .select()
          .single();

        if (eqError || !eqData) {
          console.error('addEquipment supabase error:', eqError);
          return fallback;
        }

        const created = mapEquipmentRowToDomain(eqData as EquipmentRow);
        equipmentRef.current = equipmentRef.current.map((e) =>
          e.id === fallback.id ? created : e
        );
        setEquipment((prev) =>
          prev.map((e) =>
            e.id === fallback.id ? created : e
          )
        );
        await persistCachedEquipment(equipmentRef.current);
        return created;
      } catch (err) {
        console.error('addEquipment exception:', err);
        return fallback;
      }
    },
    [user]
  );

  const updateEquipment = useCallback(
    async (id: string, updates: EquipmentUpdater): Promise<Equipment> => {
      const existing = equipmentRef.current.find((e) => e.id === id);
      if (!existing) {
        console.warn('Cannot find equipment to update:', id);
        throw new Error(`Equipment with id ${id} not found`);
      }

      const resolved = typeof updates === 'function' ? updates(existing) : updates;
      const updatedTarget: Equipment = { ...existing, ...resolved };
      const nextList = equipmentRef.current.map((item) =>
        item.id === id ? updatedTarget : item
      );
      equipmentRef.current = nextList;
      setEquipment((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...resolved } : item))
      );
      await persistCachedEquipment(nextList);

      if (id.startsWith('local-eq-') || id.startsWith('eq-') || !updatedTarget.userId) {
        return updatedTarget;
      }

      if (supabase && user && updatedTarget.userId === user.id) {
        pendingUpdatesRef.current.add(id);
        await persistPendingUpdates(pendingUpdatesRef.current);
        try {
          const payload = mapEquipmentDomainToInsert(updatedTarget, user.id);
          const { error } = await supabase.from('equipment').update(payload).eq('id', id);
          if (error) {
            console.error('updateEquipment supabase error:', error);
          } else {
            pendingUpdatesRef.current.delete(id);
            await persistPendingUpdates(pendingUpdatesRef.current);
          }
        } catch (err) {
          console.error('updateEquipment exception:', err);
        }
      } else if (!user) {
        pendingUpdatesRef.current.add(id);
        await persistPendingUpdates(pendingUpdatesRef.current);
      }

      return updatedTarget;
    },
    [user]
  );

  const deleteEquipment = useCallback(
    async (id: string): Promise<void> => {
      const target = equipmentRef.current.find((e) => e.id === id);
      const nextList = equipmentRef.current.filter((e) => e.id !== id);
      equipmentRef.current = nextList;
      setEquipment((prev) => prev.filter((e) => e.id !== id));
      await persistCachedEquipment(nextList);

      if (id.startsWith('local-eq-') || id.startsWith('eq-') || !target?.userId) {
        if (pendingUpdatesRef.current.has(id)) {
          pendingUpdatesRef.current.delete(id);
          await persistPendingUpdates(pendingUpdatesRef.current);
        }
        return;
      }

      pendingDeletesRef.current.add(id);
      pendingUpdatesRef.current.delete(id);
      await Promise.all([
        persistPendingDeletes(pendingDeletesRef.current),
        persistPendingUpdates(pendingUpdatesRef.current),
      ]);

      if (supabase && user && target?.userId === user.id) {
        try {
          const { error } = await supabase.from('equipment').delete().eq('id', id);
          if (error) {
            console.error('deleteEquipment supabase error:', error);
          } else {
            pendingDeletesRef.current.delete(id);
            await persistPendingDeletes(pendingDeletesRef.current);
          }
        } catch (err) {
          console.error('deleteEquipment exception:', err);
        }
      }
    },
    [user]
  );

  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      await updateEquipment(id, (existing) => ({ isFavorite: !existing.isFavorite }));
    },
    [updateEquipment]
  );

  const grinders = useMemo(
    () => equipment.filter((e) => e.type === 'grinder'),
    [equipment]
  );

  const brewers = useMemo(
    () => equipment.filter((e) => e.type === 'brewer'),
    [equipment]
  );

  const scales = useMemo(
    () => equipment.filter((e) => e.type === 'scale'),
    [equipment]
  );

  const kettles = useMemo(
    () => equipment.filter((e) => e.type === 'kettle'),
    [equipment]
  );

  const other = useMemo(
    () => equipment.filter((e) => e.type === 'other'),
    [equipment]
  );

  const value = useMemo<EquipmentContextValue>(
    () => ({
      equipment,
      grinders,
      brewers,
      scales,
      kettles,
      other,
      loading,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      toggleFavorite,
      refreshEquipment: fetchEquipment,
    }),
    [
      equipment,
      grinders,
      brewers,
      scales,
      kettles,
      other,
      loading,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      toggleFavorite,
      fetchEquipment,
    ]
  );

  return <EquipmentContext.Provider value={value}>{children}</EquipmentContext.Provider>;
};

export const useOptionalEquipment = (): EquipmentContextValue | null => {
  return useContext(EquipmentContext);
};

export const useEquipment = (): EquipmentContextValue => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error('useEquipment must be used within an EquipmentProvider');
  }
  return context;
};
