import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

export * from "./database.types";
export * from "./mappers";

export interface BrewlogClientOptions {
  storage?: any;
  detectSessionInUrl?: boolean;
}

export function createBrewlogClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  optionsOrStorage?: BrewlogClientOptions | any
): SupabaseClient<Database> {
  const isOptionsObject =
    optionsOrStorage &&
    typeof optionsOrStorage === "object" &&
    ("storage" in optionsOrStorage || "detectSessionInUrl" in optionsOrStorage);

  const storage = isOptionsObject ? optionsOrStorage.storage : optionsOrStorage;
  const detectSessionInUrl =
    isOptionsObject && typeof optionsOrStorage.detectSessionInUrl === "boolean"
      ? optionsOrStorage.detectSessionInUrl
      : typeof window !== "undefined";

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: detectSessionInUrl,
    },
  });
}
