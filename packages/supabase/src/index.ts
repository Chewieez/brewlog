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
  const isDirectStorage =
    optionsOrStorage &&
    typeof optionsOrStorage === "object" &&
    typeof optionsOrStorage.getItem === "function";

  const storage = isDirectStorage
    ? optionsOrStorage
    : optionsOrStorage && typeof optionsOrStorage === "object"
      ? optionsOrStorage.storage ?? undefined
      : undefined;

  const detectSessionInUrl =
    !isDirectStorage &&
    optionsOrStorage &&
    typeof optionsOrStorage === "object" &&
    typeof optionsOrStorage.detectSessionInUrl === "boolean"
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
