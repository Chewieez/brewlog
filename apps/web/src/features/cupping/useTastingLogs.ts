import { useState, useEffect } from "react";
import { TastingLog } from "@brewlog/core";
import {
  mapTastingLogRowToDomain,
  mapTastingLogDomainToInsert,
} from "@brewlog/supabase";
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
      setLogs([localLog, ...logs]);
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
      setLogs([created, ...logs]);
      return created;
    }
  };

  return { logs, addTastingLog, loading, refreshLogs: fetchLogs };
};
