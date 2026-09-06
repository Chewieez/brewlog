import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

export * from "./database.types";
export * from "./mappers";

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
