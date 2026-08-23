import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

export * from "./types";

export function createBrewlogClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  storage?: any
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}
