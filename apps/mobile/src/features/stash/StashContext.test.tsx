/** @vitest-environment jsdom */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StashProvider, useStash } from './StashContext';
import { Bean } from '@brewlog/core';

interface TestUser {
  id: string;
  email: string;
}

const mockUser: TestUser = { id: 'test-user-uuid', email: 'barista@brewlog.dev' };
let mockAuthUser: TestUser | null = null;

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    session: null,
    loading: false,
  }),
}));

const mockSupabaseFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

describe('StashContext', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    mockAuthUser = null;
    mockSupabaseFrom.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StashProvider>{children}</StashProvider>
  );

  it('hydrates from AsyncStorage cache immediately', async () => {
    const cachedBean: Bean = {
      id: 'cached-1',
      roaster: 'Sey',
      name: 'Worka',
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('@brewlog/mobile:stash_cache', JSON.stringify([cachedBean]));

    const { result } = renderHook(() => useStash(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.beans[0].name).toBe('Worka');
    expect(result.current.activeBeans).toHaveLength(1);
  });

  it('adds a new bean and stores it in AsyncStorage', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Passenger',
        name: 'Divisoria',
        flavorNotes: ['Plum'],
        bagWeightGrams: 250,
        remainingGrams: 250,
      });
    });

    expect(created?.id).toBeDefined();
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.activeBeans).toHaveLength(1);

    const stored = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(stored).toContain('Divisoria');
  });

  it('provides optimistic immediate UI response when adding a bean while authenticated', async () => {
    mockAuthUser = mockUser;

    let resolveInsert: (value: unknown) => void = () => {};
    const insertPromise = new Promise((resolve) => {
      resolveInsert = resolve;
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockReturnValue(insertPromise),
      }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Call addBean without waiting for Supabase promise to resolve yet
    let addPromise: Promise<Bean>;
    act(() => {
      addPromise = result.current.addBean({
        roaster: 'Tim Wendelboe',
        name: 'Caballero Geisha',
        flavorNotes: ['Floral'],
        bagWeightGrams: 250,
      });
    });

    // Optimistic UI state must be populated immediately before Supabase responds!
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.beans[0].name).toBe('Caballero Geisha');
    expect(result.current.beans[0].userId).toBeUndefined();
    expect(result.current.activeBeans).toHaveLength(1);

    const storedImmediate = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(storedImmediate).toContain('Caballero Geisha');
    const parsedImmediate = JSON.parse(storedImmediate!);
    expect(parsedImmediate[0].userId).toBeUndefined();

    // Now resolve the Supabase insertion
    await act(async () => {
      resolveInsert({
        data: {
          id: result.current.beans[0].id,
          user_id: mockUser.id,
          roaster: 'Tim Wendelboe',
          name: 'Caballero Geisha',
          flavor_notes: ['Floral'],
          bag_weight_grams: 250,
          remaining_grams: 250,
          is_favorite: false,
          is_frozen: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        },
        error: null,
      });
      await addPromise;
    });

    expect(result.current.beans[0].userId).toBe(mockUser.id);
  });

  it('toggles frozen vault status and updates frozenDate', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Tim Wendelboe',
        name: 'Caballero',
        flavorNotes: [],
      });
    });

    await act(async () => {
      await result.current.toggleFrozen(created!.id);
    });

    expect(result.current.frozenBeans).toHaveLength(1);
    expect(result.current.activeBeans).toHaveLength(0);
    expect(result.current.beans[0].isFrozen).toBe(true);
    expect(result.current.beans[0].frozenDate).toBeDefined();

    // Toggle back to thaw
    await act(async () => {
      await result.current.toggleFrozen(created!.id);
    });

    expect(result.current.frozenBeans).toHaveLength(0);
    expect(result.current.activeBeans).toHaveLength(1);
    expect(result.current.beans[0].isFrozen).toBe(false);
    expect(result.current.beans[0].frozenDate).toBeUndefined();
  });

  it('deducts dose from remaining weight and clamps at zero', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Sey',
        name: 'Bantu',
        bagWeightGrams: 250,
        remainingGrams: 30,
        flavorNotes: [],
      });
    });

    await act(async () => {
      await result.current.deductBeanDose(created!.id, 18);
    });

    expect(result.current.beans[0].remainingGrams).toBe(12);

    // Deduct more than remaining
    await act(async () => {
      await result.current.deductBeanDose(created!.id, 20);
    });
    expect(result.current.beans[0].remainingGrams).toBe(0);
  });

  it('updates an existing bean and saves changes to AsyncStorage', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Sey',
        name: 'Worka',
        flavorNotes: ['Floral'],
        bagWeightGrams: 250,
      });
    });

    await act(async () => {
      await result.current.updateBean(created!.id, {
        name: 'Worka Sakaro (Updated)',
        price: 24,
      });
    });

    expect(result.current.beans[0].name).toBe('Worka Sakaro (Updated)');
    expect(result.current.beans[0].price).toBe(24);

    const stored = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(stored).toContain('Worka Sakaro (Updated)');
  });

  it('deletes a bean and clears activeBrewBean if matching', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Sey',
        name: 'To Delete',
        flavorNotes: [],
      });
    });

    act(() => {
      result.current.setActiveBrewBean(created!);
    });
    expect(result.current.activeBrewBean?.id).toBe(created!.id);

    await act(async () => {
      await result.current.deleteBean(created!.id);
    });

    expect(result.current.beans).toHaveLength(0);
    expect(result.current.activeBrewBean).toBeNull();
  });

  it('toggles favorite flag on a bean', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Sey',
        name: 'Favorite Test',
        flavorNotes: [],
        isFavorite: false,
      });
    });

    expect(result.current.beans[0].isFavorite).toBe(false);

    await act(async () => {
      await result.current.toggleFavorite(created!.id);
    });

    expect(result.current.beans[0].isFavorite).toBe(true);
  });

  it('archives and unarchives a bean, updating shelf partitioning', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Passenger',
        name: 'Archive Test',
        flavorNotes: [],
      });
    });

    expect(result.current.activeBeans).toHaveLength(1);
    expect(result.current.archivedBeans).toHaveLength(0);

    await act(async () => {
      await result.current.archiveBean(created!.id);
    });

    expect(result.current.activeBeans).toHaveLength(0);
    expect(result.current.archivedBeans).toHaveLength(1);
    expect(result.current.archivedBeans[0].isArchived).toBe(true);

    await act(async () => {
      await result.current.unarchiveBean(created!.id);
    });

    expect(result.current.activeBeans).toHaveLength(1);
    expect(result.current.archivedBeans).toHaveLength(0);
    expect(result.current.activeBeans[0].isArchived).toBe(false);
  });

  it('sets and clears activeBrewBean', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const sampleBean: Bean = {
      id: 'sample-1',
      roaster: 'Sey',
      name: 'Sample',
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };

    act(() => {
      result.current.setActiveBrewBean(sampleBean);
    });
    expect(result.current.activeBrewBean?.id).toBe('sample-1');

    act(() => {
      result.current.setActiveBrewBean(null);
    });
    expect(result.current.activeBrewBean).toBeNull();
  });

  it('syncs offline beans and fetches cloud beans when authenticated', async () => {
    mockAuthUser = mockUser;

    const offlineBean: Bean = {
      id: 'offline-bean-1',
      roaster: 'Onyx',
      name: 'Southern Weather',
      flavorNotes: ['Milk Chocolate', 'Plum'],
      bagWeightGrams: 340,
      remainingGrams: 340,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@brewlog/mobile:stash_cache',
      JSON.stringify([offlineBean])
    );

    const mockBeanInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'offline-bean-1',
            user_id: mockUser.id,
            roaster: 'Onyx',
            name: 'Southern Weather',
            flavor_notes: ['Milk Chocolate', 'Plum'],
            bag_weight_grams: 340,
            remaining_grams: 340,
            is_favorite: false,
            is_frozen: false,
            is_archived: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'offline-bean-1',
          user_id: mockUser.id,
          roaster: 'Onyx',
          name: 'Southern Weather',
          flavor_notes: ['Milk Chocolate', 'Plum'],
          bag_weight_grams: 340,
          remaining_grams: 340,
          is_favorite: false,
          is_frozen: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'cloud-bean-2',
          user_id: mockUser.id,
          roaster: 'Tim Wendelboe',
          name: 'Karinga',
          flavor_notes: ['Blackcurrant'],
          bag_weight_grams: 250,
          remaining_grams: 250,
          is_favorite: true,
          is_frozen: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          insert: mockBeanInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockBeanInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        name: 'Southern Weather',
        roaster: 'Onyx',
      })
    );
    expect(result.current.beans).toHaveLength(2);
    expect(result.current.beans.some((b) => b.id === 'offline-bean-1')).toBe(true);
    expect(result.current.beans.some((b) => b.id === 'cloud-bean-2')).toBe(true);

    const stored = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(2);
  });

  it('does not resurrect remotely deleted beans and prevents cross-user contamination', async () => {
    mockAuthUser = mockUser;

    // cachedPreviouslySynced was deleted on remote (not in mockOrder)
    const cachedPreviouslySynced: Bean = {
      id: 'synced-deleted-remote',
      userId: mockUser.id,
      roaster: 'Sey',
      name: 'Remotely Deleted',
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };

    // otherUserBean belongs to a different user; should NOT be uploaded to mockUser
    const otherUserBean: Bean = {
      id: 'other-user-bean',
      userId: 'different-user-uuid',
      roaster: 'Heart',
      name: 'Other User Coffee',
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };

    // genuinely offline bean without userId
    const offlineBean: Bean = {
      id: 'genuine-offline-bean',
      roaster: 'Passenger',
      name: 'Genuine Offline',
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      '@brewlog/mobile:stash_cache',
      JSON.stringify([cachedPreviouslySynced, otherUserBean, offlineBean])
    );

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'genuine-offline-bean',
            user_id: mockUser.id,
            roaster: 'Passenger',
            name: 'Genuine Offline',
            flavor_notes: [],
            bag_weight_grams: 250,
            remaining_grams: 250,
            is_favorite: false,
            is_frozen: false,
            is_archived: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'genuine-offline-bean',
          user_id: mockUser.id,
          roaster: 'Passenger',
          name: 'Genuine Offline',
          flavor_notes: [],
          bag_weight_grams: 250,
          remaining_grams: 250,
          is_favorite: false,
          is_frozen: false,
          is_archived: false,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnValue({ order: mockOrder }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only genuine-offline-bean should have been inserted, NOT otherUserBean!
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Genuine Offline' })
    );

    // The remotely deleted bean and other user's bean must NOT be in state
    expect(result.current.beans.some((b) => b.id === 'synced-deleted-remote')).toBe(false);
    expect(result.current.beans.some((b) => b.id === 'other-user-bean')).toBe(false);
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.beans[0].id).toBe('genuine-offline-bean');
  });

  it('does not re-trigger loading=true on background refresh if already hydrated', async () => {
    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let loadingDuringRefresh = false;
    await act(async () => {
      const refreshPromise = result.current.refreshBeans();
      loadingDuringRefresh = result.current.loading;
      await refreshPromise;
    });

    expect(loadingDuringRefresh).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('throws an error if useStash is called outside of StashProvider', () => {
    expect(() => {
      renderHook(() => useStash());
    }).toThrow('useStash must be used within a StashProvider');
  });

  it('retains userId: undefined when offline or on Supabase insert error, preventing data loss on subsequent launch', async () => {
    mockAuthUser = mockUser;

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockRejectedValue(new Error('Network offline')),
      }),
    });

    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const { result, unmount } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        roaster: 'Heart',
        name: 'Stereo Blend',
        flavorNotes: ['Chocolate', 'Berry'],
        bagWeightGrams: 300,
      });
    });

    // The created bean should have userId: undefined due to network failure
    expect(created?.userId).toBeUndefined();
    expect(result.current.beans[0].userId).toBeUndefined();

    // Verify cache in AsyncStorage retains userId: undefined
    const cached = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(cached).toContain('Stereo Blend');
    const parsed = JSON.parse(cached!);
    expect(parsed[0].userId).toBeUndefined();

    unmount();

    // Now simulate subsequent app launch with network restored
    const mockRestoredInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: created!.id,
            user_id: mockUser.id,
            roaster: 'Heart',
            name: 'Stereo Blend',
            flavor_notes: ['Chocolate', 'Berry'],
            bag_weight_grams: 300,
            remaining_grams: 300,
            is_favorite: false,
            is_frozen: false,
            is_archived: false,
            created_at: created!.createdAt,
          },
          error: null,
        }),
      }),
    });

    const mockRestoredOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: created!.id,
          user_id: mockUser.id,
          roaster: 'Heart',
          name: 'Stereo Blend',
          flavor_notes: ['Chocolate', 'Berry'],
          bag_weight_grams: 300,
          remaining_grams: 300,
          is_favorite: false,
          is_frozen: false,
          is_archived: false,
          created_at: created!.createdAt,
        },
      ],
      error: null,
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          insert: mockRestoredInsert,
          select: vi.fn().mockReturnValue({ order: mockRestoredOrder }),
        };
      }
      return {};
    });

    const { result: restoredResult } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(restoredResult.current.loading).toBe(false));

    // The previously offline bean must have been uploaded upon launch
    expect(mockRestoredInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        name: 'Stereo Blend',
      })
    );
    expect(restoredResult.current.beans).toHaveLength(1);
    expect(restoredResult.current.beans[0].name).toBe('Stereo Blend');
    expect(restoredResult.current.beans[0].userId).toBe(mockUser.id);
  });

  it('preserves concurrent optimistic bag additions during an in-flight fetchBeans request', async () => {
    mockAuthUser = mockUser;

    let resolveCloudSelect: (value: unknown) => void = () => {};
    const cloudPromise = new Promise((resolve) => {
      resolveCloudSelect = resolve;
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'concurrent-bean-id',
                  user_id: mockUser.id,
                  roaster: 'Onyx',
                  name: 'Southern Weather',
                  flavor_notes: [],
                  bag_weight_grams: 300,
                  remaining_grams: 300,
                  is_favorite: false,
                  is_frozen: false,
                  is_archived: false,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(cloudPromise),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // While fetchBeans' select('*') is in flight, optimistically add a bean
    let addPromise: Promise<Bean>;
    act(() => {
      addPromise = result.current.addBean({
        id: 'concurrent-bean-id',
        roaster: 'Onyx',
        name: 'Southern Weather',
        flavorNotes: [],
      });
    });

    // The concurrent addition is immediately present in state
    expect(result.current.beans.some((b) => b.id === 'concurrent-bean-id')).toBe(true);

    // Now resolve the cloud fetchBeans network response with an existing cloud bean
    await act(async () => {
      resolveCloudSelect({
        data: [
          {
            id: 'cloud-existing-bean',
            user_id: mockUser.id,
            roaster: 'Sey',
            name: 'Worka',
            flavor_notes: [],
            bag_weight_grams: 250,
            remaining_grams: 250,
            is_favorite: false,
            is_frozen: false,
            is_archived: false,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
      await addPromise;
    });

    // Both the cloud bean and the concurrently added bean must be present!
    expect(result.current.beans).toHaveLength(2);
    expect(result.current.beans.some((b) => b.id === 'concurrent-bean-id')).toBe(true);
    expect(result.current.beans.some((b) => b.id === 'cloud-existing-bean')).toBe(true);
  });

  it('inspects { error } on updateBean and retains bean in pending updates if remote update fails', async () => {
    mockAuthUser = mockUser;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const syncedBeanRow = {
      id: 'synced-err-update',
      user_id: mockUser.id,
      roaster: 'Sey',
      name: 'Worka',
      flavor_notes: [],
      bag_weight_grams: 250,
      remaining_grams: 250,
      is_favorite: false,
      is_frozen: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database RLS error' } }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          update: mockUpdate,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [syncedBeanRow], error: null }),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.beans).toHaveLength(1);

    await act(async () => {
      await result.current.updateBean('synced-err-update', { remainingGrams: 200 });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'updateBean supabase error:',
      expect.objectContaining({ message: 'Database RLS error' })
    );

    const pending = await AsyncStorage.getItem('@brewlog/mobile:stash_pending_updates');
    expect(pending).toContain('synced-err-update');
    consoleErrorSpy.mockRestore();
  });

  it('inspects { error } on deleteBean and retains bean in pending deletes if remote delete fails', async () => {
    mockAuthUser = mockUser;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const syncedBeanRow = {
      id: 'synced-err-delete',
      user_id: mockUser.id,
      roaster: 'Sey',
      name: 'Worka',
      flavor_notes: [],
      bag_weight_grams: 250,
      remaining_grams: 250,
      is_favorite: false,
      is_frozen: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    };

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS delete error' } }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          delete: mockDelete,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [syncedBeanRow], error: null }),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.beans).toHaveLength(1);

    await act(async () => {
      await result.current.deleteBean('synced-err-delete');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'deleteBean supabase error:',
      expect.objectContaining({ message: 'RLS delete error' })
    );

    const pending = await AsyncStorage.getItem('@brewlog/mobile:stash_pending_deletes');
    expect(pending).toContain('synced-err-delete');
    consoleErrorSpy.mockRestore();
  });

  it('reconciles offline mutations for already-synced beans without letting stale remote records overwrite local updates', async () => {
    mockAuthUser = mockUser;

    const syncedBeanRow = {
      id: 'synced-offline-reconcile',
      user_id: mockUser.id,
      roaster: 'Sey',
      name: 'Worka Sakaro',
      flavor_notes: ['Peach'],
      bag_weight_grams: 250,
      remaining_grams: 250,
      is_favorite: false,
      is_frozen: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    };

    // Initial session: update fails because offline
    const mockOfflineUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network offline' } }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          update: mockOfflineUpdate,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [syncedBeanRow], error: null }),
          }),
        };
      }
      return {};
    });

    const { result, unmount } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.beans).toHaveLength(1);

    // Deduct dose while offline
    await act(async () => {
      await result.current.deductBeanDose('synced-offline-reconcile', 18);
    });

    expect(result.current.beans[0].remainingGrams).toBe(232);
    const cachedPending = await AsyncStorage.getItem('@brewlog/mobile:stash_pending_updates');
    expect(cachedPending).toContain('synced-offline-reconcile');

    unmount();

    // Subsequent session: Reconnection with working network
    // Supabase has the stale record (remaining_grams: 250)
    const mockOnlineUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
    const mockOnlineSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'synced-offline-reconcile',
            user_id: mockUser.id,
            roaster: 'Sey',
            name: 'Worka Sakaro',
            flavor_notes: ['Peach'],
            bag_weight_grams: 250,
            remaining_grams: 250, // stale remote row!
            is_favorite: false,
            is_frozen: false,
            is_archived: false,
            created_at: syncedBeanRow.created_at,
          },
        ],
        error: null,
      }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          update: mockOnlineUpdate,
          select: mockOnlineSelect,
        };
      }
      return {};
    });

    const { result: reconnectedResult } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(reconnectedResult.current.loading).toBe(false));

    // fetchBeans must have pushed the pending update to Supabase with the local 232g!
    expect(mockOnlineUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        remaining_grams: 232,
      })
    );

    // Stale 250g from remote select must NOT have overwritten local 232g!
    expect(reconnectedResult.current.beans[0].remainingGrams).toBe(232);

    // Pending updates should be cleared after successful push
    const clearedPending = await AsyncStorage.getItem('@brewlog/mobile:stash_pending_updates');
    expect(JSON.parse(clearedPending || '[]')).toHaveLength(0);
  });

  it('reconciles offline deletions for already-synced beans and prevents remote resurrection', async () => {
    mockAuthUser = mockUser;

    const syncedBeanRow = {
      id: 'synced-offline-delete',
      user_id: mockUser.id,
      roaster: 'Passenger',
      name: 'Divisoria',
      flavor_notes: [],
      bag_weight_grams: 250,
      remaining_grams: 250,
      is_favorite: false,
      is_frozen: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    };

    // Initial session: delete fails because offline
    const mockOfflineDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network offline' } }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          delete: mockOfflineDelete,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [syncedBeanRow], error: null }),
          }),
        };
      }
      return {};
    });

    const { result, unmount } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.beans).toHaveLength(1);

    // Delete while offline
    await act(async () => {
      await result.current.deleteBean('synced-offline-delete');
    });

    expect(result.current.beans).toHaveLength(0);
    const cachedPending = await AsyncStorage.getItem('@brewlog/mobile:stash_pending_deletes');
    expect(cachedPending).toContain('synced-offline-delete');

    unmount();

    // Subsequent session: Reconnection with working network
    // Remote still returns the deleted row
    const mockOnlineDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
    const mockOnlineSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'synced-offline-delete',
            user_id: mockUser.id,
            roaster: 'Passenger',
            name: 'Divisoria',
            flavor_notes: [],
            bag_weight_grams: 250,
            remaining_grams: 250,
            is_favorite: false,
            is_frozen: false,
            is_archived: false,
            created_at: syncedBeanRow.created_at,
          },
        ],
        error: null,
      }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          delete: mockOnlineDelete,
          select: mockOnlineSelect,
        };
      }
      return {};
    });

    const { result: reconnectedResult } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(reconnectedResult.current.loading).toBe(false));

    // fetchBeans must have pushed the pending delete to Supabase
    expect(mockOnlineDelete).toHaveBeenCalled();

    // Remote bean must NOT be resurrected in state!
    expect(reconnectedResult.current.beans).toHaveLength(0);

    // Pending deletes should be cleared after successful sync
    const clearedPending = await AsyncStorage.getItem('@brewlog/mobile:stash_pending_deletes');
    expect(JSON.parse(clearedPending || '[]')).toHaveLength(0);
  });

  it('deduplicates offline beans against remote rows when offline sync was interrupted or returns error 23505', async () => {
    mockAuthUser = mockUser;

    const offlineBean: Bean = {
      id: 'bean-interrupted-sync',
      name: 'Interrupted Sync Bean',
      roaster: 'Sey',
      flavorNotes: [],
      bagWeightGrams: 250,
      remainingGrams: 250,
      createdAt: new Date().toISOString(),
      userId: undefined, // offline unsynced
    };

    // Pre-populate AsyncStorage cache with the offline bean
    await AsyncStorage.setItem(
      '@brewlog/mobile:stash_cache',
      JSON.stringify([offlineBean])
    );

    // Mock upsert/insert throwing Postgres error 23505 (duplicate key)
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint "beans_pkey"' },
        }),
      }),
    });

    // Remote select returns the row that already exists in Supabase
    const remoteRow = {
      id: 'bean-interrupted-sync',
      user_id: mockUser.id,
      roaster: 'Sey',
      name: 'Interrupted Sync Bean',
      flavor_notes: [],
      bag_weight_grams: 250,
      remaining_grams: 250,
      is_favorite: false,
      is_frozen: false,
      is_archived: false,
      created_at: offlineBean.createdAt,
    };

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [remoteRow],
        error: null,
      }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'beans') {
        return {
          upsert: mockUpsert,
          insert: mockUpsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useStash(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The bean must exist in state exactly once, with userId populated
    const matchingBeans = result.current.beans.filter((b) => b.id === 'bean-interrupted-sync');
    expect(matchingBeans).toHaveLength(1);
    expect(matchingBeans[0].userId).toBe(mockUser.id);
    expect(result.current.beans).toHaveLength(1);

    // Storage cache must also have exactly 1 record with userId populated
    const stored = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    const cachedList = JSON.parse(stored || '[]');
    expect(cachedList).toHaveLength(1);
    expect(cachedList[0].id).toBe('bean-interrupted-sync');
    expect(cachedList[0].userId).toBe(mockUser.id);
  });
});
