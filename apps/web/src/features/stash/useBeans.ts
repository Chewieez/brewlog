import { useState, useEffect, useCallback } from "react";
import { Bean } from "@brewlog/core";
import {
  mapBeanRowToDomain,
  mapBeanDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_BEANS } from "../../lib/sampleData";

const STORAGE_KEY = "brewlog_beans_cache";

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

export const useBeans = () => {
  const { user } = useAuth();
  const [beans, setBeans] = useState<Bean[]>(loadLocalBeans);
  const [loading, setLoading] = useState(false);

  const fetchBeans = useCallback(async () => {
    if (!supabase || !user) {
      const local = loadLocalBeans();
      setBeans(local);
      return;
    }

    setLoading(true);
    try {
      // 1. Sync offline items (created with local-bean- prefix)
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

      // 2. Fetch all user beans from Supabase
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

  const addBean = async (newBean: Omit<Bean, "id" | "createdAt">): Promise<Bean> => {
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
  };

  const updateBean = async (updatedBean: Bean): Promise<Bean> => {
    const existing = beans.find((b) => b.id === updatedBean.id);

    setBeans((prev) => {
      const updated = prev.map((b) => (b.id === updatedBean.id ? updatedBean : b));
      saveLocalBeans(updated);
      return updated;
    });

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
      }
      throw err;
    }

    return updatedBean;
  };

  const deleteBean = async (id: string): Promise<void> => {
    setBeans((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      saveLocalBeans(updated);
      return updated;
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
  };

  return {
    beans,
    addBean,
    updateBean,
    deleteBean,
    loading,
    refreshBeans: fetchBeans,
  };
};
