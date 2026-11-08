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

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
      // Guest or offline mode: load from localStorage
      const local = loadLocalEquipment();
      setEquipment(local);
      return;
    }

    setLoading(true);
    try {
      // 1. Check for unsynced offline items (created with local-eq- prefix)
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

      // 2. Fetch all user equipment from Supabase
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
      const localId = `local-eq-${generateUUID()}`;
      const fallbackItem: Equipment = {
        ...newEquipment,
        id: localId,
        createdAt: new Date().toISOString(),
      };

      if (!supabase || !user) {
        // Offline / guest mode: persist locally
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
          // Retain optimistic local item so user sees their gear immediately
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
    async (
      id: string,
      updates: Partial<Equipment>
    ): Promise<Equipment> => {
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

export const useEquipment = (): EquipmentContextValue => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error("useEquipment must be used within an EquipmentProvider");
  }
  return context;
};
