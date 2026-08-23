import { useState, useEffect } from "react";
import { Bean } from "@brewlog/core";
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
        const mapped: Bean[] = (data as any[]).map((b) => ({
          id: b.id,
          userId: b.user_id,
          roaster: b.roaster,
          name: b.name,
          originCountry: b.origin_country,
          region: b.region || undefined,
          farm: b.farm || undefined,
          variety: b.variety || [],
          altitudeMeters: b.altitude_meters || undefined,
          process: b.process as any,
          roastLevel: b.roast_level as any,
          roastDate: b.roast_date,
          flavorNotes: b.flavor_notes || [],
          rating: b.rating ? Number(b.rating) : undefined,
          bagWeightGrams: b.bag_weight_grams ? Number(b.bag_weight_grams) : undefined,
          bagWeightOz: b.bag_weight_grams ? Number((b.bag_weight_grams / 28.3495).toFixed(1)) : undefined,
          remainingGrams: b.remaining_grams ? Number(b.remaining_grams) : undefined,
          price: b.price ? Number(b.price) : undefined,
          isFavorite: b.is_favorite,
          notes: b.notes || undefined,
          createdAt: b.created_at,
        }));
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
      const payload = {
        user_id: user.id,
        roaster: newBean.roaster,
        name: newBean.name,
        origin_country: newBean.originCountry || null,
        region: newBean.region || null,
        farm: newBean.farm || null,
        variety: newBean.variety || [],
        altitude_meters: newBean.altitudeMeters || null,
        process: newBean.process || null,
        roast_level: newBean.roastLevel || null,
        roast_date: newBean.roastDate || null,
        flavor_notes: newBean.flavorNotes || [],
        bag_weight_grams: newBean.bagWeightGrams || 340,
        remaining_grams: newBean.remainingGrams || newBean.bagWeightGrams || 340,
        price: newBean.price || null,
        is_favorite: newBean.isFavorite || false,
        notes: newBean.notes || null,
      };

      console.log("Saving bean payload to Supabase:", payload);

      const { data, error } = await supabase
        .from("beans")
        .insert(payload as any)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        // Still add to local UI so user sees their bean!
        setBeans((prev) => [fallbackBean, ...prev]);
        return fallbackBean;
      }

      if (data) {
        const b = data as any;
        const created: Bean = {
          id: b.id,
          userId: b.user_id,
          roaster: b.roaster,
          name: b.name,
          originCountry: b.origin_country,
          region: b.region || undefined,
          farm: b.farm || undefined,
          variety: b.variety || [],
          altitudeMeters: b.altitude_meters || undefined,
          process: b.process as any,
          roastLevel: b.roast_level as any,
          roastDate: b.roast_date,
          flavorNotes: b.flavor_notes || [],
          rating: b.rating ? Number(b.rating) : undefined,
          bagWeightGrams: b.bag_weight_grams ? Number(b.bag_weight_grams) : undefined,
          bagWeightOz: b.bag_weight_grams ? Number((b.bag_weight_grams / 28.3495).toFixed(1)) : undefined,
          remainingGrams: b.remaining_grams ? Number(b.remaining_grams) : undefined,
          price: b.price ? Number(b.price) : undefined,
          isFavorite: b.is_favorite,
          notes: b.notes || undefined,
          createdAt: b.created_at,
        };
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
