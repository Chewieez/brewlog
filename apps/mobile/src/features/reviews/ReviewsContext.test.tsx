/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TastingLog, DEFAULT_INITIAL_TASTING_LOGS } from '@brewlog/core';
import {
  ReviewsProvider,
  useReviews,
  useOptionalReviews,
  REVIEWS_STORAGE_KEY,
  REVIEWS_PENDING_UPDATES_KEY,
  REVIEWS_PENDING_DELETES_KEY,
  PendingBrewSession,
} from './ReviewsContext';

interface TestUser {
  id: string;
  email: string;
}

const mockUser: TestUser = { id: 'user-uuid-123', email: 'barista@brewlog.dev' };
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

describe('ReviewsContext', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    mockAuthUser = null;
    mockSupabaseFrom.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ReviewsProvider>{children}</ReviewsProvider>
  );

  it('1. loads cached reviews from AsyncStorage', async () => {
    const cachedReview: TastingLog = {
      id: 'custom-review-1',
      beanNameSnapshot: 'Ethiopia Yirgacheffe',
      roasterSnapshot: 'Square Mile',
      recipeNameSnapshot: 'Standard Pour',
      brewMethod: 'v60',
      brewDate: '2026-03-01T08:00:00.000Z',
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      actualTimeSeconds: 180,
      grindSetting: '18 clicks',
      waterTempCelsius: 93,
      scores: {
        fragranceAroma: 8.5,
        flavor: 8.5,
        aftertaste: 8.0,
        acidity: 8.5,
        body: 7.5,
        balance: 8.5,
        uniformity: 10.0,
        cleanCup: 10.0,
        sweetness: 8.5,
        overall: 8.5,
      },
      calculatedScaScore: 88.0,
      rating: 4.5,
      flavorTags: ['Bergamot', 'Lemon'],
      notes: 'Crisp and tea-like',
      wouldBrewAgain: true,
      createdAt: '2026-03-01T08:15:00.000Z',
    };
    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify([cachedReview]));

    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.reviews[0].id).toBe('custom-review-1');
    expect(result.current.reviews[0].beanNameSnapshot).toBe('Ethiopia Yirgacheffe');
  });

  it('2. seeds DEFAULT_INITIAL_TASTING_LOGS when cache is empty', async () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toEqual(DEFAULT_INITIAL_TASTING_LOGS);
    const stored = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(DEFAULT_INITIAL_TASTING_LOGS.length);
  });

  it('3. respects empty array [] in cache without re-seeding default data', async () => {
    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify([]));

    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toEqual([]);
  });

  it('4. adds a review optimistically offline and writes to AsyncStorage', async () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let created: TastingLog | undefined;
    await act(async () => {
      created = await result.current.addReview({
        beanNameSnapshot: 'Kenya Nyeri',
        roasterSnapshot: 'Tim Wendelboe',
        recipeNameSnapshot: 'Aeropress Inverted',
        brewMethod: 'aeropress',
        brewDate: '2026-03-02T09:00:00.000Z',
        coffeeDoseGrams: 14,
        waterAmountGrams: 200,
        actualTimeSeconds: 120,
        grindSetting: 'Fine',
        waterTempCelsius: 85,
        grinderId: 'eq-1',
        brewerId: 'eq-4',
        grinderSnapshot: 'Fellow Ode Gen 2',
        brewerSnapshot: 'AeroPress Clear',
        scores: {
          fragranceAroma: 9.0,
          flavor: 9.0,
          aftertaste: 8.5,
          acidity: 9.0,
          body: 8.0,
          balance: 8.5,
          uniformity: 10.0,
          cleanCup: 10.0,
          sweetness: 9.0,
          overall: 9.0,
        },
        calculatedScaScore: 90.0,
        rating: 5,
        flavorTags: ['Blackcurrant', 'Grapefruit'],
        notes: 'Explosive acidity',
        wouldBrewAgain: true,
      });
    });

    expect(created).toBeDefined();
    expect(created?.id).toMatch(/^local-rev-/);
    expect(result.current.reviews[0].beanNameSnapshot).toBe('Kenya Nyeri');

    const stored = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed[0].beanNameSnapshot).toBe('Kenya Nyeri');
  });

  it('5. updates and deletes reviews optimistically', async () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialId = result.current.reviews[0].id;

    await act(async () => {
      await result.current.updateReview(initialId, {
        notes: 'Updated impressions with lower water temp',
      });
    });

    expect(result.current.reviews[0].notes).toBe('Updated impressions with lower water temp');

    await act(async () => {
      await result.current.deleteReview(initialId);
    });

    expect(result.current.reviews.find((r) => r.id === initialId)).toBeUndefined();
  });

  it('6. Postgres 22P02 Guard: skips Supabase .update() and .delete() when ID is a local string ID', async () => {
    mockAuthUser = mockUser;
    const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn() });
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn() });
    mockSupabaseFrom.mockReturnValue({
      delete: deleteMock,
      update: updateMock,
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Add local review
    let created: TastingLog | undefined;
    await act(async () => {
      created = await result.current.addReview({
        beanNameSnapshot: 'Local Only',
        roasterSnapshot: 'Local Roaster',
        recipeNameSnapshot: 'V60',
        brewMethod: 'v60',
        brewDate: '2026-03-03T09:00:00.000Z',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        actualTimeSeconds: 150,
        grindSetting: 'Medium',
        waterTempCelsius: 90,
        scores: {
          fragranceAroma: 8,
          flavor: 8,
          aftertaste: 8,
          acidity: 8,
          body: 8,
          balance: 8,
          uniformity: 10,
          cleanCup: 10,
          sweetness: 8,
          overall: 8,
        },
        calculatedScaScore: 86.0,
        rating: 4,
        flavorTags: ['Caramel'],
        notes: 'Sweet',
        wouldBrewAgain: true,
      });
    });

    expect(created?.id).toMatch(/^local-rev-/);

    // Update local review
    await act(async () => {
      await result.current.updateReview(created!.id, { rating: 5 });
    });
    // Should NOT call supabase update with local id
    expect(updateMock).not.toHaveBeenCalled();

    // Delete local review
    await act(async () => {
      await result.current.deleteReview(created!.id);
    });
    // Should NOT call supabase delete with local id
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('7. immediate server UUID swap on Supabase upload and preserves failed items', async () => {
    mockAuthUser = mockUser;

    const serverRow = {
      id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', // Valid UUID
      user_id: mockUser.id,
      bean_id: null,
      recipe_id: null,
      grinder_id: 'eq-1',
      brewer_id: 'eq-3',
      grinder_snapshot: 'Fellow Ode Gen 2',
      brewer_snapshot: 'Hario V60',
      bean_name_snapshot: 'Sync Bean',
      roaster_snapshot: 'Sync Roaster',
      recipe_name_snapshot: 'Hoffmann V60',
      brew_method: 'v60',
      brew_date: '2026-03-04T08:00:00.000Z',
      coffee_dose_grams: 15,
      water_amount_grams: 250,
      actual_time_seconds: 180,
      grindSetting: '18 clicks',
      water_temp_celsius: 94,
      fragrance_aroma: 8.5,
      flavor: 8.5,
      aftertaste: 8.0,
      acidity: 8.5,
      body: 8.0,
      balance: 8.5,
      uniformity: 10.0,
      clean_cup: 10.0,
      sweetness: 8.5,
      overall: 8.5,
      calculated_sca_score: 88.5,
      rating: 5,
      flavor_tags: ['Floral'],
      notes: 'Excellent',
      would_brew_again: true,
      created_at: '2026-03-04T08:05:00.000Z',
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'tasting_logs') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: serverRow, error: null }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [serverRow], error: null }),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let created: TastingLog | undefined;
    await act(async () => {
      created = await result.current.addReview({
        beanNameSnapshot: 'Sync Bean',
        roasterSnapshot: 'Sync Roaster',
        recipeNameSnapshot: 'Hoffmann V60',
        brewMethod: 'v60',
        brewDate: '2026-03-04T08:00:00.000Z',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        actualTimeSeconds: 180,
        grindSetting: '18 clicks',
        waterTempCelsius: 94,
        scores: {
          fragranceAroma: 8.5,
          flavor: 8.5,
          aftertaste: 8.0,
          acidity: 8.5,
          body: 8.0,
          balance: 8.5,
          uniformity: 10.0,
          cleanCup: 10.0,
          sweetness: 8.5,
          overall: 8.5,
        },
        calculatedScaScore: 88.5,
        rating: 5,
        flavorTags: ['Floral'],
        notes: 'Excellent',
        wouldBrewAgain: true,
      });
    });

    expect(created?.id).toBe('f81d4fae-7dec-11d0-a765-00a0c91e6bf6');
    expect(result.current.reviews[0].id).toBe('f81d4fae-7dec-11d0-a765-00a0c91e6bf6');
  });

  it('8. manages pendingBrewSession state for timer handoff', async () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pendingBrewSession).toBeNull();

    const mockSession: PendingBrewSession = {
      actualDose: 18,
      actualWater: 300,
      actualTimeSeconds: 195,
      grindSetting: '20 clicks',
      grinderId: 'eq-1',
      brewerId: 'eq-3',
      splitsNotes: 'Bloom: 45s\nPour 1: 1:30',
      recipe: {
        id: 'rec-1',
        name: 'V60 Pour',
        description: 'V60 Pour test recipe',
        brewMethod: 'v60',
        coffeeDoseGrams: 18,
        waterAmountGrams: 300,
        ratio: 16.67,
        grindSize: '20 clicks',
        waterTempCelsius: 93,
        totalTimeSeconds: 210,
        createdAt: '2026-01-01',
        stages: [],
      },
    };

    act(() => {
      result.current.setPendingBrewSession(mockSession);
    });

    expect(result.current.pendingBrewSession).toEqual(mockSession);

    act(() => {
      result.current.setPendingBrewSession(null);
    });

    expect(result.current.pendingBrewSession).toBeNull();
  });
});
