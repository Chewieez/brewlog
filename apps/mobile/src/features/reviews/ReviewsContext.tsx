import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TastingLog,
  DEFAULT_INITIAL_TASTING_LOGS,
  Bean,
  BrewRecipe,
} from '@brewlog/core';
import {
  TastingLogRow,
  mapTastingLogRowToDomain,
  mapTastingLogDomainToInsert,
  isValidUUID,
} from '@brewlog/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export const REVIEWS_STORAGE_KEY = '@brewlog/mobile:reviews_cache';
export const REVIEWS_PENDING_UPDATES_KEY = '@brewlog/mobile:reviews_pending_updates';
export const REVIEWS_PENDING_DELETES_KEY = '@brewlog/mobile:reviews_pending_deletes';

export interface PendingBrewSession {
  recipe: BrewRecipe;
  actualDose: number;
  actualWater: number;
  actualTimeSeconds: number;
  splitsNotes?: string;
  beanId?: string;
  sourceBean?: Bean;
  grinderId?: string;
  brewerId?: string;
  grindSetting?: string;
}

export type AddReviewInput = Omit<TastingLog, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

export type ReviewUpdater =
  | Partial<TastingLog>
  | ((prev: TastingLog) => Partial<TastingLog>);

export interface ReviewsContextValue {
  reviews: TastingLog[];
  loading: boolean;
  pendingBrewSession: PendingBrewSession | null;
  setPendingBrewSession: (session: PendingBrewSession | null) => void;
  addReview: (item: AddReviewInput) => Promise<TastingLog>;
  updateReview: (id: string, updates: ReviewUpdater) => Promise<TastingLog>;
  deleteReview: (id: string) => Promise<void>;
  refreshReviews: () => Promise<void>;
}

export const ReviewsContext = createContext<ReviewsContextValue | null>(null);

async function loadCachedReviews(): Promise<TastingLog[]> {
  try {
    const raw = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read cached reviews from AsyncStorage:', err);
  }
  await persistCachedReviews(DEFAULT_INITIAL_TASTING_LOGS);
  return DEFAULT_INITIAL_TASTING_LOGS;
}

async function persistCachedReviews(items: TastingLog[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to write cached reviews to AsyncStorage:', err);
  }
}

async function loadPendingUpdates(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(REVIEWS_PENDING_UPDATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read pending review updates from AsyncStorage:', err);
  }
  return new Set();
}

async function persistPendingUpdates(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REVIEWS_PENDING_UPDATES_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (err) {
    console.error('Failed to write pending review updates to AsyncStorage:', err);
  }
}

async function loadPendingDeletes(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(REVIEWS_PENDING_DELETES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read pending review deletes from AsyncStorage:', err);
  }
  return new Set();
}

async function persistPendingDeletes(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REVIEWS_PENDING_DELETES_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch (err) {
    console.error('Failed to write pending review deletes to AsyncStorage:', err);
  }
}

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<TastingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null);

  const isHydrated = useRef<boolean>(false);
  const reviewsRef = useRef<TastingLog[]>([]);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    reviewsRef.current = reviews;
  }, [reviews]);

  const fetchReviews = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    try {
      if (!isHydrated.current) {
        setLoading(true);
        const [local, pendingUpdates, pendingDeletes] = await Promise.all([
          loadCachedReviews(),
          loadPendingUpdates(),
          loadPendingDeletes(),
        ]);
        if (!isHydrated.current) {
          reviewsRef.current = local;
          pendingUpdatesRef.current = pendingUpdates;
          pendingDeletesRef.current = pendingDeletes;
          setReviews(local);
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
          if (!isValidUUID(id)) {
            pendingDeletesRef.current.delete(id);
            continue;
          }
          try {
            const { error: delErr } = await supabase.from('tasting_logs').delete().eq('id', id);
            if (!delErr) {
              syncedDeleteIds.add(id);
              pendingDeletesRef.current.delete(id);
            } else {
              console.error('Failed to sync pending review delete:', id, delErr);
            }
          } catch (delEx) {
            console.error('Exception syncing pending review delete:', id, delEx);
          }
        }
        await persistPendingDeletes(pendingDeletesRef.current);
      }

      // 2. Auto-sync genuinely unsynced offline reviews (starts with local-rev-)
      const unsynced = reviewsRef.current.filter((r) => r.id.startsWith('local-rev-'));
      const syncedIds = new Set<string>();

      if (unsynced.length > 0) {
        for (const item of unsynced) {
          try {
            const payload = mapTastingLogDomainToInsert(item, user.id);
            const table = supabase.from('tasting_logs');
            const query = typeof table.upsert === 'function'
              ? table.upsert(payload)
              : typeof table.insert === 'function'
              ? table.insert(payload)
              : null;
            if (!query) {
              continue;
            }
            const { data: revData, error: revErr } = await query
              .select()
              .single();

            if (!revErr && revData) {
              syncedIds.add(item.id);
              const mapped = mapTastingLogRowToDomain(revData as TastingLogRow);
              reviewsRef.current = reviewsRef.current.map((r) =>
                r.id === item.id ? mapped : r
              );
              setReviews([...reviewsRef.current]);
              await persistCachedReviews(reviewsRef.current);

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
            } else if (revErr) {
              console.error('Failed to sync offline review:', item.beanNameSnapshot, revErr);
            }
          } catch (syncErr) {
            console.error('Failed to sync offline review:', item.beanNameSnapshot, syncErr);
          }
        }
      }

      // 3. Flush pending updates for already-synced reviews
      const syncedUpdateIds = new Set<string>();
      if (pendingUpdatesRef.current.size > 0) {
        const toUpdate = Array.from(pendingUpdatesRef.current);
        for (const id of toUpdate) {
          if (!isValidUUID(id)) {
            pendingUpdatesRef.current.delete(id);
            continue;
          }
          const target = reviewsRef.current.find((r) => r.id === id);
          if (target && target.userId === user.id) {
            try {
              const payload = mapTastingLogDomainToInsert(target, user.id);
              const { error: updErr } = await supabase
                .from('tasting_logs')
                .update(payload)
                .eq('id', id);

              if (!updErr) {
                syncedUpdateIds.add(id);
                pendingUpdatesRef.current.delete(id);
              } else {
                console.error('Failed to push pending review update:', target.beanNameSnapshot, updErr);
              }
            } catch (updEx) {
              console.error('Exception pushing pending review update:', target.beanNameSnapshot, updEx);
            }
          } else {
            pendingUpdatesRef.current.delete(id);
          }
        }
        await persistPendingUpdates(pendingUpdatesRef.current);
      }

      // 4. Fetch cloud reviews
      const { data, error } = await supabase
        .from('tasting_logs')
        .select('*')
        .order('brew_date', { ascending: false });

      if (!error && data) {
        const mapped: TastingLog[] = (data as TastingLogRow[]).map(mapTastingLogRowToDomain);

        // Filter out any remote rows with pending or just-synced local deletions
        const withoutDeleted = mapped.filter(
          (r) => !pendingDeletesRef.current.has(r.id) && !syncedDeleteIds.has(r.id)
        );

        // Reconcile: If an item has a pending or just-synced local update, preserve local version
        const reconciled = withoutDeleted.map((remoteRev) => {
          if (
            pendingUpdatesRef.current.has(remoteRev.id) ||
            syncedUpdateIds.has(remoteRev.id)
          ) {
            const localRev = reviewsRef.current.find((r) => r.id === remoteRev.id);
            return localRev || remoteRev;
          }
          return remoteRev;
        });

        // Only preserve genuinely unsynced offline items (starts with local-rev-) that failed to sync or were added concurrently
        const remoteIds = new Set(withoutDeleted.map((r) => r.id));
        const remainingUnsynced = reviewsRef.current.filter(
          (r) => r.id.startsWith('local-rev-') && !remoteIds.has(r.id) && !syncedIds.has(r.id)
        );
        const merged = [...remainingUnsynced, ...reconciled];
        reviewsRef.current = merged;
        setReviews(merged);
        await persistCachedReviews(merged);
      } else if (error) {
        console.error('fetchReviews select error:', error);
      }
    } catch (err) {
      console.error('fetchReviews error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const addReview = useCallback(
    async (item: AddReviewInput): Promise<TastingLog> => {
      const id =
        item.id ||
        `local-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = item.createdAt || new Date().toISOString();

      const fallback: TastingLog = {
        ...item,
        id,
        createdAt,
        userId: undefined,
      };

      // Optimistic immediate UI response: update state and AsyncStorage before awaiting Supabase
      const nextReviews = [fallback, ...reviewsRef.current.filter((r) => r.id !== fallback.id)];
      reviewsRef.current = nextReviews;
      setReviews((prev) => [fallback, ...prev.filter((r) => r.id !== fallback.id)]);
      await persistCachedReviews(nextReviews);

      if (!supabase || !user) {
        return fallback;
      }

      try {
        const payload = {
          ...mapTastingLogDomainToInsert(fallback, user.id),
          ...(item.id && !item.id.startsWith('local-rev-') ? { id: item.id } : {}),
        };
        const table = supabase.from('tasting_logs');
        const query = typeof table.upsert === 'function'
          ? table.upsert(payload)
          : typeof table.insert === 'function'
          ? table.insert(payload)
          : null;
        if (!query) {
          return fallback;
        }
        const { data: revData, error: revError } = await query
          .select()
          .single();

        if (revError || !revData) {
          console.error('addReview supabase error:', revError);
          return fallback;
        }

        const created = mapTastingLogRowToDomain(revData as TastingLogRow);
        reviewsRef.current = reviewsRef.current.map((r) =>
          r.id === fallback.id ? created : r
        );
        setReviews((prev) =>
          prev.map((r) =>
            r.id === fallback.id ? created : r
          )
        );
        await persistCachedReviews(reviewsRef.current);
        return created;
      } catch (err) {
        console.error('addReview exception:', err);
        return fallback;
      }
    },
    [user]
  );

  const updateReview = useCallback(
    async (id: string, updates: ReviewUpdater): Promise<TastingLog> => {
      const existing = reviewsRef.current.find((r) => r.id === id);
      if (!existing) {
        console.warn('Cannot find review to update:', id);
        throw new Error(`Review with id ${id} not found`);
      }

      const resolved = typeof updates === 'function' ? updates(existing) : updates;
      const updatedTarget: TastingLog = { ...existing, ...resolved };
      const nextList = reviewsRef.current.map((item) =>
        item.id === id ? updatedTarget : item
      );
      reviewsRef.current = nextList;
      setReviews((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...resolved } : item))
      );
      await persistCachedReviews(nextList);

      // Postgres 22P02 Guard: only push remote updates if id is a valid UUID
      if (id.startsWith('local-rev-') || id.startsWith('log-') || !isValidUUID(id) || !updatedTarget.userId) {
        return updatedTarget;
      }

      if (supabase && user && updatedTarget.userId === user.id) {
        pendingUpdatesRef.current.add(id);
        await persistPendingUpdates(pendingUpdatesRef.current);
        try {
          const payload = mapTastingLogDomainToInsert(updatedTarget, user.id);
          const { error } = await supabase.from('tasting_logs').update(payload).eq('id', id);
          if (error) {
            console.error('updateReview supabase error:', error);
          } else {
            pendingUpdatesRef.current.delete(id);
            await persistPendingUpdates(pendingUpdatesRef.current);
          }
        } catch (err) {
          console.error('updateReview exception:', err);
        }
      } else if (!user) {
        pendingUpdatesRef.current.add(id);
        await persistPendingUpdates(pendingUpdatesRef.current);
      }

      return updatedTarget;
    },
    [user]
  );

  const deleteReview = useCallback(
    async (id: string): Promise<void> => {
      const target = reviewsRef.current.find((r) => r.id === id);
      const nextList = reviewsRef.current.filter((r) => r.id !== id);
      reviewsRef.current = nextList;
      setReviews((prev) => prev.filter((r) => r.id !== id));
      await persistCachedReviews(nextList);

      // Postgres 22P02 Guard: skip remote call if local ID or non-UUID
      if (id.startsWith('local-rev-') || id.startsWith('log-') || !isValidUUID(id) || !target?.userId) {
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
          const { error } = await supabase.from('tasting_logs').delete().eq('id', id);
          if (error) {
            console.error('deleteReview supabase error:', error);
          } else {
            pendingDeletesRef.current.delete(id);
            await persistPendingDeletes(pendingDeletesRef.current);
          }
        } catch (err) {
          console.error('deleteReview exception:', err);
        }
      }
    },
    [user]
  );

  const refreshReviews = useCallback(async () => {
    await fetchReviews();
  }, [fetchReviews]);

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        loading,
        pendingBrewSession,
        setPendingBrewSession,
        addReview,
        updateReview,
        deleteReview,
        refreshReviews,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  );
};

export function useReviews(): ReviewsContextValue {
  const context = useContext(ReviewsContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }
  return context;
}

export function useOptionalReviews(): ReviewsContextValue | null {
  return useContext(ReviewsContext);
}
