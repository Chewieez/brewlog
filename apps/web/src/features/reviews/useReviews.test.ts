/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReviews } from "./useReviews";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import { INITIAL_TASTING_LOGS } from "../../lib/sampleData";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockRow1 = {
  id: "db-log-1",
  user_id: "user-123",
  brew_date: "2026-10-04T12:00:00Z",
  bean_name_snapshot: "Worka Sakaro",
  roaster_snapshot: "Sey Coffee",
  recipe_name_snapshot: "V60 Standard",
  brew_method: "v60",
  coffee_dose_grams: 20,
  water_amount_grams: 300,
  actual_time_seconds: 210,
  grind_setting: "14 clicks",
  grinder_snapshot: "Comandante C40 MK4",
  brewer_snapshot: "Hario V60 02 Ceramic",
  water_temp_celsius: 94,
  calculated_sca_score: 88.5,
  rating: 5,
  flavor_tags: ["Peach", "Jasmine"],
  notes: "Vibrant and floral.",
  would_brew_again: true,
  scores: {
    fragranceAroma: 8.5,
    flavor: 8.5,
    aftertaste: 8,
    acidity: 8.5,
    body: 8,
    balance: 8,
    cleanCup: 10,
    sweetness: 10,
    uniformity: 10,
    overall: 8.5,
  },
  created_at: "2026-10-04T12:00:00Z",
};

describe("useReviews hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with INITIAL_TASTING_LOGS when unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    expect(result.current.logs).toEqual(INITIAL_TASTING_LOGS);
  });

  it("adds a review offline with local id", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    let newLog: any;

    await act(async () => {
      newLog = await result.current.addReview({
        beanNameSnapshot: "Ethiopia Yirgacheffe",
        roasterSnapshot: "Subtext",
        recipeNameSnapshot: "V60 Standard",
        brewMethod: "v60",
        brewDate: "2026-10-04",
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        actualTimeSeconds: 180,
        grindSetting: "Medium-Fine",
        waterTempCelsius: 93,
        scores: {
          fragranceAroma: 8.5,
          flavor: 8.5,
          aftertaste: 8.0,
          acidity: 8.5,
          body: 8.0,
          balance: 8.0,
          uniformity: 10,
          cleanCup: 10,
          sweetness: 10,
          overall: 8.5,
        },
        calculatedScaScore: 89.5,
        rating: 5,
        flavorTags: ["Bergamot", "Jasmine"],
        notes: "Floral and bright.",
        wouldBrewAgain: true,
      });
    });

    expect(newLog.id).toMatch(/^local-log-/);
    expect(result.current.logs[0].id).toBe(newLog.id);
    expect(result.current.logs[0].beanNameSnapshot).toBe("Ethiopia Yirgacheffe");
  });

  it("updates an existing review locally", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    const targetId = result.current.logs[0].id;

    await act(async () => {
      await result.current.updateReview(targetId, {
        notes: "Updated tasting notes with more detail",
        rating: 5,
      });
    });

    const updated = result.current.logs.find((l) => l.id === targetId);
    expect(updated?.notes).toBe("Updated tasting notes with more detail");
    expect(updated?.rating).toBe(5);
  });

  it("deletes a review locally", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    const initialCount = result.current.logs.length;
    const targetId = result.current.logs[0].id;

    await act(async () => {
      await result.current.deleteReview(targetId);
    });

    expect(result.current.logs.length).toBe(initialCount - 1);
    expect(result.current.logs.find((l) => l.id === targetId)).toBeUndefined();
  });

  it("updates a review in Supabase when authenticated", async () => {
    const mockUpdateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "log-1",
        user_id: "user-123",
        brew_date: "2026-10-04T12:00:00Z",
        bean_name_snapshot: "Worka Sakaro",
        roaster_snapshot: "Sey Coffee",
        recipe_name_snapshot: "V60 Standard",
        brew_method: "v60",
        coffee_dose_grams: 20,
        water_amount_grams: 300,
        actual_time_seconds: 210,
        grind_setting: "14 clicks",
        grinder_snapshot: "Comandante C40 MK4",
        brewer_snapshot: "Hario V60 02 Ceramic",
        water_temp_celsius: 94,
        calculated_sca_score: 88.5,
        rating: 5,
        flavor_tags: ["Peach", "Jasmine"],
        notes: "Updated tasting notes via Supabase",
        would_brew_again: true,
        scores: {
          fragranceAroma: 8.5,
          flavor: 8.5,
          aftertaste: 8.0,
          acidity: 8.5,
          body: 8.0,
          balance: 8.0,
          cleanCup: 10,
          sweetness: 10,
          uniformity: 10,
          overall: 8.5,
        },
        created_at: "2026-10-04T12:00:00Z",
      },
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      }),
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
    });
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "log-1",
            user_id: "user-123",
            brew_date: "2026-10-04T12:00:00Z",
            bean_name_snapshot: "Worka Sakaro",
            roaster_snapshot: "Sey Coffee",
            recipe_name_snapshot: "V60 Standard",
            brew_method: "v60",
            coffee_dose_grams: 20,
            water_amount_grams: 300,
            actual_time_seconds: 210,
            grind_setting: "14 clicks",
            grinder_snapshot: "Comandante C40 MK4",
            brewer_snapshot: "Hario V60 02 Ceramic",
            water_temp_celsius: 94,
            calculated_sca_score: 88.5,
            rating: 5,
            flavor_tags: ["Peach", "Jasmine"],
            notes: "Initial notes",
            would_brew_again: true,
            scores: {
              fragranceAroma: 8.5,
              flavor: 8.5,
              aftertaste: 8.0,
              acidity: 8.5,
              body: 8.0,
              balance: 8.0,
              cleanCup: 10,
              sweetness: 10,
              uniformity: 10,
              overall: 8.5,
            },
            created_at: "2026-10-04T12:00:00Z",
          },
        ],
        error: null,
      }),
    });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());

    let returnedLog: any;
    await act(async () => {
      returnedLog = await result.current.updateTastingLog("log-1", {
        notes: "Updated tasting notes via Supabase",
      });
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: "Updated tasting notes via Supabase",
      })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "log-1");
    expect(returnedLog?.notes).toBe("Updated tasting notes via Supabase");
  });

  it("reverts local state and throws if updateTastingLog fails in Supabase", async () => {
    const mockUpdateSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("Network timeout during tasting log update"),
    });

    const mockEq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      }),
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
    });
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "log-1",
            user_id: "user-123",
            brew_date: "2026-10-04T12:00:00Z",
            bean_name_snapshot: "Worka Sakaro",
            roaster_snapshot: "Sey Coffee",
            recipe_name_snapshot: "V60 Standard",
            brew_method: "v60",
            coffee_dose_grams: 20,
            water_amount_grams: 300,
            actual_time_seconds: 210,
            grind_setting: "14 clicks",
            grinder_snapshot: "Comandante C40 MK4",
            brewer_snapshot: "Hario V60 02 Ceramic",
            water_temp_celsius: 94,
            calculated_sca_score: 88.5,
            rating: 5,
            flavor_tags: ["Peach"],
            notes: "Original pristine notes",
            would_brew_again: true,
            scores: {
              fragranceAroma: 8.5,
              flavor: 8.5,
              aftertaste: 8,
              acidity: 8.5,
              body: 8,
              balance: 8,
              cleanCup: 10,
              sweetness: 10,
              uniformity: 10,
              overall: 8.5,
            },
            created_at: "2026-10-04T12:00:00Z",
          },
        ],
        error: null,
      }),
    });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    await waitFor(() => {
      expect(result.current.logs.find((l) => l.id === "log-1")?.notes).toBe("Original pristine notes");
    });

    await expect(
      act(async () => {
        await result.current.updateTastingLog("log-1", {
          notes: "Failing update",
        });
      })
    ).rejects.toThrow("Network timeout during tasting log update");

    expect(result.current.logs.find((l) => l.id === "log-1")?.notes).toBe("Original pristine notes");
  });

  it("reverts local state and throws if deleteTastingLog fails in Supabase", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({
      error: new Error("Network timeout during delete"),
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: mockDeleteEq,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "log-1",
            user_id: "user-123",
            brew_date: "2026-10-04T12:00:00Z",
            bean_name_snapshot: "Worka Sakaro",
            roaster_snapshot: "Sey Coffee",
            recipe_name_snapshot: "V60 Standard",
            brew_method: "v60",
            coffee_dose_grams: 20,
            water_amount_grams: 300,
            actual_time_seconds: 210,
            grind_setting: "14 clicks",
            grinder_snapshot: "Comandante C40 MK4",
            brewer_snapshot: "Hario V60 02 Ceramic",
            water_temp_celsius: 94,
            calculated_sca_score: 88.5,
            rating: 5,
            flavor_tags: ["Peach"],
            notes: "Should not be deleted",
            would_brew_again: true,
            scores: {
              fragranceAroma: 8.5,
              flavor: 8.5,
              aftertaste: 8,
              acidity: 8.5,
              body: 8,
              balance: 8,
              cleanCup: 10,
              sweetness: 10,
              uniformity: 10,
              overall: 8.5,
            },
            created_at: "2026-10-04T12:00:00Z",
          },
        ],
        error: null,
      }),
    });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          delete: mockDelete,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    expect(result.current.logs.some((l) => l.id === "log-1")).toBe(true);

    await expect(
      act(async () => {
        await result.current.deleteTastingLog("log-1");
      })
    ).rejects.toThrow("Network timeout during delete");

    expect(result.current.logs.some((l) => l.id === "log-1")).toBe(true);
  });

  it("reverts local state and maintains chronological order if deleteTastingLog fails in Supabase", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({
      error: new Error("Network timeout during delete"),
    });

    const mockDelete = vi.fn().mockReturnValue({
      eq: mockDeleteEq,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            ...mockRow1,
            id: "log-newer",
            brew_date: "2026-10-06T12:00:00Z",
          },
          {
            ...mockRow1,
            id: "log-middle",
            brew_date: "2026-10-04T12:00:00Z",
          },
          {
            ...mockRow1,
            id: "log-older",
            brew_date: "2026-10-02T12:00:00Z",
          },
        ],
        error: null,
      }),
    });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          delete: mockDelete,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    await waitFor(() => {
      expect(result.current.logs).toHaveLength(3);
    });
    expect(result.current.logs.map((l) => l.id)).toEqual(["log-newer", "log-middle", "log-older"]);

    await expect(
      act(async () => {
        await result.current.deleteTastingLog("log-middle");
      })
    ).rejects.toThrow("Network timeout during delete");

    expect(result.current.logs.map((l) => l.id)).toEqual(["log-newer", "log-middle", "log-older"]);
  });

  it("fetches and sets logs from Supabase when authenticated", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [mockRow1],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return { select: mockSelect } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.logs).toHaveLength(1);
    });

    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("brew_date", { ascending: false });
    expect(result.current.logs[0].id).toBe("db-log-1");
    expect(result.current.logs[0].beanNameSnapshot).toBe("Worka Sakaro");
  });

  it("sets empty logs when Supabase returns empty data for authenticated user", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return { select: mockSelect } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.logs).toEqual([]);
    });
  });

  it("adds a review to Supabase when authenticated", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [mockRow1],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    const newRow = {
      ...mockRow1,
      id: "db-log-new",
      bean_name_snapshot: "Gesha Spirits",
      notes: "Crisp and jasmine-forward",
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: newRow,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    await waitFor(() => expect(result.current.logs).toHaveLength(1));

    let created: any;
    await act(async () => {
      created = await result.current.addTastingLog({
        beanNameSnapshot: "Gesha Spirits",
        roasterSnapshot: "Sey Coffee",
        recipeNameSnapshot: "V60 Standard",
        brewMethod: "v60",
        brewDate: "2026-10-06T12:00:00Z",
        coffeeDoseGrams: 20,
        waterAmountGrams: 300,
        actualTimeSeconds: 210,
        grindSetting: "14 clicks",
        waterTempCelsius: 94,
        calculatedScaScore: 90,
        rating: 5,
        flavorTags: ["Jasmine"],
        notes: "Crisp and jasmine-forward",
        wouldBrewAgain: true,
        scores: mockRow1.scores,
      });
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        bean_name_snapshot: "Gesha Spirits",
      })
    );
    expect(created.id).toBe("db-log-new");
    expect(result.current.logs[0].id).toBe("db-log-new");
    expect(result.current.logs).toHaveLength(2);
  });

  it("throws if addTastingLog fails in Supabase when authenticated", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [mockRow1],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Network timeout during insert"),
        }),
      }),
    });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          insert: mockInsert,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    await waitFor(() => expect(result.current.logs).toHaveLength(1));

    await expect(
      act(async () => {
        await result.current.addTastingLog({
          beanNameSnapshot: "Failing Bean",
          roasterSnapshot: "Sey",
          recipeNameSnapshot: "V60",
          brewMethod: "v60",
          brewDate: "2026-10-06T12:00:00Z",
          coffeeDoseGrams: 20,
          waterAmountGrams: 300,
          actualTimeSeconds: 210,
          grindSetting: "14 clicks",
          waterTempCelsius: 94,
          calculatedScaScore: 90,
          rating: 5,
          flavorTags: ["Jasmine"],
          notes: "Will fail",
          wouldBrewAgain: true,
          scores: mockRow1.scores,
        });
      })
    ).rejects.toThrow("Network timeout during insert");
  });

  it("deletes a review from Supabase when authenticated", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [mockRow1],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "tasting_logs") {
        return {
          select: mockSelect,
          delete: mockDelete,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useReviews());
    await waitFor(() => expect(result.current.logs).toHaveLength(1));

    await act(async () => {
      await result.current.deleteTastingLog("db-log-1");
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("id", "db-log-1");
    expect(result.current.logs.find((l) => l.id === "db-log-1")).toBeUndefined();
    expect(result.current.logs).toHaveLength(0);
  });
});
