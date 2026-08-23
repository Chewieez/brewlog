import { useState, useEffect } from "react";
import { TastingLog } from "@brewlog/core";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_TASTING_LOGS } from "../../lib/sampleData";

export const useTastingLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TastingLog[]>(INITIAL_TASTING_LOGS);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
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
      const mapped: TastingLog[] = (data as any[]).map((l) => ({
        id: l.id,
        userId: l.user_id,
        beanId: l.bean_id || "sample",
        recipeId: l.recipe_id || "sample",
        grinderId: l.grinder_id || undefined,
        brewerId: l.brewer_id || undefined,
        grinderSnapshot: l.grinder_snapshot || undefined,
        brewerSnapshot: l.brewer_snapshot || undefined,
        beanNameSnapshot: l.bean_name_snapshot,
        roasterSnapshot: l.roaster_snapshot,
        recipeNameSnapshot: l.recipe_name_snapshot,
        brewMethod: l.brew_method as any,
        brewDate: l.brew_date,
        coffeeDoseGrams: Number(l.coffee_dose_grams),
        waterAmountGrams: Number(l.water_amount_grams),
        actualTimeSeconds: l.actual_time_seconds,
        grindSetting: l.grind_setting,
        waterTempCelsius: l.water_temp_celsius,
        scores: {
          fragranceAroma: Number(l.fragrance_aroma),
          acidity: Number(l.acidity),
          sweetness: Number(l.sweetness),
          body: Number(l.body),
          clarity: Number(l.clarity),
          aftertaste: Number(l.aftertaste),
          balance: Number(l.balance),
          overall: Number(l.overall),
        },
        calculatedScaScore: Number(l.calculated_sca_score),
        rating: Number(l.rating),
        flavorTags: l.flavor_tags || [],
        notes: l.notes,
        wouldBrewAgain: l.would_brew_again,
        createdAt: l.created_at,
      }));
      setLogs(mapped);
    } else if (!error && data && data.length === 0) {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const addTastingLog = async (log: Omit<TastingLog, "id" | "createdAt">) => {
    if (!supabase || !user) {
      const localLog: TastingLog = {
        ...log,
        id: "local-log-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      setLogs([localLog, ...logs]);
      return localLog;
    }

    const { data, error } = await supabase
      .from("tasting_logs")
      .insert({
        user_id: user.id,
        bean_name_snapshot: log.beanNameSnapshot,
        roaster_snapshot: log.roasterSnapshot,
        recipe_name_snapshot: log.recipeNameSnapshot,
        brew_method: log.brewMethod,
        brew_date: log.brewDate,
        coffee_dose_grams: log.coffeeDoseGrams,
        water_amount_grams: log.waterAmountGrams,
        actual_time_seconds: log.actualTimeSeconds,
        grind_setting: log.grindSetting,
        water_temp_celsius: log.waterTempCelsius,
        fragrance_aroma: log.scores.fragranceAroma,
        acidity: log.scores.acidity,
        sweetness: log.scores.sweetness,
        body: log.scores.body,
        clarity: log.scores.clarity,
        aftertaste: log.scores.aftertaste,
        balance: log.scores.balance,
        overall: log.scores.overall,
        calculated_sca_score: log.calculatedScaScore,
        rating: log.rating,
        flavor_tags: log.flavorTags,
        notes: log.notes,
        would_brew_again: log.wouldBrewAgain,
      } as any)
      .select()
      .single();

    if (!error && data) {
      const l = data as any;
      const created: TastingLog = {
        id: l.id,
        userId: l.user_id,
        beanId: l.bean_id || "sample",
        recipeId: l.recipe_id || "sample",
        beanNameSnapshot: l.bean_name_snapshot,
        roasterSnapshot: l.roaster_snapshot,
        recipeNameSnapshot: l.recipe_name_snapshot,
        brewMethod: l.brew_method as any,
        brewDate: l.brew_date,
        coffeeDoseGrams: Number(l.coffee_dose_grams),
        waterAmountGrams: Number(l.water_amount_grams),
        actualTimeSeconds: l.actual_time_seconds,
        grindSetting: l.grind_setting,
        waterTempCelsius: l.water_temp_celsius,
        scores: {
          fragranceAroma: Number(l.fragrance_aroma),
          acidity: Number(l.acidity),
          sweetness: Number(l.sweetness),
          body: Number(l.body),
          clarity: Number(l.clarity),
          aftertaste: Number(l.aftertaste),
          balance: Number(l.balance),
          overall: Number(l.overall),
        },
        calculatedScaScore: Number(l.calculated_sca_score),
        rating: Number(l.rating),
        flavorTags: l.flavor_tags || [],
        notes: l.notes,
        wouldBrewAgain: l.would_brew_again,
        createdAt: l.created_at,
      };
      setLogs([created, ...logs]);
      return created;
    }
  };

  return { logs, addTastingLog, loading, refreshLogs: fetchLogs };
};
