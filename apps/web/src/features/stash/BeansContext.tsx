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
import { captureSyncError } from "../../lib/sentry";

const STORAGE_KEY = "brewlog_beans_cache";

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
    () => beans[0] ?? null
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
              captureSyncError("beans", "insert", insertErr, item.id);
            } else {
              syncedIds.add(item.id);
            }
          } catch (syncErr) {
            console.error("Failed to sync bean:", item, syncErr);
            captureSyncError("beans", "insert", syncErr, item.id);
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
        captureSyncError("beans", "fetch", error);
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
      captureSyncError("beans", "fetch", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBeans();
  }, [fetchBeans]);

  const addBean = useCallback(
    async (newBean: Omit<Bean, "id" | "createdAt">): Promise<Bean> => {
      const localId = `local-bean-${generateUUID()}`;
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
          captureSyncError("beans", "insert", error, fallbackBean.id);
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
        captureSyncError("beans", "insert", err, fallbackBean.id);
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
          captureSyncError("beans", "update", error, updatedBean.id);
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
        captureSyncError("beans", "update", err, updatedBean.id);
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
            captureSyncError("beans", "delete", error, id);
          }
        } catch (err) {
          console.error("deleteBean exception:", err);
          captureSyncError("beans", "delete", err, id);
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

export const useBeans = (): BeansContextValue => {
  const context = useContext(BeansContext);
  if (!context) {
    throw new Error("useBeans must be used within a BeansProvider");
  }
  return context;
};
