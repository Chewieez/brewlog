import { createBrewlogClient, SupabaseClient, Database } from "@brewlog/supabase";

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  !envUrl.includes("your-project") &&
  !envUrl.includes("example")
);

function initSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { LargeSecureStore } = require("./secureStore");
  return createBrewlogClient(envUrl, envKey, {
    storage: new LargeSecureStore(),
    detectSessionInUrl: false,
  });
}

export const supabase: SupabaseClient<Database> | null = initSupabase();
