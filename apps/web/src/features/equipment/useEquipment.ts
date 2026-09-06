import { useState, useEffect, useCallback } from "react";
import { Equipment } from "@brewlog/core";
import {
  mapEquipmentRowToDomain,
  mapEquipmentDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_EQUIPMENT } from "../../lib/sampleData";

const STORAGE_KEY = "brewlog_equipment_cache";

const loadLocalEquipment = (): Equipment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load local equipment cache:", err);
  }
  return INITIAL_EQUIPMENT;
};

const saveLocalEquipment = (items: Equipment[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save local equipment cache:", err);
  }
};

export const useEquipment = () => {
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

      if (unsyncedItems.length > 0) {
        console.log(`Auto-syncing ${unsyncedItems.length} offline equipment item(s) to Supabase...`);
        for (const item of unsyncedItems) {
          try {
            const payload = mapEquipmentDomainToInsert(item, user.id);
            await supabase.from("equipment").insert(payload);
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
        setEquipment(mapped);
        saveLocalEquipment(mapped);
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

  const addEquipment = async (newEquipment: Omit<Equipment, "id" | "createdAt">): Promise<Equipment> => {
    const localId = `local-eq-${Date.now()}`;
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
  };

  const deleteEquipment = async (id: string): Promise<void> => {
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
  };

  return {
    equipment,
    addEquipment,
    deleteEquipment,
    loading,
    refreshEquipment: fetchEquipment,
  };
};

