/// <reference types="vite/client" />
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@brewlog/supabase";

const envUrl = import.meta.env.VITE_SUPABASE_URL || "";
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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
