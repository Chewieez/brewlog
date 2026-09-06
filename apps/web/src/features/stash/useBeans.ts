import { useState, useEffect } from "react";
import { Bean } from "@brewlog/core";
import {
  mapBeanRowToDomain,
  mapBeanDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_BEANS } from "../../lib/sampleData";

export const useBeans = () => {
  const { user } = useAuth();
  const [beans, setBeans] = useState<Bean[]>(INITIAL_BEANS);
  const [loading, setLoading] = useState(false);

  const fetchBeans = async () => {
    if (!supabase || !user) {
      setBeans(INITIAL_BEANS);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("beans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetchBeans error:", error);
      } else if (data) {
        const mapped: Bean[] = data.map(mapBeanRowToDomain);
        // If user has no beans yet, start empty so they can add their own
        setBeans(mapped);
      }
    } catch (err) {
      console.error("fetchBeans exception:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeans();
  }, [user]);

  const addBean = async (newBean: Omit<Bean, "id" | "createdAt">) => {
    // Optimistic / Local Fallback
    const localId = "bean-" + Date.now();
    const fallbackBean: Bean = {
      ...newBean,
      id: localId,
      createdAt: new Date().toISOString(),
    };

    if (!supabase || !user) {
      setBeans((prev) => [fallbackBean, ...prev]);
      return fallbackBean;
    }

    try {
      const payload = mapBeanDomainToInsert(newBean, user.id);

      console.log("Saving bean payload to Supabase:", payload);

      const { data, error } = await supabase
        .from("beans")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        // Still add to local UI so user sees their bean!
        setBeans((prev) => [fallbackBean, ...prev]);
        return fallbackBean;
      }

      if (data) {
        const created: Bean = mapBeanRowToDomain(data);
        setBeans((prev) => [created, ...prev.filter((item) => item.id !== localId)]);
        return created;
      }
    } catch (err) {
      console.error("addBean exception:", err);
      setBeans((prev) => [fallbackBean, ...prev]);
      return fallbackBean;
    }
  };

  return { beans, addBean, loading, refreshBeans: fetchBeans };
};
