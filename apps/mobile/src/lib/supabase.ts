import { createBrewlogClient, SupabaseClient, Database } from "@brewlog/supabase";
import { LargeSecureStore } from "./secureStore";

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  !envUrl.includes("your-project") &&
  !envUrl.includes("example")
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createBrewlogClient(envUrl, envKey, {
      storage: new LargeSecureStore(),
      detectSessionInUrl: false,
    })
  : null;
