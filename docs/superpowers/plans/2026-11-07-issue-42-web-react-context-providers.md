# Web React Context Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `apps/web` domain state hooks (`useEquipment`, `useBeans`, `useRecipes`, `useReviews`) into top-level React Context providers matching `apps/mobile`, move cross-route selection state into their owning domain contexts, and remove `RootOutletContext` prop drilling.

**Architecture:** Each of the 4 Web domains (`equipment`, `stash`, `recipes`, `reviews`) is provided by a dedicated React Context (`EquipmentContext.tsx`, `BeansContext.tsx`, `RecipeContext.tsx`, `ReviewsContext.tsx`) mounted at the application root via `<AppProviders>` in `App.tsx`. Primary hooks (`useEquipment`, `useBeans`, `useRecipes`, `useReviews`) enforce strict provider presence by throwing when called outside their provider, while `useOptional*` variants return `null` when no provider is mounted. Routes and modals consume these context hooks directly, slimming `RootLayout.tsx` down to pure layout concerns.

**Tech Stack:** React 19, React Router v7, TypeScript, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-07-issue-42-web-react-context-providers-design.md`

## Global Constraints

- Maintain all existing `localStorage` keys (`brewlog_equipment_cache`, `brewlog_beans_cache`, `brewlog_custom_recipes_cache`, `brewlog_last_active_recipe`) and Supabase sync/rollback behavior.
- Enforce strict context consumption: calling `useEquipment()`, `useBeans()`, `useRecipes()`, or `useReviews()` outside its respective Provider must throw `new Error('<hookName> must be used within a <ProviderName>')`.
- Export `useOptionalEquipment`, `useOptionalBeans` (plus `useOptionalStash`), `useOptionalRecipes`, and `useOptionalReviews` returning `<ContextValue> | null`.
- Do not modify `apps/mobile` or `@brewlog/core`.

---

### Task 1: Convert `useEquipment` into `EquipmentContext`

**Files:**
- Create: `apps/web/src/features/equipment/EquipmentContext.tsx`
- Create: `apps/web/src/features/equipment/EquipmentContext.test.tsx`
- Delete: `apps/web/src/features/equipment/useEquipment.ts`
- Delete: `apps/web/src/features/equipment/useEquipment.test.ts`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthContext`, `supabase` from `../../lib/supabase`, `Equipment` and `DEFAULT_INITIAL_EQUIPMENT` from `@brewlog/core`.
- Produces:
  - `EquipmentContextValue` interface (`equipment`, `grinders`, `brewers`, `scales`, `kettles`, `other`, `loading`, `addEquipment`, `updateEquipment`, `deleteEquipment`, `toggleFavorite`, `refreshEquipment`)
  - `EquipmentContext: React.Context<EquipmentContextValue | null>`
  - `EquipmentProvider: React.FC<{ children: ReactNode }>`
  - `useEquipment(): EquipmentContextValue`
  - `useOptionalEquipment(): EquipmentContextValue | null`

- [ ] **Step 1: Create `EquipmentContext.test.tsx` with strict provider tests, derived category tests, and existing CRUD/sync tests**

Create `apps/web/src/features/equipment/EquipmentContext.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  EquipmentProvider,
  useEquipment,
  useOptionalEquipment,
} from "./EquipmentContext";
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EquipmentProvider>{children}</EquipmentProvider>
);

describe("EquipmentContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("throws when useEquipment is used outside EquipmentProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useEquipment())).toThrow(
      "useEquipment must be used within an EquipmentProvider"
    );
    spy.mockRestore();
  });

  it("returns null when useOptionalEquipment is used outside EquipmentProvider", () => {
    const { result } = renderHook(() => useOptionalEquipment());
    expect(result.current).toBeNull();
  });

  it("initializes with INITIAL_EQUIPMENT and derived categories when unauthenticated and localStorage is empty", async () => {
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

    const { result } = renderHook(() => useEquipment(), { wrapper });

    expect(result.current.equipment).toEqual(INITIAL_EQUIPMENT);
    expect(result.current.grinders).toEqual(
      INITIAL_EQUIPMENT.filter((e) => e.type === "grinder")
    );
    expect(result.current.brewers).toEqual(
      INITIAL_EQUIPMENT.filter((e) => e.type === "brewer")
    );
    expect(result.current.scales).toEqual(
      INITIAL_EQUIPMENT.filter((e) => e.type === "scale")
    );
    expect(result.current.kettles).toEqual(
      INITIAL_EQUIPMENT.filter((e) => e.type === "kettle")
    );
    expect(result.current.other).toEqual(
      INITIAL_EQUIPMENT.filter((e) => e.type === "other")
    );
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

    const { result } = renderHook(() => useEquipment(), { wrapper });

    expect(result.current.equipment).toEqual(cachedGear);
  });

  it("initializes with empty array and does not resurrect default equipment when cache is empty array", async () => {
    localStorage.setItem("brewlog_equipment_cache", JSON.stringify([]));

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

    const { result } = renderHook(() => useEquipment(), { wrapper });

    expect(result.current.equipment).toEqual([]);
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

    const { result } = renderHook(() => useEquipment(), { wrapper });

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
    expect(result.current.equipment[0].id).toBe(addedItem.id);

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

    const { result } = renderHook(() => useEquipment(), { wrapper });

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

    const { result } = renderHook(() => useEquipment(), { wrapper });

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

  it("preserves failed offline equipment items if Supabase insert fails during sync", async () => {
    const offlineItem = {
      id: "local-eq-fail-1",
      type: "grinder" as const,
      brand: "1Zpresso",
      model: "JX-Pro",
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

    const mockInsert = vi.fn().mockResolvedValue({ error: new Error("Network timeout") });
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "uuid-remote-1",
          user_id: "user-123-abc",
          type: "brewer",
          brand: "Hario",
          model: "V60",
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

    const { result } = renderHook(() => useEquipment(), { wrapper });

    await waitFor(() => {
      expect(result.current.equipment.some((e) => e.id === "local-eq-fail-1")).toBe(true);
      expect(result.current.equipment.some((e) => e.id === "uuid-remote-1")).toBe(true);
    });

    const saved = JSON.parse(localStorage.getItem("brewlog_equipment_cache") || "[]");
    expect(saved.some((e: any) => e.id === "local-eq-fail-1")).toBe(true);
    expect(saved.some((e: any) => e.id === "uuid-remote-1")).toBe(true);
  });

  it("updates equipment offline and updates state and localStorage", async () => {
    const cachedGear = [
      {
        id: "eq-update-me",
        type: "grinder" as const,
        brand: "Fellow",
        model: "Ode Gen 1",
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

    const { result } = renderHook(() => useEquipment(), { wrapper });

    await act(async () => {
      await result.current.updateEquipment("eq-update-me", {
        model: "Ode Gen 2",
        subType: "SSP MP Burrs",
      });
    });

    expect(result.current.equipment[0].model).toBe("Ode Gen 2");
    expect(result.current.equipment[0].subType).toBe("SSP MP Burrs");
    const saved = JSON.parse(localStorage.getItem("brewlog_equipment_cache") || "[]");
    expect(saved[0].model).toBe("Ode Gen 2");
    expect(saved[0].subType).toBe("SSP MP Burrs");
  });

  it("toggles favorite on equipment and persists", async () => {
    const cachedGear = [
      {
        id: "eq-fav-me",
        type: "brewer" as const,
        brand: "Hario",
        model: "V60",
        isFavorite: false,
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

    const { result } = renderHook(() => useEquipment(), { wrapper });

    expect(result.current.equipment[0].isFavorite).toBe(false);

    await act(async () => {
      await result.current.toggleFavorite("eq-fav-me");
    });

    expect(result.current.equipment[0].isFavorite).toBe(true);
    const saved = JSON.parse(localStorage.getItem("brewlog_equipment_cache") || "[]");
    expect(saved[0].isFavorite).toBe(true);

    await act(async () => {
      await result.current.toggleFavorite("eq-fav-me");
    });

    expect(result.current.equipment[0].isFavorite).toBe(false);
  });
});
```

- [ ] **Step 2: Create `EquipmentContext.tsx` and remove old `useEquipment.ts` & `useEquipment.test.ts`**

Create `apps/web/src/features/equipment/EquipmentContext.tsx`:

```tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Equipment, DEFAULT_INITIAL_EQUIPMENT } from "@brewlog/core";
import {
  mapEquipmentRowToDomain,
  mapEquipmentDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";

const STORAGE_KEY = "brewlog_equipment_cache";

export interface EquipmentContextValue {
  equipment: Equipment[];
  grinders: Equipment[];
  brewers: Equipment[];
  scales: Equipment[];
  kettles: Equipment[];
  other: Equipment[];
  loading: boolean;
  addEquipment: (newEquipment: Omit<Equipment, "id" | "createdAt">) => Promise<Equipment>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>;
  deleteEquipment: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refreshEquipment: () => Promise<void>;
}

export const EquipmentContext = createContext<EquipmentContextValue | null>(null);

const loadLocalEquipment = (): Equipment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load local equipment cache:", err);
  }
  return DEFAULT_INITIAL_EQUIPMENT;
};

const saveLocalEquipment = (items: Equipment[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save local equipment cache:", err);
  }
};

export const EquipmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>(loadLocalEquipment);
  const [loading, setLoading] = useState(false);

  const fetchEquipment = useCallback(async () => {
    if (!supabase || !user) {
      const local = loadLocalEquipment();
      setEquipment(local);
      return;
    }

    setLoading(true);
    try {
      const localItems = loadLocalEquipment();
      const unsyncedItems = localItems.filter((item) => item.id.startsWith("local-eq-"));
      const syncedIds = new Set<string>();

      if (unsyncedItems.length > 0) {
        console.log(`Auto-syncing ${unsyncedItems.length} offline equipment item(s) to Supabase...`);
        for (const item of unsyncedItems) {
          try {
            const payload = mapEquipmentDomainToInsert(item, user.id);
            const { error: insertErr } = await supabase.from("equipment").insert(payload);
            if (!insertErr) {
              syncedIds.add(item.id);
            } else {
              console.error("Failed to sync item:", item, insertErr);
            }
          } catch (syncErr) {
            console.error("Failed to sync item:", item, syncErr);
          }
        }
      }

      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetchEquipment error:", error);
      } else if (data) {
        const mapped: Equipment[] = data.map(mapEquipmentRowToDomain);
        const remainingUnsynced = localItems.filter(
          (item) => item.id.startsWith("local-eq-") && !syncedIds.has(item.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        setEquipment(merged);
        saveLocalEquipment(merged);
      }
    } catch (err) {
      console.error("fetchEquipment exception:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const addEquipment = useCallback(
    async (newEquipment: Omit<Equipment, "id" | "createdAt">): Promise<Equipment> => {
      const localId = `local-eq-${Date.now()}`;
      const fallbackItem: Equipment = {
        ...newEquipment,
        id: localId,
        createdAt: new Date().toISOString(),
      };

      if (!supabase || !user) {
        setEquipment((prev) => {
          const updated = [fallbackItem, ...prev];
          saveLocalEquipment(updated);
          return updated;
        });
        return fallbackItem;
      }

      try {
        const payload = mapEquipmentDomainToInsert(newEquipment, user.id);

        const { data, error } = await supabase
          .from("equipment")
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error("Supabase equipment insert error:", error);
          setEquipment((prev) => {
            const updated = [fallbackItem, ...prev];
            saveLocalEquipment(updated);
            return updated;
          });
          return fallbackItem;
        }

        if (data) {
          const created = mapEquipmentRowToDomain(data);
          setEquipment((prev) => {
            const updated = [created, ...prev.filter((i) => i.id !== localId)];
            saveLocalEquipment(updated);
            return updated;
          });
          return created;
        }
      } catch (err) {
        console.error("addEquipment exception:", err);
        setEquipment((prev) => {
          const updated = [fallbackItem, ...prev];
          saveLocalEquipment(updated);
          return updated;
        });
        return fallbackItem;
      }

      return fallbackItem;
    },
    [user]
  );

  const updateEquipment = useCallback(
    async (id: string, updates: Partial<Equipment>): Promise<Equipment> => {
      let updatedItem: Equipment | undefined;
      setEquipment((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            updatedItem = { ...item, ...updates };
            return updatedItem;
          }
          return item;
        });
        saveLocalEquipment(updated);
        return updated;
      });

      if (
        supabase &&
        user &&
        !id.startsWith("local-eq-") &&
        !id.startsWith("eq-") &&
        updatedItem
      ) {
        try {
          const payload = mapEquipmentDomainToInsert(updatedItem, user.id);
          const { error } = await supabase
            .from("equipment")
            .update(payload)
            .eq("id", id);
          if (error) {
            console.error("Supabase equipment update error:", error);
          }
        } catch (err) {
          console.error("updateEquipment exception:", err);
        }
      }

      return updatedItem || ({} as Equipment);
    },
    [user]
  );

  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      const current = equipment.find((e) => e.id === id);
      if (!current) return;
      await updateEquipment(id, { isFavorite: !current.isFavorite });
    },
    [equipment, updateEquipment]
  );

  const deleteEquipment = useCallback(
    async (id: string): Promise<void> => {
      setEquipment((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        saveLocalEquipment(updated);
        return updated;
      });

      if (supabase && user && !id.startsWith("local-eq-") && !id.startsWith("eq-")) {
        try {
          const { error } = await supabase.from("equipment").delete().eq("id", id);
          if (error) {
            console.error("Supabase equipment delete error:", error);
          }
        } catch (err) {
          console.error("deleteEquipment exception:", err);
        }
      }
    },
    [user]
  );

  const grinders = useMemo(
    () => equipment.filter((e) => e.type === "grinder"),
    [equipment]
  );

  const brewers = useMemo(
    () => equipment.filter((e) => e.type === "brewer"),
    [equipment]
  );

  const scales = useMemo(
    () => equipment.filter((e) => e.type === "scale"),
    [equipment]
  );

  const kettles = useMemo(
    () => equipment.filter((e) => e.type === "kettle"),
    [equipment]
  );

  const other = useMemo(
    () => equipment.filter((e) => e.type === "other"),
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
    throw new Error("useEquipment must be used within an EquipmentProvider");
  }
  return context;
};
```

Delete `apps/web/src/features/equipment/useEquipment.ts` and `apps/web/src/features/equipment/useEquipment.test.ts`.

---

### Task 2: Convert `useBeans` into `BeansContext` (with `selectedBean` management)

**Files:**
- Create: `apps/web/src/features/stash/BeansContext.tsx`
- Create: `apps/web/src/features/stash/BeansContext.test.tsx`
- Delete: `apps/web/src/features/stash/useBeans.ts`
- Delete: `apps/web/src/features/stash/useBeans.test.ts`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthContext`, `supabase` from `../../lib/supabase`, `INITIAL_BEANS` from `../../lib/sampleData`, `Bean` from `@brewlog/core`.
- Produces:
  - `BeansContextValue` interface (`beans`, `selectedBean`, `loading`, `addBean`, `updateBean`, `deleteBean`, `setSelectedBean`, `refreshBeans`)
  - `BeansContext: React.Context<BeansContextValue | null>`
  - `BeansProvider` (and `StashProvider` alias)
  - `useBeans(): BeansContextValue` (and `useStash` alias)
  - `useOptionalBeans(): BeansContextValue | null` (and `useOptionalStash` alias)

- [ ] **Step 1: Create `BeansContext.test.tsx` covering provider enforcement, `selectedBean` sync on update/delete, and existing CRUD/sync tests**

Create `apps/web/src/features/stash/BeansContext.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  BeansProvider,
  useBeans,
  useOptionalBeans,
} from "./BeansContext";
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BeansProvider>{children}</BeansProvider>
);

describe("BeansContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("throws when useBeans is used outside BeansProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useBeans())).toThrow(
      "useBeans must be used within a BeansProvider"
    );
    spy.mockRestore();
  });

  it("returns null when useOptionalBeans is used outside BeansProvider", () => {
    const { result } = renderHook(() => useOptionalBeans());
    expect(result.current).toBeNull();
  });

  it("initializes with INITIAL_BEANS and sets selectedBean when unauthenticated and localStorage is empty", async () => {
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

    const { result } = renderHook(() => useBeans(), { wrapper });

    expect(result.current.beans).toEqual(INITIAL_BEANS);
    expect(result.current.beans).toHaveLength(1);
    expect(result.current.selectedBean).toEqual(INITIAL_BEANS[0]);
  });

  it("updates selectedBean when the currently selected bean is updated", async () => {
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

    const { result } = renderHook(() => useBeans(), { wrapper });
    expect(result.current.selectedBean?.name).toBe("Old Name");

    await act(async () => {
      await result.current.updateBean({
        ...existingBean,
        name: "Updated Selected Name",
      });
    });

    expect(result.current.selectedBean?.name).toBe("Updated Selected Name");
  });

  it("falls back selectedBean to next available bean when selectedBean is deleted", async () => {
    const bean1: Bean = {
      id: "bean-1",
      name: "First Bean",
      roaster: "Roaster",
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    const bean2: Bean = {
      id: "bean-2",
      name: "Second Bean",
      roaster: "Roaster",
      flavorNotes: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("brewlog_beans_cache", JSON.stringify([bean1, bean2]));

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

    const { result } = renderHook(() => useBeans(), { wrapper });
    expect(result.current.selectedBean?.id).toBe("bean-1");

    await act(async () => {
      await result.current.deleteBean("bean-1");
    });

    expect(result.current.selectedBean?.id).toBe("bean-2");
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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    const { result } = renderHook(() => useBeans(), { wrapper });

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

    expect(result.current.beans[0].name).toBe("Original Bourbon");

    const stored = JSON.parse(localStorage.getItem("brewlog_beans_cache") || "[]");
    expect(stored[0].name).toBe("Original Bourbon");
  });
});
```

- [ ] **Step 2: Create `BeansContext.tsx` and delete old `useBeans.ts` & `useBeans.test.ts`**

Create `apps/web/src/features/stash/BeansContext.tsx`:

```tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Bean } from "@brewlog/core";
import {
  mapBeanRowToDomain,
  mapBeanDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_BEANS } from "../../lib/sampleData";

const STORAGE_KEY = "brewlog_beans_cache";

export interface BeansContextValue {
  beans: Bean[];
  selectedBean: Bean | null;
  loading: boolean;
  addBean: (newBean: Omit<Bean, "id" | "createdAt">) => Promise<Bean>;
  updateBean: (updatedBean: Bean) => Promise<Bean>;
  deleteBean: (id: string) => Promise<void>;
  setSelectedBean: (bean: Bean | null) => void;
  refreshBeans: () => Promise<void>;
}

export const BeansContext = createContext<BeansContextValue | null>(null);

const loadLocalBeans = (): Bean[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load local beans cache:", err);
  }
  return INITIAL_BEANS;
};

const saveLocalBeans = (items: Bean[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save local beans cache:", err);
  }
};

export const BeansProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [beans, setBeans] = useState<Bean[]>(loadLocalBeans);
  const [selectedBean, setSelectedBean] = useState<Bean | null>(
    () => loadLocalBeans()[0] || INITIAL_BEANS[0] || null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedBean && beans.length > 0) {
      setSelectedBean(beans[0]);
    }
  }, [beans, selectedBean]);

  const fetchBeans = useCallback(async () => {
    if (!supabase || !user) {
      const local = loadLocalBeans();
      setBeans(local);
      return;
    }

    setLoading(true);
    try {
      const localItems = loadLocalBeans();
      const unsyncedItems = localItems.filter((item) =>
        item.id.startsWith("local-bean-")
      );
      const syncedIds = new Set<string>();

      if (unsyncedItems.length > 0) {
        console.log(
          `Auto-syncing ${unsyncedItems.length} offline bean(s) to Supabase...`
        );
        for (const item of unsyncedItems) {
          try {
            const payload = mapBeanDomainToInsert(item, user.id);
            const { error: insertErr } = await supabase
              .from("beans")
              .insert(payload);
            if (insertErr) {
              console.error("Failed to sync offline bean:", item.name, insertErr);
            } else {
              syncedIds.add(item.id);
            }
          } catch (syncErr) {
            console.error("Failed to sync bean:", item, syncErr);
          }
        }
      }

      const { data, error } = await supabase
        .from("beans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetchBeans error:", error);
      } else if (data) {
        const mapped: Bean[] = data.map(mapBeanRowToDomain);
        const remainingUnsynced = localItems.filter(
          (b) => b.id.startsWith("local-bean-") && !syncedIds.has(b.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        setBeans(merged);
        saveLocalBeans(merged);
      }
    } catch (err) {
      console.error("fetchBeans exception:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBeans();
  }, [fetchBeans]);

  const addBean = useCallback(
    async (newBean: Omit<Bean, "id" | "createdAt">): Promise<Bean> => {
      const localId = `local-bean-${Date.now()}`;
      const fallbackBean: Bean = {
        ...newBean,
        id: localId,
        createdAt: new Date().toISOString(),
      };

      if (!supabase || !user) {
        setBeans((prev) => {
          const updated = [fallbackBean, ...prev];
          saveLocalBeans(updated);
          return updated;
        });
        return fallbackBean;
      }

      try {
        const payload = mapBeanDomainToInsert(newBean, user.id);
        const { data, error } = await supabase
          .from("beans")
          .insert(payload)
          .select()
          .single();

        if (error || !data) {
          console.error("Supabase insert error:", error);
          setBeans((prev) => {
            const updated = [fallbackBean, ...prev];
            saveLocalBeans(updated);
            return updated;
          });
          return fallbackBean;
        }

        const created: Bean = mapBeanRowToDomain(data);
        setBeans((prev) => {
          const updated = [created, ...prev.filter((item) => item.id !== localId)];
          saveLocalBeans(updated);
          return updated;
        });
        return created;
      } catch (err) {
        console.error("addBean exception:", err);
        setBeans((prev) => {
          const updated = [fallbackBean, ...prev];
          saveLocalBeans(updated);
          return updated;
        });
        return fallbackBean;
      }
    },
    [user]
  );

  const updateBean = useCallback(
    async (updatedBean: Bean): Promise<Bean> => {
      const existing = beans.find((b) => b.id === updatedBean.id);

      setBeans((prev) => {
        const updated = prev.map((b) => (b.id === updatedBean.id ? updatedBean : b));
        saveLocalBeans(updated);
        return updated;
      });

      setSelectedBean((prev) => (prev?.id === updatedBean.id ? updatedBean : prev));

      if (!supabase || !user || updatedBean.id.startsWith("local-bean-")) {
        return updatedBean;
      }

      try {
        const payload = mapBeanDomainToInsert(updatedBean, user.id);
        const { data, error } = await supabase
          .from("beans")
          .update(payload)
          .eq("id", updatedBean.id)
          .select()
          .single();

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }

        if (data) {
          const saved: Bean = mapBeanRowToDomain(data);
          setBeans((prev) => {
            const updated = prev.map((b) => (b.id === saved.id ? saved : b));
            saveLocalBeans(updated);
            return updated;
          });
          setSelectedBean((prev) => (prev?.id === saved.id ? saved : prev));
          return saved;
        }
      } catch (err) {
        console.error("updateBean exception:", err);
        if (existing) {
          setBeans((prev) => {
            const reverted = prev.map((b) => (b.id === updatedBean.id ? existing : b));
            saveLocalBeans(reverted);
            return reverted;
          });
          setSelectedBean((prev) => (prev?.id === updatedBean.id ? existing : prev));
        }
        throw err;
      }

      return updatedBean;
    },
    [beans, user]
  );

  const deleteBean = useCallback(
    async (id: string): Promise<void> => {
      setBeans((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        saveLocalBeans(updated);
        return updated;
      });

      setSelectedBean((prev) => {
        if (prev?.id === id) {
          return beans.find((b) => b.id !== id) || null;
        }
        return prev;
      });

      if (supabase && user && !id.startsWith("local-bean-")) {
        try {
          const { error } = await supabase.from("beans").delete().eq("id", id);
          if (error) {
            console.error("Supabase delete error:", error);
          }
        } catch (err) {
          console.error("deleteBean exception:", err);
        }
      }
    },
    [beans, user]
  );

  const value = useMemo<BeansContextValue>(
    () => ({
      beans,
      selectedBean,
      loading,
      addBean,
      updateBean,
      deleteBean,
      setSelectedBean,
      refreshBeans: fetchBeans,
    }),
    [beans, selectedBean, loading, addBean, updateBean, deleteBean, fetchBeans]
  );

  return <BeansContext.Provider value={value}>{children}</BeansContext.Provider>;
};

export const useOptionalBeans = (): BeansContextValue | null => {
  return useContext(BeansContext);
};

export const useBeans = (): BeansContextValue => {
  const context = useContext(BeansContext);
  if (!context) {
    throw new Error("useBeans must be used within a BeansProvider");
  }
  return context;
};

export const StashProvider = BeansProvider;
export const useStash = useBeans;
export const useOptionalStash = useOptionalBeans;
```

Delete `apps/web/src/features/stash/useBeans.ts` and `apps/web/src/features/stash/useBeans.test.ts`.

---

### Task 3: Convert `useRecipes` into `RecipeContext` (with `selectedRecipe` persistence & self-healing)

**Files:**
- Create: `apps/web/src/features/recipes/RecipeContext.tsx`
- Create: `apps/web/src/features/recipes/RecipeContext.test.tsx`
- Delete: `apps/web/src/features/recipes/useRecipes.ts`
- Delete: `apps/web/src/features/recipes/useRecipes.test.ts`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthContext`, `supabase` from `../../lib/supabase`, `BrewRecipe` and `DEFAULT_PRESET_RECIPES` from `@brewlog/core`.
- Produces:
  - `WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY = 'brewlog_last_active_recipe'`
  - `RecipeContextValue` interface (`recipes`, `customRecipes`, `presets`, `selectedRecipe`, `loading`, `addRecipe`, `updateRecipe`, `deleteRecipe`, `setSelectedRecipe`, `refreshRecipes`)
  - `RecipeContext: React.Context<RecipeContextValue | null>`
  - `RecipeProvider: React.FC<{ children: ReactNode }>`
  - `useRecipes(): RecipeContextValue`
  - `useOptionalRecipes(): RecipeContextValue | null`

- [ ] **Step 1: Create `RecipeContext.test.tsx` covering strict provider checks, `selectedRecipe` persistence/self-healing, and existing recipe tests**

Create `apps/web/src/features/recipes/RecipeContext.test.tsx` migrating all tests from `useRecipes.test.ts` with `{ wrapper: RecipeProvider }`, plus tests for `useRecipes` throwing outside `RecipeProvider`, `useOptionalRecipes` returning `null`, and `selectedRecipe` persistence, self-healing, update synchronization, and delete fallback.

- [ ] **Step 2: Create `RecipeContext.tsx` and delete old `useRecipes.ts` & `useRecipes.test.ts`**

Create `apps/web/src/features/recipes/RecipeContext.tsx`:

```tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { BrewRecipe, DEFAULT_PRESET_RECIPES } from "@brewlog/core";
import {
  mapRecipeRowToDomain,
  mapRecipeDomainToInsert,
  mapRecipeStageDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";

const STORAGE_KEY = "brewlog_custom_recipes_cache";

/**
 * Storage schema note: Web persists { recipeId } in localStorage because custom dose
 * adjustments are managed locally within TimerView state rather than in RecipeContext.
 * In contrast, Mobile persists { recipeId, dose } in AsyncStorage because its timer relies
 * on RecipeContext's activeTimerDose to keep dial adjustments synced across tab navigations.
 */
export const WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY = "brewlog_last_active_recipe";

const loadSavedActiveRecipeId = (): string | null => {
  try {
    const raw = localStorage.getItem(WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.recipeId === "string") {
        return parsed.recipeId;
      }
    }
  } catch (err) {
    console.error("Failed to load last active recipe from localStorage:", err);
  }
  return null;
};

const persistSavedActiveRecipeId = (recipeId: string): void => {
  try {
    localStorage.setItem(
      WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY,
      JSON.stringify({ recipeId })
    );
  } catch (err) {
    console.error("Failed to save last active recipe to localStorage:", err);
  }
};

const loadLocalCustomRecipes = (): BrewRecipe[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load local custom recipes cache:", err);
  }
  return [];
};

const saveLocalCustomRecipes = (items: BrewRecipe[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save local custom recipes cache:", err);
  }
};

export interface RecipeContextValue {
  recipes: BrewRecipe[];
  customRecipes: BrewRecipe[];
  presets: BrewRecipe[];
  selectedRecipe: BrewRecipe;
  loading: boolean;
  addRecipe: (newRecipe: Omit<BrewRecipe, "id" | "createdAt">) => Promise<BrewRecipe>;
  updateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>;
  deleteRecipe: (id: string) => Promise<void>;
  setSelectedRecipe: (recipe: BrewRecipe) => void;
  refreshRecipes: () => Promise<void>;
}

export const RecipeContext = createContext<RecipeContextValue | null>(null);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [customRecipes, setCustomRecipes] = useState<BrewRecipe[]>(loadLocalCustomRecipes);
  const [loading, setLoading] = useState(false);

  const recipes = useMemo(
    () => [...customRecipes, ...DEFAULT_PRESET_RECIPES],
    [customRecipes]
  );

  const [selectedRecipe, setSelectedRecipeState] = useState<BrewRecipe>(() => {
    const initialCustom = loadLocalCustomRecipes();
    const initialAll = [...initialCustom, ...DEFAULT_PRESET_RECIPES];
    const savedId = loadSavedActiveRecipeId();
    if (savedId) {
      const match = initialAll.find((r) => r.id === savedId);
      if (match) return match;
    }
    return initialAll[0] || DEFAULT_PRESET_RECIPES[0];
  });

  const setSelectedRecipe = useCallback((recipe: BrewRecipe) => {
    setSelectedRecipeState(recipe);
    persistSavedActiveRecipeId(recipe.id);
  }, []);

  useEffect(() => {
    const savedId = loadSavedActiveRecipeId();
    if (savedId) {
      const match = recipes.find((r) => r.id === savedId);
      if (match) {
        if (selectedRecipe !== match) {
          setSelectedRecipeState(match);
        }
        return;
      }
      const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
      if (selectedRecipe !== fallback) {
        setSelectedRecipeState(fallback);
      }
      persistSavedActiveRecipeId(fallback.id);
      return;
    }

    if (recipes.length > 0 && !recipes.some((r) => r.id === selectedRecipe.id)) {
      const fallback = recipes[0] || DEFAULT_PRESET_RECIPES[0];
      setSelectedRecipeState(fallback);
      persistSavedActiveRecipeId(fallback.id);
    }
  }, [recipes, selectedRecipe]);

  const fetchRecipes = useCallback(async () => {
    if (!supabase || !user) {
      const local = loadLocalCustomRecipes();
      setCustomRecipes(local);
      return;
    }

    setLoading(true);
    try {
      const localItems = loadLocalCustomRecipes();
      const unsyncedItems = localItems.filter((item) =>
        item.id.startsWith("local-rec-")
      );
      const syncedIds = new Set<string>();

      if (unsyncedItems.length > 0) {
        console.log(
          `Auto-syncing ${unsyncedItems.length} offline custom recipe(s) to Supabase...`
        );
        for (const item of unsyncedItems) {
          try {
            const payload = mapRecipeDomainToInsert(item, user.id);
            const { data: recData, error: recErr } = await supabase
              .from("recipes")
              .insert(payload)
              .select()
              .single();

            if (recErr || !recData) {
              console.error("Failed to sync offline recipe:", item.name, recErr);
              continue;
            }

            syncedIds.add(item.id);

            if (item.stages && item.stages.length > 0) {
              const stagePayloads = item.stages.map((stage, idx) =>
                mapRecipeStageDomainToInsert(stage, recData.id, idx)
              );
              const { error: stageErr } = await supabase
                .from("recipe_stages")
                .insert(stagePayloads);

              if (stageErr) {
                console.error(
                  "Failed to sync stages for recipe:",
                  item.name,
                  stageErr
                );
              }
            }
          } catch (syncErr) {
            console.error("Failed to sync recipe:", item, syncErr);
          }
        }
      }

      const { data, error } = await supabase
        .from("recipes")
        .select("*, recipe_stages(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetchRecipes error:", error);
      } else if (data) {
        const mapped: BrewRecipe[] = data.map((row: any) =>
          mapRecipeRowToDomain(row, row.recipe_stages || [])
        );
        const remainingUnsynced = localItems.filter(
          (r) => r.id.startsWith("local-rec-") && !syncedIds.has(r.id)
        );
        const merged = [...remainingUnsynced, ...mapped];
        setCustomRecipes(merged);
        saveLocalCustomRecipes(merged);
      }
    } catch (err) {
      console.error("fetchRecipes exception:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addRecipe = useCallback(
    async (
      newRecipe: Omit<BrewRecipe, "id" | "createdAt">
    ): Promise<BrewRecipe> => {
      const localId = `local-rec-${Date.now()}`;
      const stagesWithIds = (newRecipe.stages || []).map((stage, index) => ({
        ...stage,
        id: stage.id || `local-stage-${Date.now()}-${index}`,
      }));

      const fallbackRecipe: BrewRecipe = {
        ...newRecipe,
        id: localId,
        stages: stagesWithIds,
        isPreset: false,
        createdAt: new Date().toISOString(),
      };

      if (!supabase || !user) {
        setCustomRecipes((prev) => {
          const updated = [fallbackRecipe, ...prev];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return fallbackRecipe;
      }

      try {
        const payload = mapRecipeDomainToInsert(newRecipe, user.id);

        const { data: recData, error: recError } = await supabase
          .from("recipes")
          .insert(payload)
          .select()
          .single();

        if (recError || !recData) {
          console.error("Supabase recipe insert error:", recError);
          setCustomRecipes((prev) => {
            const updated = [fallbackRecipe, ...prev];
            saveLocalCustomRecipes(updated);
            return updated;
          });
          return fallbackRecipe;
        }

        let createdStages: any[] = [];
        if (stagesWithIds.length > 0) {
          const stageInserts = stagesWithIds.map((stage, idx) =>
            mapRecipeStageDomainToInsert(stage, recData.id, idx)
          );
          const { data: stageData, error: stageError } = await supabase
            .from("recipe_stages")
            .insert(stageInserts)
            .select();

          if (stageError) {
            console.error("Supabase recipe stages insert error:", stageError);
          } else if (stageData) {
            createdStages = stageData;
          }
        }

        const createdRecipe = mapRecipeRowToDomain(recData, createdStages);
        setCustomRecipes((prev) => {
          const updated = [
            createdRecipe,
            ...prev.filter((r) => r.id !== localId),
          ];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return createdRecipe;
      } catch (err) {
        console.error("addRecipe exception:", err);
        setCustomRecipes((prev) => {
          const updated = [fallbackRecipe, ...prev];
          saveLocalCustomRecipes(updated);
          return updated;
        });
        return fallbackRecipe;
      }
    },
    [user]
  );

  const updateRecipe = useCallback(
    async (
      id: string,
      updates: Partial<BrewRecipe>
    ): Promise<BrewRecipe> => {
      if (
        id.startsWith("preset-") ||
        DEFAULT_PRESET_RECIPES.some((p) => p.id === id)
      ) {
        console.warn("Cannot edit built-in preset recipe:", id);
        return DEFAULT_PRESET_RECIPES.find((p) => p.id === id)!;
      }

      const existing = customRecipes.find((r) => r.id === id);
      if (!existing) {
        console.warn("Cannot find recipe to update:", id);
        throw new Error(`Recipe with id ${id} not found`);
      }

      const stagesWithIds = updates.stages
        ? updates.stages.map((stage, index) => ({
            ...stage,
            id: stage.id || `local-stage-${Date.now()}-${index}`,
          }))
        : existing.stages;

      const updatedTarget: BrewRecipe = {
        ...existing,
        ...updates,
        stages: stagesWithIds,
      };

      setCustomRecipes((prev) => {
        const updated = prev.map((item) => (item.id === id ? updatedTarget : item));
        saveLocalCustomRecipes(updated);
        return updated;
      });

      setSelectedRecipeState((prev) => (prev.id === id ? updatedTarget : prev));

      if (supabase && user && !id.startsWith("local-rec-")) {
        try {
          const payload = mapRecipeDomainToInsert(updatedTarget, user.id);
          const { error: updateErr } = await supabase
            .from("recipes")
            .update(payload)
            .eq("id", id);

          if (updateErr) {
            throw new Error(updateErr.message || "Failed to update recipe in Supabase");
          }

          if (updates.stages) {
            const { error: deleteStagesErr } = await supabase
              .from("recipe_stages")
              .delete()
              .eq("recipe_id", id);

            if (deleteStagesErr) {
              throw new Error(
                deleteStagesErr.message || "Failed to clear old stages in Supabase"
              );
            }

            if (updates.stages.length > 0) {
              const stageInserts = updates.stages.map((st, idx) =>
                mapRecipeStageDomainToInsert(st, id, idx)
              );
              const { error: insertStagesErr } = await supabase
                .from("recipe_stages")
                .insert(stageInserts);

              if (insertStagesErr) {
                throw new Error(
                  insertStagesErr.message || "Failed to save updated stages in Supabase"
                );
              }
            }
          }
        } catch (err) {
          console.error("updateRecipe exception:", err);
          setCustomRecipes((prev) => {
            const reverted = prev.map((item) => (item.id === id ? existing : item));
            saveLocalCustomRecipes(reverted);
            return reverted;
          });
          setSelectedRecipeState((prev) => (prev.id === id ? existing : prev));
          throw err;
        }
      }

      return updatedTarget;
    },
    [customRecipes, user]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (
        DEFAULT_PRESET_RECIPES.some((p) => p.id === id) ||
        id.startsWith("preset-")
      ) {
        console.warn("Cannot delete built-in preset recipe:", id);
        return;
      }

      setCustomRecipes((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        saveLocalCustomRecipes(updated);
        return updated;
      });

      setSelectedRecipeState((prev) => {
        if (prev.id === id) {
          const fallback = DEFAULT_PRESET_RECIPES[0];
          persistSavedActiveRecipeId(fallback.id);
          return fallback;
        }
        return prev;
      });

      if (supabase && user && !id.startsWith("local-rec-")) {
        try {
          const { error } = await supabase
            .from("recipes")
            .delete()
            .eq("id", id);
          if (error) {
            console.error("Supabase recipe delete error:", error);
          }
        } catch (err) {
          console.error("deleteRecipe exception:", err);
        }
      }
    },
    [user]
  );

  const value = useMemo<RecipeContextValue>(
    () => ({
      recipes,
      customRecipes,
      presets: DEFAULT_PRESET_RECIPES,
      selectedRecipe,
      loading,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      setSelectedRecipe,
      refreshRecipes: fetchRecipes,
    }),
    [
      recipes,
      customRecipes,
      selectedRecipe,
      loading,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      setSelectedRecipe,
      fetchRecipes,
    ]
  );

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
};

export const useOptionalRecipes = (): RecipeContextValue | null => {
  return useContext(RecipeContext);
};

export const useRecipes = (): RecipeContextValue => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipes must be used within a RecipeProvider");
  }
  return context;
};
```

Delete `apps/web/src/features/recipes/useRecipes.ts` and `apps/web/src/features/recipes/useRecipes.test.ts`.

---

### Task 4: Convert `useReviews` into `ReviewsContext` (with `pendingBrewSession` state)

**Files:**
- Create: `apps/web/src/features/reviews/ReviewsContext.tsx`
- Create: `apps/web/src/features/reviews/ReviewsContext.test.tsx`
- Delete: `apps/web/src/features/reviews/useReviews.ts`
- Delete: `apps/web/src/features/reviews/useReviews.test.ts`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthContext`, `supabase` from `../../lib/supabase`, `INITIAL_TASTING_LOGS` from `../../lib/sampleData`, `PendingBrewSession` from `./ReviewsView`.
- Produces:
  - `ReviewsContextValue` (and `UseReviewsReturn` alias) interface (`logs`, `reviews`, `loading`, `pendingBrewSession`, `setPendingBrewSession`, `addReview`, `updateReview`, `deleteReview`, `addTastingLog`, `updateTastingLog`, `deleteTastingLog`, `refreshLogs`)
  - `ReviewsContext: React.Context<ReviewsContextValue | null>`
  - `ReviewsProvider: React.FC<{ children: ReactNode }>`
  - `useReviews(): ReviewsContextValue` (and `useTastingLogs` alias)
  - `useOptionalReviews(): ReviewsContextValue | null`

- [ ] **Step 1: Create `ReviewsContext.test.tsx` covering provider enforcement, `pendingBrewSession`, and existing review CRUD/rollback tests**

Create `apps/web/src/features/reviews/ReviewsContext.test.tsx` migrating all tests from `useReviews.test.ts` with `{ wrapper: ReviewsProvider }`, plus tests for `useReviews` throwing outside `ReviewsProvider`, `useOptionalReviews` returning `null`, and `setPendingBrewSession`.

- [ ] **Step 2: Create `ReviewsContext.tsx` and delete old `useReviews.ts` & `useReviews.test.ts`**

Create `apps/web/src/features/reviews/ReviewsContext.tsx`:

```tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { TastingLog } from "@brewlog/core";
import {
  mapTastingLogRowToDomain,
  mapTastingLogDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_TASTING_LOGS } from "../../lib/sampleData";
import { PendingBrewSession } from "./ReviewsView";

export interface ReviewsContextValue {
  logs: TastingLog[];
  reviews: TastingLog[];
  loading: boolean;
  pendingBrewSession: PendingBrewSession | null;
  setPendingBrewSession: (session: PendingBrewSession | null) => void;
  addReview: (log: Omit<TastingLog, "id" | "createdAt">) => Promise<TastingLog | void>;
  updateReview: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteReview: (id: string) => Promise<void>;
  addTastingLog: (log: Omit<TastingLog, "id" | "createdAt">) => Promise<TastingLog | void>;
  updateTastingLog: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteTastingLog: (id: string) => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export type UseReviewsReturn = ReviewsContextValue;

export const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TastingLog[]>(INITIAL_TASTING_LOGS);
  const [loading, setLoading] = useState(false);
  const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!supabase || !user) {
      setLogs(INITIAL_TASTING_LOGS);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("tasting_logs")
      .select("*")
      .order("brew_date", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: TastingLog[] = data.map(mapTastingLogRowToDomain);
      setLogs(mapped);
    } else if (!error && data && data.length === 0) {
      setLogs([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addTastingLog = useCallback(
    async (log: Omit<TastingLog, "id" | "createdAt">) => {
      if (!supabase || !user) {
        const localLog: TastingLog = {
          ...log,
          id: "local-log-" + Date.now(),
          createdAt: new Date().toISOString(),
        };
        setLogs((prev) => [localLog, ...prev]);
        return localLog;
      }

      const payload = mapTastingLogDomainToInsert(log, user.id);

      const { data, error } = await supabase
        .from("tasting_logs")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("addTastingLog error:", error);
        throw error;
      }

      if (data) {
        const created: TastingLog = mapTastingLogRowToDomain(data);
        setLogs((prev) => [created, ...prev]);
        return created;
      }
    },
    [user]
  );

  const updateTastingLog = useCallback(
    async (id: string, updates: Partial<TastingLog>) => {
      const existing = logs.find((l) => l.id === id);
      if (!existing) {
        return;
      }

      const updatedLog: TastingLog = {
        ...existing,
        ...updates,
        scores: updates.scores ? { ...existing.scores, ...updates.scores } : existing.scores,
      };

      setLogs((prev) => prev.map((l) => (l.id === id ? updatedLog : l)));

      if (!supabase || !user || id.startsWith("local-log-")) {
        return updatedLog;
      }

      try {
        const payload = mapTastingLogDomainToInsert(updatedLog, user.id);
        const { data, error } = await supabase
          .from("tasting_logs")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("updateTastingLog error:", error);
          throw error;
        }

        if (data) {
          const saved: TastingLog = mapTastingLogRowToDomain(data);
          setLogs((prev) => prev.map((l) => (l.id === id ? saved : l)));
          return saved;
        }
      } catch (err) {
        console.error("updateTastingLog exception:", err);
        setLogs((prev) => prev.map((l) => (l.id === id ? existing : l)));
        throw err;
      }
      return updatedLog;
    },
    [logs, user]
  );

  const deleteTastingLog = useCallback(
    async (id: string) => {
      const existingIndex = logs.findIndex((l) => l.id === id);
      const existing = logs[existingIndex];
      setLogs((prev) => prev.filter((l) => l.id !== id));

      if (!supabase || !user || id.startsWith("local-log-")) {
        return;
      }

      try {
        const { error } = await supabase.from("tasting_logs").delete().eq("id", id);
        if (error) {
          console.error("deleteTastingLog error:", error);
          throw error;
        }
      } catch (err) {
        console.error("deleteTastingLog exception:", err);
        if (existing) {
          setLogs((prev) => {
            if (prev.some((l) => l.id === id)) return prev;
            const existingTime = new Date(existing.brewDate).getTime();
            const insertIndex = !isNaN(existingTime)
              ? prev.findIndex((l) => new Date(l.brewDate).getTime() < existingTime)
              : existingIndex;

            const next = [...prev];
            if (insertIndex === -1) {
              next.push(existing);
            } else {
              next.splice(insertIndex, 0, existing);
            }
            return next;
          });
        }
        throw err;
      }
    },
    [logs, user]
  );

  const value = useMemo<ReviewsContextValue>(
    () => ({
      logs,
      reviews: logs,
      loading,
      pendingBrewSession,
      setPendingBrewSession,
      addReview: addTastingLog,
      addTastingLog,
      updateReview: updateTastingLog,
      updateTastingLog,
      deleteReview: deleteTastingLog,
      deleteTastingLog,
      refreshLogs: fetchLogs,
    }),
    [
      logs,
      loading,
      pendingBrewSession,
      addTastingLog,
      updateTastingLog,
      deleteTastingLog,
      fetchLogs,
    ]
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
};

export const useOptionalReviews = (): ReviewsContextValue | null => {
  return useContext(ReviewsContext);
};

export const useReviews = (): ReviewsContextValue => {
  const context = useContext(ReviewsContext);
  if (!context) {
    throw new Error("useReviews must be used within a ReviewsProvider");
  }
  return context;
};

export const useTastingLogs = useReviews;
```

Delete `apps/web/src/features/reviews/useReviews.ts` and `apps/web/src/features/reviews/useReviews.test.ts`.

---

### Task 5: Update `App.tsx`, `RootLayout.tsx`, Routes, and Recipe Components to Consume Context Directly

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/layouts/RootLayout.tsx`
- Modify: `apps/web/src/routes/TimerRoute.tsx`
- Modify: `apps/web/src/routes/StashRoute.tsx`
- Modify: `apps/web/src/routes/EquipmentRoute.tsx`
- Modify: `apps/web/src/routes/ReviewsRoute.tsx`
- Modify: `apps/web/src/routes/RecipesRoute.tsx`
- Modify: `apps/web/src/routes/RecipeDetailRoute.tsx`
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.tsx`
- Modify: `apps/web/src/features/recipes/RecipeBuilderModal.tsx`

**Interfaces:**
- Consumes: `EquipmentProvider`/`useEquipment`/`useOptionalEquipment`, `BeansProvider`/`useBeans`, `RecipeProvider`/`useRecipes`, `ReviewsProvider`/`useReviews`.
- Produces:
  - `AppProviders` and `App` in `apps/web/src/App.tsx`
  - Slimmed `RootLayout` in `apps/web/src/layouts/RootLayout.tsx` (re-exporting `WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY` from `RecipeContext` for convenience)
  - Context-driven routes and components with zero `RootOutletContext` prop drilling and no `locallyAddedGrinders` workaround in `RecipeBuilderModal.tsx`.

- [ ] **Step 1: Update `App.tsx` to define and mount `<AppProviders>`**

Update `apps/web/src/App.tsx`:

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './features/auth/AuthContext';
import { SettingsProvider } from './features/settings/SettingsContext';
import { RecipeProvider } from './features/recipes/RecipeContext';
import { BeansProvider } from './features/stash/BeansContext';
import { EquipmentProvider } from './features/equipment/EquipmentContext';
import { ReviewsProvider } from './features/reviews/ReviewsContext';
import { RootLayout } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { RecipesRoute } from './routes/RecipesRoute';
import { RecipeIndexRoute } from './routes/RecipeIndexRoute';
import { RecipeDetailRoute } from './routes/RecipeDetailRoute';
import { EquipmentRoute } from './routes/EquipmentRoute';
import { ReviewsRoute } from './routes/ReviewsRoute';
import { SettingsRoute } from './routes/SettingsRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <RecipeProvider>
          <BeansProvider>
            <EquipmentProvider>
              <ReviewsProvider>
                {children}
              </ReviewsProvider>
            </EquipmentProvider>
          </BeansProvider>
        </RecipeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Navigate to="/timer" replace />} />
            <Route path="timer" element={<TimerRoute />} />
            <Route path="stash" element={<StashRoute />} />
            <Route path="recipes" element={<RecipesRoute />}>
              <Route index element={<RecipeIndexRoute />} />
              <Route path=":recipeId" element={<RecipeDetailRoute />} />
            </Route>
            <Route path="equipment" element={<EquipmentRoute />} />
            <Route path="reviews" element={<ReviewsRoute />} />
            <Route path="settings" element={<SettingsRoute />} />
            <Route path="cupping" element={<Navigate to="/reviews" replace />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};
```

- [ ] **Step 2: Slim `RootLayout.tsx` down to layout and auth modal concerns**

Update `apps/web/src/layouts/RootLayout.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router';
import { Header } from '../components/shared/Header';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../features/auth/AuthContext';
import { useBeans } from '../features/stash/BeansContext';
import { useReviews } from '../features/reviews/ReviewsContext';
export { WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY } from '../features/recipes/RecipeContext';

export const RootLayout: React.FC = () => {
  const { beans } = useBeans();
  const { logs: tastingLogs } = useReviews();
  const { isPasswordRecovery, authUrlError } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery || authUrlError) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, authUrlError]);

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col font-sans selection:bg-accent/30 selection:text-foreground">
      <Header
        beanCount={beans.length}
        brewCount={tastingLogs.length}
        onOpenAuthModal={handleOpenAuthModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
      />
    </div>
  );
};
```

- [ ] **Step 3: Update `TimerRoute.tsx`, `StashRoute.tsx`, `EquipmentRoute.tsx`, `ReviewsRoute.tsx`, `RecipesRoute.tsx`, and `RecipeDetailRoute.tsx`**

Update `apps/web/src/routes/TimerRoute.tsx`:

```tsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { TimerView } from '../features/timer/TimerView';
import { useRecipes } from '../features/recipes/RecipeContext';
import { useBeans } from '../features/stash/BeansContext';
import { useReviews } from '../features/reviews/ReviewsContext';
import { BrewRecipe, Bean, TimerMode } from '@brewlog/core';

export const TimerRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode: TimerMode | undefined =
    modeParam === 'recipe' || modeParam === 'free_brew' ? (modeParam as TimerMode) : undefined;

  const { selectedRecipe, addRecipe } = useRecipes();
  const { beans, selectedBean, setSelectedBean } = useBeans();
  const { setPendingBrewSession } = useReviews();
  const navigate = useNavigate();

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => {
    setPendingBrewSession({
      bean: bean || selectedBean,
      recipe,
      actualTimeSeconds,
    });
    navigate('/reviews');
  };

  const handleSelectOtherRecipe = () => {
    navigate('/recipes');
  };

  const handleSaveAsRecipe = async (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
    await addRecipe(recipe);
    navigate('/recipes');
  };

  return (
    <TimerView
      key={`${selectedRecipe.id}-${initialMode ?? 'default'}`}
      recipe={selectedRecipe}
      initialMode={initialMode}
      selectedBean={selectedBean}
      beans={beans}
      onSelectBean={setSelectedBean}
      onSelectOtherRecipe={handleSelectOtherRecipe}
      onLogCompletedBrew={handleLogCompletedBrew}
      onSaveAsRecipe={handleSaveAsRecipe}
    />
  );
};
```

Update `apps/web/src/routes/StashRoute.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router';
import { StashView } from '../features/stash/StashView';
import { useBeans } from '../features/stash/BeansContext';
import { Bean } from '@brewlog/core';

export const StashRoute: React.FC = () => {
  const { beans, addBean, updateBean, deleteBean, setSelectedBean } = useBeans();
  const navigate = useNavigate();

  const handleSelectBeanForBrew = (bean: Bean) => {
    setSelectedBean(bean);
    navigate('/timer');
  };

  const handleAddBean = async (bean: Bean) => {
    await addBean(bean);
  };

  const handleUpdateBean = async (bean: Bean) => {
    await updateBean(bean);
  };

  return (
    <StashView
      beans={beans}
      onAddBean={handleAddBean}
      onUpdateBean={handleUpdateBean}
      onDeleteBean={deleteBean}
      onSelectBeanForBrew={handleSelectBeanForBrew}
    />
  );
};
```

Update `apps/web/src/routes/EquipmentRoute.tsx`:

```tsx
import React from 'react';
import { EquipmentView } from '../features/equipment/EquipmentView';
import { useEquipment } from '../features/equipment/EquipmentContext';

export const EquipmentRoute: React.FC = () => {
  const {
    equipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    toggleFavorite,
  } = useEquipment();

  return (
    <EquipmentView
      equipment={equipment}
      onAddEquipment={addEquipment}
      onUpdateEquipment={updateEquipment}
      onDeleteEquipment={deleteEquipment}
      onToggleFavorite={toggleFavorite}
    />
  );
};
```

Update `apps/web/src/routes/ReviewsRoute.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router';
import { ReviewsView } from '../features/reviews/ReviewsView';
import { useReviews } from '../features/reviews/ReviewsContext';
import { useBeans } from '../features/stash/BeansContext';
import { useRecipes } from '../features/recipes/RecipeContext';
import { useEquipment } from '../features/equipment/EquipmentContext';
import { TastingLog } from '@brewlog/core';

export const ReviewsRoute: React.FC = () => {
  const navigate = useNavigate();
  const {
    logs: tastingLogs,
    pendingBrewSession,
    setPendingBrewSession,
    addTastingLog,
    updateTastingLog,
    deleteTastingLog,
  } = useReviews();
  const { beans, setSelectedBean } = useBeans();
  const { recipes, setSelectedRecipe } = useRecipes();
  const { equipment } = useEquipment();

  const handleClearPendingSession = () => {
    setPendingBrewSession(null);
  };

  const handleSaveTastingLog = async (log: Omit<TastingLog, 'id' | 'createdAt'>) => {
    const created = await addTastingLog(log);
    setPendingBrewSession(null);
    return created;
  };

  const handleBrewAgain = (log: TastingLog) => {
    if (log.beanId && beans) {
      const matchedBean = beans.find((b) => b.id === log.beanId);
      if (matchedBean) setSelectedBean(matchedBean);
    } else if (log.beanNameSnapshot && beans) {
      const matchedBean = beans.find(
        (b) => b.name.toLowerCase() === log.beanNameSnapshot.toLowerCase()
      );
      if (matchedBean) setSelectedBean(matchedBean);
    }

    if (log.recipeId && recipes) {
      const matchedRecipe = recipes.find((r) => r.id === log.recipeId);
      if (matchedRecipe) setSelectedRecipe(matchedRecipe);
    } else if (log.brewMethod && recipes) {
      const matchedRecipe = recipes.find((r) => r.brewMethod === log.brewMethod);
      if (matchedRecipe) setSelectedRecipe(matchedRecipe);
    }

    navigate('/timer');
  };

  return (
    <ReviewsView
      logs={tastingLogs}
      beans={beans}
      equipment={equipment}
      pendingBrewSession={pendingBrewSession}
      onClearPendingSession={handleClearPendingSession}
      onAddTastingLog={handleSaveTastingLog}
      onUpdateTastingLog={updateTastingLog}
      onDeleteTastingLog={deleteTastingLog}
      onBrewAgain={handleBrewAgain}
    />
  );
};

export const CuppingRoute = ReviewsRoute;
```

Update `apps/web/src/routes/RecipesRoute.tsx`:

```tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@brewlog/ui';
import { Outlet, useOutletContext, useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { Plus } from 'lucide-react';
import { useRecipes } from '../features/recipes/RecipeContext';
import { RecipeCatalogList } from '../features/recipes/RecipeCatalogList';
import { RecipeBuilderModal } from '../features/recipes/RecipeBuilderModal';

export interface RecipeOutletContext {
  onEditRecipe?: (recipe: BrewRecipe) => void;
}

export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext | undefined>();

export const RecipesRoute: React.FC = () => {
  const {
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  } = useRecipes();
  const { recipeId } = useParams<{ recipeId?: string }>();
  const navigate = useNavigate();

  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<BrewRecipe | null>(null);

  const handleEditRecipe = useCallback((recipe: BrewRecipe) => {
    setEditingRecipe(recipe);
    setIsBuilderModalOpen(true);
  }, []);

  const handleDeleteRecipeFromList = useCallback(
    async (recipe: BrewRecipe) => {
      await deleteRecipe(recipe.id);
      if (recipe.id === recipeId) {
        navigate('/recipes');
      }
    },
    [deleteRecipe, recipeId, navigate]
  );

  const handleSaveRecipe = useCallback(
    async (newRecipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, newRecipe);
        setEditingRecipe(null);
      } else {
        const created = await addRecipe(newRecipe);
        if (created?.id) {
          navigate('/recipes/' + created.id);
        }
      }
    },
    [editingRecipe, updateRecipe, addRecipe, navigate]
  );

  const recipeOutletContextValue = useMemo<RecipeOutletContext>(
    () => ({
      onEditRecipe: handleEditRecipe,
    }),
    [handleEditRecipe]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Recipe Studio
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            World Champion & Expert brew profiles alongside your custom dialed-in recipes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingRecipe(null);
              setIsBuilderModalOpen(true);
            }}
            label="NEW RECIPE"
          />
        </div>
      </div>

      {/* Master-Detail Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Catalog List */}
        <div
          className={`${
            recipeId ? 'hidden lg:block' : 'block'
          } lg:col-span-4`}
        >
          <RecipeCatalogList
            recipes={recipes}
            activeRecipeId={recipeId}
            selectedMethodFilter={selectedMethodFilter}
            onSelectMethodFilter={setSelectedMethodFilter}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipeFromList}
          />
        </div>

        {/* Right Column: Child Route Outlet */}
        <div
          className={`${
            recipeId ? 'block' : 'hidden lg:block'
          } col-span-1 lg:col-span-8`}
        >
          <Outlet context={recipeOutletContextValue} />
        </div>
      </div>

      <RecipeBuilderModal
        isOpen={isBuilderModalOpen}
        initialRecipe={editingRecipe}
        onClose={() => {
          setIsBuilderModalOpen(false);
          setEditingRecipe(null);
        }}
        onSaveRecipe={handleSaveRecipe}
      />
    </div>
  );
};
```

Update `apps/web/src/routes/RecipeDetailRoute.tsx`:

```tsx
import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { useRecipes } from '../features/recipes/RecipeContext';
import { useRecipeOutletContext } from './RecipesRoute';
import { RecipeDetailPane } from '../features/recipes/RecipeDetailPane';
import { NotFoundRoute } from './NotFoundRoute';

export const RecipeDetailRoute: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { recipes, setSelectedRecipe, deleteRecipe } = useRecipes();
  const outletContext = useRecipeOutletContext();

  const recipe = recipes.find((r) => r.id === recipeId);

  const handleSelectRecipeForTimer = useCallback(
    (selectedRecipe: BrewRecipe) => {
      setSelectedRecipe(selectedRecipe);
      navigate('/timer?mode=recipe');
    },
    [setSelectedRecipe, navigate]
  );

  const handleDeleteRecipe = useCallback(
    async (recipeToDelete: BrewRecipe) => {
      await deleteRecipe(recipeToDelete.id);
      navigate('/recipes');
    },
    [deleteRecipe, navigate]
  );

  if (!recipe) {
    return <NotFoundRoute />;
  }

  return (
    <RecipeDetailPane
      recipe={recipe}
      onSelectRecipeForTimer={handleSelectRecipeForTimer}
      onEditRecipe={outletContext?.onEditRecipe}
      onDeleteRecipe={handleDeleteRecipe}
      showMobileBackButton={true}
    />
  );
};
```

- [ ] **Step 4: Update `RecipeDetailPane.tsx` and `RecipeBuilderModal.tsx` to use `EquipmentContext` and remove `locallyAddedGrinders` workaround**

In `apps/web/src/features/recipes/RecipeDetailPane.tsx`:
- Replace `import { useEquipment } from '../equipment/useEquipment';` with `import { useEquipment, useOptionalEquipment } from '../equipment/EquipmentContext';`.
- When `propEquipment` is provided, allow rendering even without an `EquipmentProvider` via `useOptionalEquipment()`; otherwise call `useEquipment()`:
  ```tsx
  const optionalEquipment = useOptionalEquipment();
  const equipment = propEquipment ?? optionalEquipment?.equipment ?? [];
  ```

In `apps/web/src/features/recipes/RecipeBuilderModal.tsx`:
- Replace `import { useEquipment } from "../equipment/useEquipment";` with `import { useOptionalEquipment } from "../equipment/EquipmentContext";`.
- Read `const equipmentContext = useOptionalEquipment();`
- `const equipment = propEquipment ?? equipmentContext?.equipment ?? [];`
- `const addEquipment = propAddEquipment ?? equipmentContext?.addEquipment;`
- Remove `locallyAddedGrinders` state only if `propEquipment` is not overriding context, or keep it purely for when static `propEquipment` array is passed in isolated prop tests (`equipment={[...]}`):
  Wait—let's check `RecipeBuilderModal.test.tsx` line 669:
  `it('calls onAddEquipment prop when creating inline grinder', ...)` passes `equipment={[]}` and `onAddEquipment={mockOnAddEquipment}` as static props and asserts that `grinder 1` combobox appears with value `'new-k6'`. And line 235 mocks `useEquipment` returning `equipment: []` and `addEquipment: mockAddEquipment` (where the mock doesn't mutate `equipment: []`).
  Because unit tests in `RecipeBuilderModal.test.tsx` pass static `equipment: []` mocks where `mockAddEquipment` resolves a new grinder without mutating the mocked `equipment` array, keeping `locallyAddedGrinders` deduplicated against `equipment` (`...locallyAddedGrinders.filter((lg) => !equipment.some((e) => e.id === lg.id))`) ensures both real `EquipmentContext` state updates (where `equipment` already contains the new grinder, so the filter is a no-op) and static unit test mocks work seamlessly!

---

### Task 6: Update Route & Component Tests for New Context Providers

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/routes/TimerRoute.test.tsx`
- Modify: `apps/web/src/routes/RecipeDetailRoute.test.tsx`
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.test.tsx`
- Modify: `apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`

**Interfaces:**
- Consumes: `AppProviders`, `RecipeContext`, `BeansContext`, `EquipmentContext`, `ReviewsContext`.
- Produces: Updated unit and integration test suites with zero references to `useRootOutletContext` or removed `use*.ts` paths.

- [ ] **Step 1: Update `App.test.tsx` to use `<AppProviders>` and `useRecipes()` instead of `useRootOutletContext()`**

In `apps/web/src/App.test.tsx`:
- Import `App, AppProviders` from `./App` and `useRecipes, WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY` from `./features/recipes/RecipeContext`.
- Wrap `TestApp` routes in `<AppProviders>`.
- In the test `'falls back to default preset and updates localStorage when active recipe is deleted'`, replace `useRootOutletContext()` in `TestDeleteConsumer` with `const { selectedRecipe, deleteRecipe } = useRecipes();` and wrap the `<MemoryRouter>` in `<AppProviders>`.

- [ ] **Step 2: Update `TimerRoute.test.tsx` and `RecipeDetailRoute.test.tsx` to use Context Providers**

In `apps/web/src/routes/TimerRoute.test.tsx`:
- Wrap `<MemoryRouter>` in `<AppProviders>` (or mock `useRecipes`, `useBeans`, `useReviews` from their `*Context` modules) and verify that saving a recipe from Free Brew mode calls `addRecipe` and navigates to `/recipes`.

In `apps/web/src/routes/RecipeDetailRoute.test.tsx`:
- Update `vi.mock('../features/equipment/useEquipment', ...)` to `vi.mock('../features/equipment/EquipmentContext', ...)`.
- Provide `RecipeContext.Provider` (or mock `useRecipes` from `../features/recipes/RecipeContext`) alongside `<Outlet context={mockContext} />` for `onEditRecipe`.

- [ ] **Step 3: Update `RecipeDetailPane.test.tsx` and `RecipeBuilderModal.test.tsx` imports**

In `apps/web/src/features/recipes/RecipeDetailPane.test.tsx` and `apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`:
- Update `import { useEquipment } from '../equipment/useEquipment'` and `vi.mock('../equipment/useEquipment', ...)` to `../equipment/EquipmentContext` (including `useOptionalEquipment: () => useEquipment()`).

- [ ] **Step 4: Run targeted tests and full verification when ready**

Run the test suite to verify all tests pass and check `git status` to ensure no untracked/leftover files remain.
