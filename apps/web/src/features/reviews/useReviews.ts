import { useState, useEffect } from "react";
import { TastingLog } from "@brewlog/core";
import {
  mapTastingLogRowToDomain,
  mapTastingLogDomainToInsert,
} from "@brewlog/supabase";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { INITIAL_TASTING_LOGS } from "../../lib/sampleData";

export interface UseReviewsReturn {
  logs: TastingLog[];
  loading: boolean;
  addReview: (log: Omit<TastingLog, "id" | "createdAt">) => Promise<TastingLog | void>;
  updateReview: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteReview: (id: string) => Promise<void>;
  addTastingLog: (log: Omit<TastingLog, "id" | "createdAt">) => Promise<TastingLog | void>;
  updateTastingLog: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteTastingLog: (id: string) => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export const useReviews = (): UseReviewsReturn => {
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
      const mapped: TastingLog[] = data.map(mapTastingLogRowToDomain);
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
      setLogs((prev) => [localLog, ...prev]);
      return localLog;
    }

    const payload = mapTastingLogDomainToInsert(log, user.id);

    const { data, error } = await supabase
      .from("tasting_logs")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      const created: TastingLog = mapTastingLogRowToDomain(data);
      setLogs((prev) => [created, ...prev]);
      return created;
    }
  };

  const updateTastingLog = async (id: string, updates: Partial<TastingLog>) => {
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
      } else if (data) {
        const saved: TastingLog = mapTastingLogRowToDomain(data);
        setLogs((prev) => prev.map((l) => (l.id === id ? saved : l)));
        return saved;
      }
    } catch (err) {
      console.error("updateTastingLog exception:", err);
    }
    return updatedLog;
  };

  const deleteTastingLog = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));

    if (!supabase || !user || id.startsWith("local-log-")) {
      return;
    }

    try {
      const { error } = await supabase.from("tasting_logs").delete().eq("id", id);
      if (error) {
        console.error("deleteTastingLog error:", error);
      }
    } catch (err) {
      console.error("deleteTastingLog exception:", err);
    }
  };

  return {
    logs,
    loading,
    addReview: addTastingLog,
    addTastingLog,
    updateReview: updateTastingLog,
    updateTastingLog,
    deleteReview: deleteTastingLog,
    deleteTastingLog,
    refreshLogs: fetchLogs,
  };
};

export const useTastingLogs = useReviews;
