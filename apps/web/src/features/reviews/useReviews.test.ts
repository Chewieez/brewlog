/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
        brewMethod: "V60",
        brewDate: "2026-10-04",
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        actualTimeSeconds: 180,
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
});
