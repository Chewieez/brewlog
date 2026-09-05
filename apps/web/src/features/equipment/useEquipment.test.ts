import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useEquipment } from "./useEquipment";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import { INITIAL_EQUIPMENT } from "../../lib/sampleData";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useEquipment hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with INITIAL_EQUIPMENT when unauthenticated and localStorage is empty", async () => {
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

    const { result } = renderHook(() => useEquipment());

    expect(result.current.equipment).toEqual(INITIAL_EQUIPMENT);
  });

  it("loads existing equipment from localStorage cache", async () => {
    const cachedGear = [
      {
        id: "eq-custom-1",
        type: "grinder" as const,
        brand: "Baratza",
        model: "Encore",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("brewlog_equipment_cache", JSON.stringify(cachedGear));

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

    const { result } = renderHook(() => useEquipment());

    expect(result.current.equipment).toEqual(cachedGear);
  });

  it("adds equipment offline with local-eq- prefix and updates localStorage", async () => {
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

    const { result } = renderHook(() => useEquipment());

    let addedItem: any;
    await act(async () => {
      addedItem = await result.current.addEquipment({
        type: "scale",
        brand: "Acaia",
        model: "Lunar",
        subType: "0.01g resolution",
      });
    });

    expect(addedItem.id).toMatch(/^local-eq-/);
    expect(addedItem.brand).toBe("Acaia");
    expect(addedItem.model).toBe("Lunar");

    // First item in equipment state is the newly added item
    expect(result.current.equipment[0].id).toBe(addedItem.id);

    // Verify localStorage was updated
    const saved = JSON.parse(localStorage.getItem("brewlog_equipment_cache") || "[]");
    expect(saved[0].id).toBe(addedItem.id);
  });

  it("deletes equipment offline and updates state and localStorage", async () => {
    const cachedGear = [
      {
        id: "eq-delete-me",
        type: "brewer" as const,
        brand: "Kalita",
        model: "Wave 185",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("brewlog_equipment_cache", JSON.stringify(cachedGear));

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

    const { result } = renderHook(() => useEquipment());

    expect(result.current.equipment).toHaveLength(1);

    await act(async () => {
      await result.current.deleteEquipment("eq-delete-me");
    });

    expect(result.current.equipment).toHaveLength(0);
    const saved = JSON.parse(localStorage.getItem("brewlog_equipment_cache") || "[]");
    expect(saved).toHaveLength(0);
  });

  it("auto-syncs offline local-eq-* items to Supabase when user logs in", async () => {
    const offlineItem = {
      id: "local-eq-999999",
      type: "scale" as const,
      brand: "Timemore",
      model: "Black Mirror",
      subType: "smart-scale",
      notes: "Offline created gear",
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("brewlog_equipment_cache", JSON.stringify([offlineItem]));

    const mockUser = { id: "user-123-abc" } as any;

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
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

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "uuid-synced-1",
          user_id: "user-123-abc",
          type: "scale",
          brand: "Timemore",
          model: "Black Mirror",
          sub_type: "smart-scale",
          is_favorite: false,
          notes: "Offline created gear",
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "equipment") {
        return {
          insert: mockInsert,
          select: mockSelect,
        } as any;
      }
      return {} as any;
    });

    const { result } = renderHook(() => useEquipment());

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123-abc",
          brand: "Timemore",
          model: "Black Mirror",
        })
      );
    });

    await waitFor(() => {
      expect(result.current.equipment[0].id).toBe("uuid-synced-1");
    });
  });
});

