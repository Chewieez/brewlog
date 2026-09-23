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
    expect(result.current.activeBeans).toHaveLength(1);

    const storedImmediate = await AsyncStorage.getItem('@brewlog/mobile:stash_cache');
    expect(storedImmediate).toContain('Caballero Geisha');

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
});
