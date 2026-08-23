/// <reference types="vite/client" />
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@brewlog/supabase";

const envUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem("brewlog_supabase_url") || "";
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("brewlog_supabase_anon_key") || "";

export const isSupabaseConfigured = Boolean(envUrl && envKey && !envUrl.includes("your-project"));

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(envUrl, envKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
