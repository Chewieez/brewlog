import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

export * from "./database.types";
export * from "./mappers";
export { SupabaseClient } from "@supabase/supabase-js";

export interface SupportedStorage {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

export interface BrewlogClientOptions {
  storage?: SupportedStorage;
  detectSessionInUrl?: boolean;
}

export function createBrewlogClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  optionsOrStorage?: BrewlogClientOptions | SupportedStorage
): SupabaseClient<Database> {
  const isDirectStorage =
    Boolean(
      optionsOrStorage &&
      typeof optionsOrStorage === "object" &&
      "getItem" in optionsOrStorage &&
      typeof optionsOrStorage.getItem === "function"
    );

  const storage = isDirectStorage
    ? (optionsOrStorage as SupportedStorage)
    : optionsOrStorage && typeof optionsOrStorage === "object" && "storage" in optionsOrStorage
      ? optionsOrStorage.storage
      : undefined;

  const detectSessionInUrl =
    !isDirectStorage &&
    optionsOrStorage &&
    typeof optionsOrStorage === "object" &&
    "detectSessionInUrl" in optionsOrStorage &&
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
