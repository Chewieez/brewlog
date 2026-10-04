/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Equipment, DEFAULT_INITIAL_EQUIPMENT } from '@brewlog/core';
import {
  EquipmentProvider,
  useEquipment,
  EQUIPMENT_STORAGE_KEY,
  EQUIPMENT_PENDING_UPDATES_KEY,
  EQUIPMENT_PENDING_DELETES_KEY,
} from './EquipmentContext';

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

describe('EquipmentContext', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    mockAuthUser = null;
    mockSupabaseFrom.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EquipmentProvider>{children}</EquipmentProvider>
  );

  it('1. loads cached equipment from AsyncStorage', async () => {
    const cachedItem: Equipment = {
      id: 'custom-eq-1',
      type: 'grinder',
      brand: '1Zpresso',
      model: 'K-Max',
      subType: 'conical-burr',
      settingScaleType: 'clicks',
      isFavorite: false,
      notes: 'Great pour-over grinder',
      createdAt: '2026-02-01T00:00:00.000Z',
    };
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify([cachedItem]));

    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.equipment).toHaveLength(1);
    expect(result.current.equipment[0].model).toBe('K-Max');
    expect(result.current.grinders).toHaveLength(1);
    expect(result.current.grinders[0].brand).toBe('1Zpresso');
    expect(result.current.brewers).toHaveLength(0);
    expect(result.current.scales).toHaveLength(0);
    expect(result.current.kettles).toHaveLength(0);
  });

  it('2. seeds DEFAULT_INITIAL_EQUIPMENT when cache is empty', async () => {
    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.equipment).toEqual(DEFAULT_INITIAL_EQUIPMENT);
    expect(result.current.grinders.length).toBeGreaterThan(0);
    expect(result.current.brewers.length).toBeGreaterThan(0);
    expect(result.current.scales.length).toBeGreaterThan(0);
    expect(result.current.kettles.length).toBeGreaterThan(0);

    const stored = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(DEFAULT_INITIAL_EQUIPMENT.length);
  });

  it('3. addEquipment adds an item and writes to AsyncStorage', async () => {
    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialCount = result.current.equipment.length;
    let created: Equipment | undefined;

    await act(async () => {
      created = await result.current.addEquipment({
        type: 'scale',
        brand: 'Acaia',
        model: 'Pearl Model S',
        subType: 'smart-scale',
        isFavorite: true,
        notes: '0.1g accuracy with sound feedback',
      });
    });

    expect(created).toBeDefined();
    expect(created!.id).toMatch(/^local-eq-/);
    expect(result.current.equipment).toHaveLength(initialCount + 1);
    expect(result.current.scales.some((s) => s.model === 'Pearl Model S')).toBe(true);

    const stored = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    expect(stored).toContain('Pearl Model S');
  });

  it('4. updateEquipment modifies existing item in state and cache', async () => {
    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const targetId = result.current.equipment[0].id;

    await act(async () => {
      await result.current.updateEquipment(targetId, {
        notes: 'Calibrated with SSP MP burrs',
      });
    });

    const updated = result.current.equipment.find((e) => e.id === targetId);
    expect(updated?.notes).toBe('Calibrated with SSP MP burrs');

    const stored = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    expect(stored).toContain('Calibrated with SSP MP burrs');
  });

  it('5. toggleFavorite flips isFavorite boolean', async () => {
    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const target = result.current.equipment[0];
    const initialFavorite = target.isFavorite ?? false;

    await act(async () => {
      await result.current.toggleFavorite(target.id);
    });

    const afterFirstToggle = result.current.equipment.find((e) => e.id === target.id);
    expect(afterFirstToggle?.isFavorite).toBe(!initialFavorite);

    await act(async () => {
      await result.current.toggleFavorite(target.id);
    });

    const afterSecondToggle = result.current.equipment.find((e) => e.id === target.id);
    expect(afterSecondToggle?.isFavorite).toBe(initialFavorite);
  });

  it('6. deleteEquipment removes item from state and cache', async () => {
    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const toDeleteId = result.current.equipment[0].id;
    const initialCount = result.current.equipment.length;

    await act(async () => {
      await result.current.deleteEquipment(toDeleteId);
    });

    expect(result.current.equipment).toHaveLength(initialCount - 1);
    expect(result.current.equipment.some((e) => e.id === toDeleteId)).toBe(false);

    const stored = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    expect(stored).not.toContain(toDeleteId);
  });

  it('7. syncs offline items to Supabase when user is logged in', async () => {
    mockAuthUser = mockUser;

    const offlineItem: Equipment = {
      id: 'local-eq-offline-99',
      type: 'brewer',
      brand: 'Origami',
      model: 'Dripper Air S',
      subType: 'pour-over',
      isFavorite: false,
      notes: '20 ribs matte pink',
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      EQUIPMENT_STORAGE_KEY,
      JSON.stringify([offlineItem])
    );

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'cloud-eq-uuid-1',
            user_id: mockUser.id,
            type: 'brewer',
            brand: 'Origami',
            model: 'Dripper Air S',
            sub_type: 'pour-over',
            setting_scale_type: null,
            is_favorite: false,
            notes: '20 ribs matte pink',
            created_at: offlineItem.createdAt,
          },
          error: null,
        }),
      }),
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cloud-eq-uuid-1',
          user_id: mockUser.id,
          type: 'brewer',
          brand: 'Origami',
          model: 'Dripper Air S',
          sub_type: 'pour-over',
          setting_scale_type: null,
          is_favorite: false,
          notes: '20 ribs matte pink',
          created_at: offlineItem.createdAt,
        },
        {
          id: 'cloud-eq-uuid-2',
          user_id: mockUser.id,
          type: 'kettle',
          brand: 'Brewista',
          model: 'Artisan Gooseneck',
          sub_type: 'electric-gooseneck',
          setting_scale_type: null,
          is_favorite: true,
          notes: null,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'equipment') {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        brand: 'Origami',
        model: 'Dripper Air S',
        type: 'brewer',
      })
    );

    expect(result.current.equipment).toHaveLength(2);
    expect(result.current.equipment.some((e) => e.id === 'cloud-eq-uuid-1')).toBe(true);
    expect(result.current.equipment.some((e) => e.id === 'cloud-eq-uuid-2')).toBe(true);
    expect(result.current.brewers).toHaveLength(1);
    expect(result.current.kettles).toHaveLength(1);

    const stored = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(2);
  });

  it('8. flushes pending updates and deletes to Supabase when user is logged in', async () => {
    mockAuthUser = mockUser;

    const existingCloudItem: Equipment = {
      id: 'cloud-eq-to-update',
      userId: mockUser.id,
      type: 'grinder',
      brand: 'Baratza',
      model: 'Encore ESP',
      subType: 'conical-burr',
      settingScaleType: 'stepped-numbers',
      isFavorite: false,
      notes: 'Updated offline',
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      EQUIPMENT_STORAGE_KEY,
      JSON.stringify([existingCloudItem])
    );
    await AsyncStorage.setItem(
      EQUIPMENT_PENDING_UPDATES_KEY,
      JSON.stringify(['cloud-eq-to-update'])
    );
    await AsyncStorage.setItem(
      EQUIPMENT_PENDING_DELETES_KEY,
      JSON.stringify(['cloud-eq-to-delete'])
    );

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cloud-eq-to-update',
          user_id: mockUser.id,
          type: 'grinder',
          brand: 'Baratza',
          model: 'Encore ESP',
          sub_type: 'conical-burr',
          setting_scale_type: 'stepped-numbers',
          is_favorite: false,
          notes: 'Old cloud note',
          created_at: existingCloudItem.createdAt,
        },
      ],
      error: null,
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'equipment') {
        return {
          update: mockUpdate,
          delete: mockDelete,
          select: vi.fn().mockReturnValue({ order: mockOrder }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useEquipment(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: 'Updated offline',
      })
    );

    // Reconciled local updated note is preserved over old cloud note
    expect(result.current.equipment[0].notes).toBe('Updated offline');

    const pendingUpdates = await AsyncStorage.getItem(EQUIPMENT_PENDING_UPDATES_KEY);
    expect(JSON.parse(pendingUpdates!)).toEqual([]);
    const pendingDeletes = await AsyncStorage.getItem(EQUIPMENT_PENDING_DELETES_KEY);
    expect(JSON.parse(pendingDeletes!)).toEqual([]);
  });

  it('9. throws an error when useEquipment is used outside of EquipmentProvider', () => {
    expect(() => {
      renderHook(() => useEquipment());
    }).toThrow('useEquipment must be used within an EquipmentProvider');
  });

  it('10. does not re-trigger loading=true on background refresh if already hydrated', async () => {
    const { result } = renderHook(() => useEquipment(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let loadingDuringRefresh = false;
    await act(async () => {
      const refreshPromise = result.current.refreshEquipment();
      loadingDuringRefresh = result.current.loading;
      await refreshPromise;
    });

    expect(loadingDuringRefresh).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('11. deleting a starter preset (eq-1) does NOT queue into pending deletes or call Supabase delete', async () => {
    const mockDelete = vi.fn();
    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'equipment') {
        return {
          delete: mockDelete,
          select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useEquipment(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Preset eq-1 exists from default seed
    expect(result.current.equipment.some((e) => e.id === 'eq-1')).toBe(true);

    // Now user is authenticated
    mockAuthUser = mockUser;

    await act(async () => {
      await result.current.deleteEquipment('eq-1');
    });

    expect(result.current.equipment.some((e) => e.id === 'eq-1')).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();

    const pendingDeletes = await AsyncStorage.getItem(EQUIPMENT_PENDING_DELETES_KEY);
    expect(pendingDeletes).toBeNull();

    // Refreshing does not attempt to delete eq-1 from Supabase
    await act(async () => {
      await result.current.refreshEquipment();
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('12. respects empty array in cache so deleting all equipment does not re-seed on reload', async () => {
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify([]));

    const { result } = renderHook(() => useEquipment(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.equipment).toEqual([]);
    expect(result.current.grinders).toEqual([]);
  });

  it('13. swaps local-eq-* ID to server ID immediately when remote insert succeeds even if subsequent remote fetch fails', async () => {
    const offlineItem: Equipment = {
      id: 'local-eq-offline-1',
      type: 'grinder',
      brand: 'Baratza',
      model: 'Sette 270',
      createdAt: '2026-02-01T00:00:00.000Z',
    };
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify([offlineItem]));

    mockAuthUser = mockUser;

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'server-uuid-12345',
            user_id: mockUser.id,
            type: 'grinder',
            brand: 'Baratza',
            model: 'Sette 270',
            created_at: '2026-02-01T00:00:00.000Z',
          },
          error: null,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Network timeout fetching remote equipment'),
      }),
    });

    mockSupabaseFrom.mockImplementation((table: unknown) => {
      if (table === 'equipment') {
        return {
          upsert: mockUpsert,
          select: mockSelect,
        };
      }
      return {};
    });

    const { result } = renderHook(() => useEquipment(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Even though Step 4 threw/failed, Step 2 swapped the ID immediately
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY)) || '[]');
      expect(stored[0]?.id).toBe('server-uuid-12345');
    });

    expect(result.current.equipment[0]?.id).toBe('server-uuid-12345');
  });

  it('14. filters other equipment into other array', async () => {
    const otherGear: Equipment = {
      id: 'custom-eq-other',
      type: 'other',
      brand: 'Normcore',
      model: 'WDT Tool V2',
      createdAt: '2026-02-01T00:00:00.000Z',
    };
    await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify([otherGear]));

    const { result } = renderHook(() => useEquipment(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.other).toHaveLength(1);
    expect(result.current.other[0].model).toBe('WDT Tool V2');
  });
});
