import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBeans } from "./useBeans";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import { INITIAL_BEANS } from "../../lib/sampleData";
import { Bean } from "@brewlog/core";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useBeans hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with INITIAL_BEANS (1 sample bean) when unauthenticated and localStorage is empty", async () => {
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

    const { result } = renderHook(() => useBeans());

    expect(result.current.beans).toEqual(INITIAL_BEANS);
    expect(result.current.beans).toHaveLength(1);
  });

  it("loads existing beans from localStorage cache", async () => {
    const cachedBean: Bean = {
      id: "cached-1",
      name: "Geisha Village",
      roaster: "Onyx Coffee Lab",
      flavorNotes: ["Jasmine", "Bergamot"],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("brewlog_beans_cache", JSON.stringify([cachedBean]));

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

    const { result } = renderHook(() => useBeans());

    expect(result.current.beans).toEqual([cachedBean]);
  });

  it("adds bean offline with local-bean- prefix and updates localStorage", async () => {
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

    const { result } = renderHook(() => useBeans());

    let created: Bean | undefined;
    await act(async () => {
      created = await result.current.addBean({
        name: "Pink Bourbon",
        roaster: "Dak Coffee Roasters",
        flavorNotes: ["Peach", "Vanilla"],
      });
    });

    expect(created?.id).toMatch(/^local-bean-/);
    expect(result.current.beans.some((b) => b.name === "Pink Bourbon")).toBe(true);

    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored.some((b: Bean) => b.name === "Pink Bourbon")).toBe(true);
  });

  it("updates bean offline and updates localStorage", async () => {
    const existingBean: Bean = {
      id: "local-bean-123",
      name: "Old Name",
      roaster: "Roaster",
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("brewlog_beans_cache", JSON.stringify([existingBean]));

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

    const { result } = renderHook(() => useBeans());

    await act(async () => {
      await result.current.updateBean({
        ...existingBean,
        name: "New Name",
      });
    });

    expect(result.current.beans.find((b) => b.id === "local-bean-123")?.name).toBe("New Name");
    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored.find((b: Bean) => b.id === "local-bean-123")?.name).toBe("New Name");
  });

  it("deletes bean offline and removes from localStorage", async () => {
    const beanToKeep: Bean = {
      id: "bean-keep",
      name: "Keep",
      roaster: "Roaster",
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    const beanToDelete: Bean = {
      id: "bean-delete",
      name: "Delete Me",
      roaster: "Roaster",
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(
      "brewlog_beans_cache",
      JSON.stringify([beanToKeep, beanToDelete])
    );

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

    const { result } = renderHook(() => useBeans());

    await act(async () => {
      await result.current.deleteBean("bean-delete");
    });

    expect(result.current.beans.some((b) => b.id === "bean-delete")).toBe(false);
    expect(result.current.beans.some((b) => b.id === "bean-keep")).toBe(true);

    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored.some((b: Bean) => b.id === "bean-delete")).toBe(false);
    expect(stored.some((b: Bean) => b.id === "bean-keep")).toBe(true);
  });

  it("auto-syncs offline local-bean- items when authenticated and fetches from Supabase", async () => {
    const offlineBean: Bean = {
      id: "local-bean-999",
      name: "Offline Bourbon",
      roaster: "Local Roastery",
      originCountry: "Guatemala",
      flavorNotes: ["Cacao", "Nut"],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("brewlog_beans_cache", JSON.stringify([offlineBean]));

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "db-bean-1",
          user_id: "user-123",
          name: "Synced Bourbon",
          roaster: "Local Roastery",
          origin_country: "Guatemala",
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "beans") {
        return {
          insert: mockInsert,
          select: mockSelect,
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

    const { result } = renderHook(() => useBeans());

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(result.current.beans).toHaveLength(1);
      expect(result.current.beans[0].id).toBe("db-bean-1");
      expect(result.current.beans[0].name).toBe("Synced Bourbon");
    });

    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored[0].id).toBe("db-bean-1");
  });

  it("retains pending unsynced offline beans if cloud insert fails during sync", async () => {
    const offlineBean: Bean = {
      id: "local-bean-failed",
      name: "Pending Offline Geisha",
      roaster: "Local Roaster",
      originCountry: "Panama",
      flavorNotes: ["Jasmine", "Bergamot"],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("brewlog_beans_cache", JSON.stringify([offlineBean]));

    const mockInsert = vi.fn().mockResolvedValue({ error: new Error("Network timeout") });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "beans") {
        return {
          insert: mockInsert,
          select: mockSelect,
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

    const { result } = renderHook(() => useBeans());

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(result.current.beans).toHaveLength(1);
      expect(result.current.beans[0].id).toBe("local-bean-failed");
      expect(result.current.beans[0].name).toBe("Pending Offline Geisha");
    });

    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("local-bean-failed");
  });

  it("reverts local state and localStorage and rethrows if updateBean fails in Supabase", async () => {
    const originalBean: Bean = {
      id: "db-bean-rollback",
      name: "Original Bourbon",
      roaster: "Sey Coffee",
      originCountry: "Burundi",
      flavorNotes: ["Red Currant", "Honey"],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("brewlog_beans_cache", JSON.stringify([originalBean]));

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("Network timeout during bean update"),
          }),
        }),
      }),
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "db-bean-rollback",
          user_id: "user-123",
          name: "Original Bourbon",
          roaster: "Sey Coffee",
          origin_country: "Burundi",
          flavor_notes: ["Red Currant", "Honey"],
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === "beans") {
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

    const { result } = renderHook(() => useBeans());

    await waitFor(() => {
      expect(result.current.beans).toHaveLength(1);
    });

    await act(async () => {
      await expect(
        result.current.updateBean({
          ...originalBean,
          name: "Faulty Bourbon Update",
        })
      ).rejects.toThrow("Network timeout during bean update");
    });

    // Verify state was reverted
    expect(result.current.beans[0].name).toBe("Original Bourbon");

    // Verify localStorage was reverted
    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored[0].name).toBe("Original Bourbon");
  });
});
