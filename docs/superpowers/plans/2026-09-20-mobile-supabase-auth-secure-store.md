# Phase 3C Mobile Supabase Auth & Secure Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement encrypted multiplatform session persistence (`LargeSecureStore`), mobile auth state management (`AuthContext`), an Industrial Precision bottom sheet authentication modal (`AuthSheet`), and tab header profile actions (`ProfileHeaderButton`) in `@brewlog/mobile`.

**Architecture:** Implements [ADR 003](file:///Users/greglawrence/Projects/brewlog/docs/adr/003-supabase-typescript-multiplatform-best-practices.md) by storing a 256-bit AES encryption key in `expo-secure-store` (hardware Keychain/KeyStore) and the encrypted session payload in `@react-native-async-storage/async-storage`. A dedicated mobile `AuthContext` provides reactive session state, app-state auto-refresh cycling, and error sanitization. An in-place slide-up `AuthSheet` modal provides Sign In, Sign Up, Forgot Password, and Profile status without unmounting active tabs or disrupting brew timers.

**Tech Stack:** React Native 0.86, Expo SDK 57, Expo Router, `@brewlog/supabase`, `@supabase/supabase-js`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `aes-js`, `react-native-get-random-values`, `expo-haptics`, `lucide-react-native`, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-20-mobile-supabase-auth-secure-store-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-20-mobile-supabase-auth-secure-store-design.md)

## Global Constraints

- **Theme Compliance**: Strict adherence to `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core`. Zero hardcoded raw hex colors in components.
- **Typography Standards**: Tabular numerals and monospaced badges in `JetBrains Mono` (`JetBrainsMono_400Regular`, `JetBrainsMono_700Bold`); titles and headings in `Outfit` (`Outfit_700Bold`).
- **Apple HIG & Android Touch Targets**: Minimum 44×44pt touch targets on header actions and interactive controls.
- **Security Constraints**:
  - `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` for all SecureStore operations.
  - Fresh CSPRNG 256-bit AES key per session write.
  - Zero password or JWT token logging in console outputs.
  - `secureTextEntry={true}`, `autoCapitalize="none"`, `autoCorrect={false}`, `spellCheck={false}` on password fields.
- **Format Integrity**: Every modified or created file must end with exactly one trailing newline.
- **Multiplatform Monorepo Invariant**: Zero regressions on Web, Core, or existing Mobile timer suites. All tests must pass cleanly.

---

### Task 1: Extend `@brewlog/supabase` Client Factory with Options

**Files:**
- Modify: `packages/supabase/src/index.ts`
- Create: `packages/supabase/src/index.test.ts`

**Interfaces:**
- Produces: `BrewlogClientOptions`, `createBrewlogClient(supabaseUrl: string, supabaseAnonKey: string, options?: BrewlogClientOptions): SupabaseClient<Database>`

- [ ] **Step 1: Write the failing test**

Create `packages/supabase/src/index.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { createBrewlogClient } from "./index";

describe("createBrewlogClient", () => {
  it("initializes supabase client with custom storage and detectSessionInUrl option", () => {
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const client = createBrewlogClient("https://example.supabase.co", "test-anon-key", {
      storage: mockStorage,
      detectSessionInUrl: false,
    });

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/supabase/src/index.test.ts`
Expected: FAIL (or type error with `options` object argument).

- [ ] **Step 3: Write minimal implementation**

Update `packages/supabase/src/index.ts`:
```typescript
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
  const detectSessionInUrl = isOptionsObject && typeof optionsOrStorage.detectSessionInUrl === "boolean"
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/supabase/src/index.test.ts`
Expected: PASS

- [ ] **Step 5: Run all package tests to ensure backward compatibility**

Run: `npm test -w @brewlog/supabase`
Expected: PASS (all tests pass)

- [ ] **Step 6: Commit**

```bash
git add packages/supabase/src/index.ts packages/supabase/src/index.test.ts
git commit -m "feat(supabase): add BrewlogClientOptions supporting custom storage and url detection override"
```

---

### Task 2: Mobile Dependencies & Secure Storage Hardware Configuration

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

**Interfaces:**
- Consumes: `@brewlog/supabase`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `aes-js`, `react-native-get-random-values`
- Produces: Installed runtime packages, `app.json` export compliance config

- [ ] **Step 1: Update `apps/mobile/package.json`**

Add workspace and native storage dependencies to `apps/mobile/package.json`:
```json
"dependencies": {
  "@brewlog/core": "*",
  "@brewlog/supabase": "*",
  "@expo-google-fonts/jetbrains-mono": "^0.4.1",
  "@expo-google-fonts/outfit": "^0.4.3",
  "@react-native-async-storage/async-storage": "2.2.0",
  "aes-js": "^3.1.2",
  "expo": "~57.0.24",
  "expo-audio": "~57.0.5",
  "expo-constants": "~57.0.19",
  "expo-font": "~57.0.4",
  "expo-haptics": "~57.0.3",
  "expo-router": "~57.0.22",
  "expo-secure-store": "~57.0.4",
  "expo-splash-screen": "~57.0.9",
  "expo-status-bar": "~57.0.1",
  "lucide-react-native": "^1.47.0",
  "react": "19.2.8",
  "react-native": "0.86.3",
  "react-native-get-random-values": "~1.11.0",
  "react-native-safe-area-context": "5.7.0",
  "react-native-screens": "4.26.2",
  "react-native-svg": "15.15.4"
},
"devDependencies": {
  "@types/aes-js": "^3.1.4",
  "@types/react": "~19.2.4",
  "@types/react-native": "^0.72.8",
  "typescript": "~6.0.3",
  "vitest": "^4.1.11"
}
```

- [ ] **Step 2: Update `apps/mobile/app.json`**

Configure `usesNonExemptEncryption` and `expo-secure-store` plugin in `apps/mobile/app.json`:
```json
{
  "expo": {
    "name": "BrewLog",
    "slug": "brewlog",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "brewlog",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.brewlog.app",
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#09090b"
      },
      "package": "com.brewlog.app"
    },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-secure-store"
    ]
  }
}
```

- [ ] **Step 3: Install dependencies via npm**

Run: `npm install`
Expected: Installs packages cleanly with no peer dependency resolution failures.

- [ ] **Step 4: Run typecheck to verify package imports**

Run: `npm run typecheck -w @brewlog/mobile`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json package-lock.json
git commit -m "chore(mobile): add secure-store, async-storage, aes-js, and app.json security config"
```

---

### Task 3: Implement `LargeSecureStore` AES-256 Storage Adapter & Supabase Singleton

**Files:**
- Create: `apps/mobile/src/lib/secureStore.ts`
- Create: `apps/mobile/src/lib/secureStore.test.ts`
- Create: `apps/mobile/src/lib/supabase.ts`

**Interfaces:**
- Consumes: `expo-secure-store`, `@react-native-async-storage/async-storage`, `aes-js`, `createBrewlogClient`
- Produces: `LargeSecureStore`, `isSupabaseConfigured: boolean`, `supabase: SupabaseClient<Database> | null`

- [ ] **Step 1: Write the failing test for `LargeSecureStore`**

Create `apps/mobile/src/lib/secureStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LargeSecureStore, SecureStoreDriver, AsyncStorageDriver } from "./secureStore";

describe("LargeSecureStore", () => {
  let mockSecureMap: Record<string, string>;
  let mockAsyncMap: Record<string, string>;
  let mockSecureStore: SecureStoreDriver;
  let mockAsyncStorage: AsyncStorageDriver;
  let store: LargeSecureStore;

  beforeEach(() => {
    mockSecureMap = {};
    mockAsyncMap = {};

    mockSecureStore = {
      getItemAsync: vi.fn(async (key: string) => mockSecureMap[key] ?? null),
      setItemAsync: vi.fn(async (key: string, value: string) => {
        mockSecureMap[key] = value;
      }),
      deleteItemAsync: vi.fn(async (key: string) => {
        delete mockSecureMap[key];
      }),
    };

    mockAsyncStorage = {
      getItem: vi.fn(async (key: string) => mockAsyncMap[key] ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        mockAsyncMap[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete mockAsyncMap[key];
      }),
    };

    store = new LargeSecureStore(mockSecureStore, mockAsyncStorage);
  });

  it("encrypts and decrypts string payloads across SecureStore and AsyncStorage", async () => {
    const testKey = "sb-auth-token";
    const testPayload = JSON.stringify({
      access_token: "jwt-test-token-value",
      refresh_token: "refresh-test-token-value",
      user: { id: "usr-123", email: "barista@brewlog.dev" },
    });

    await store.setItem(testKey, testPayload);

    // Key in SecureStore must be a 256-bit (64 hex characters) AES key
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      testKey,
      expect.stringMatching(/^[0-9a-f]{64}$/i),
      expect.objectContaining({ keychainAccessible: 0 })
    );

    // Encrypted payload in AsyncStorage must differ from plaintext
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      testKey,
      expect.not.stringContaining("jwt-test-token-value")
    );

    // Decrypt and verify exact match
    const decrypted = await store.getItem(testKey);
    expect(decrypted).toBe(testPayload);
  });

  it("returns null if AsyncStorage or SecureStore key is missing", async () => {
    const result1 = await store.getItem("non-existent");
    expect(result1).toBeNull();

    // Partial presence: only in AsyncStorage
    mockAsyncMap["orphan"] = "some-encrypted-hex";
    const result2 = await store.getItem("orphan");
    expect(result2).toBeNull();
  });

  it("removes records from both SecureStore and AsyncStorage", async () => {
    await store.setItem("key-to-delete", "secret");
    await store.removeItem("key-to-delete");

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "key-to-delete",
      expect.anything()
    );
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("key-to-delete");
    expect(await store.getItem("key-to-delete")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/lib/secureStore.test.ts`
Expected: FAIL ("Cannot find module ./secureStore").

- [ ] **Step 3: Write implementation of `LargeSecureStore`**

Create `apps/mobile/src/lib/secureStore.ts`:
```typescript
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import "react-native-get-random-values";

export interface SecureStoreDriver {
  getItemAsync(key: string, options?: any): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: any): Promise<void>;
  deleteItemAsync(key: string, options?: any): Promise<void>;
}

export interface AsyncStorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const SECURE_STORE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class LargeSecureStore {
  private secureStore: SecureStoreDriver;
  private asyncStorage: AsyncStorageDriver;

  constructor(
    secureStore: SecureStoreDriver = SecureStore,
    asyncStorage: AsyncStorageDriver = AsyncStorage
  ) {
    this.secureStore = secureStore;
    this.asyncStorage = asyncStorage;
  }

  private async _encrypt(key: string, value: string): Promise<string> {
    const rawKey = new Uint8Array(256 / 8);
    crypto.getRandomValues(rawKey);

    const cipher = new aesjs.ModeOfOperation.ctr(rawKey, new aesjs.Counter(1));
    const textBytes = aesjs.utils.utf8.toBytes(value);
    const encryptedBytes = cipher.encrypt(textBytes);

    await this.secureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(rawKey),
      SECURE_STORE_OPTIONS
    );

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, encryptedHex: string): Promise<string | null> {
    const keyHex = await this.secureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    if (!keyHex) {
      return null;
    }

    try {
      const rawKey = aesjs.utils.hex.toBytes(keyHex);
      const cipher = new aesjs.ModeOfOperation.ctr(rawKey, new aesjs.Counter(1));
      const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
      const decryptedBytes = cipher.decrypt(encryptedBytes);
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch {
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = await this.asyncStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      return await this._decrypt(key, encrypted);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptedHex = await this._encrypt(key, value);
    await this.asyncStorage.setItem(key, encryptedHex);
  }

  async removeItem(key: string): Promise<void> {
    await Promise.allSettled([
      this.asyncStorage.removeItem(key),
      this.secureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
    ]);
  }
}
```

- [ ] **Step 4: Create Supabase Client Singleton in `apps/mobile/src/lib/supabase.ts`**

Create `apps/mobile/src/lib/supabase.ts`:
```typescript
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
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run apps/mobile/src/lib/secureStore.test.ts`
Expected: PASS
Run: `npm run typecheck -w @brewlog/mobile`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/secureStore.ts apps/mobile/src/lib/secureStore.test.ts apps/mobile/src/lib/supabase.ts
git commit -m "feat(mobile): implement LargeSecureStore AES-256 storage adapter and mobile supabase client"
```

---

### Task 4: Implement Mobile Auth State Management (`AuthContext` & `useAuth`)

**Files:**
- Create: `apps/mobile/src/features/auth/AuthContext.tsx`
- Create: `apps/mobile/src/features/auth/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `supabase`, `isSupabaseConfigured`, `User`, `Session`
- Produces: `MobileAuthContextType`, `AuthProvider`, `useAuth()`

- [ ] **Step 1: Write the failing test for `AuthContext`**

Create `apps/mobile/src/features/auth/AuthContext.test.tsx`:
```typescript
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { User, Session } from "@supabase/supabase-js";

// Mock supabase client
vi.mock("../../lib/supabase", () => {
  const mockUser: User = {
    id: "usr-123",
    email: "barista@brewlog.dev",
    user_metadata: { display_name: "Greg" },
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-09-20T00:00:00.000Z",
  };

  const mockSession: Session = {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: mockUser,
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: mockSession }, error: null })),
        onAuthStateChange: vi.fn((_callback) => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithPassword: vi.fn(async ({ email, password }) => {
          if (password === "wrong") {
            return { data: { user: null, session: null }, error: new Error("Invalid login credentials") };
          }
          return { data: { user: mockUser, session: mockSession }, error: null };
        }),
        signUp: vi.fn(async () => ({
          data: { user: mockUser, session: mockSession },
          error: null,
        })),
        resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
        signOut: vi.fn(async () => ({ error: null })),
        startAutoRefresh: vi.fn(),
        stopAutoRefresh: vi.fn(),
      },
    },
  };
});

describe("AuthContext", () => {
  it("throws an error when useAuth is used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });

  it("hydrates user and session on mount", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user?.email).toBe("barista@brewlog.dev");
    expect(result.current.session?.access_token).toBe("mock-access-token");
    expect(result.current.isConfigured).toBe(true);
  });

  it("handles sign in failure with sanitized error message", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signInWithEmail("test@test.com", "wrong");
    });

    expect(response?.error?.message).toBe("Invalid email or password.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/auth/AuthContext.test.tsx`
Expected: FAIL ("Cannot find module ./AuthContext").

- [ ] **Step 3: Implement `AuthContext.tsx`**

Create `apps/mobile/src/features/auth/AuthContext.tsx`:
```typescript
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export interface MobileAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<MobileAuthContextType | undefined>(undefined);

function sanitizeAuthError(error: Error | null): Error | null {
  if (!error) return null;
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
    return new Error("Invalid email or password.");
  }
  if (msg.includes("user already registered") || msg.includes("user_already_exists")) {
    return new Error("An account with this email already exists.");
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return new Error("Unable to reach BrewLog cloud. Please check your internet connection.");
  }
  return error;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Hydrate existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Real-time auth subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // AppState auto-refresh handler
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        supabase?.auth.startAutoRefresh();
      } else {
        supabase?.auth.stopAutoRefresh();
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured yet in .env.") };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    return { error: sanitizeAuthError(error) };
  };

  const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured yet in .env.") };
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          display_name: displayName?.trim() || email.split("@")[0],
        },
      },
    });
    return { error: sanitizeAuthError(error) };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured yet in .env.") };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: sanitizeAuthError(error) };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        resetPasswordForEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run apps/mobile/src/features/auth/AuthContext.test.tsx`
Expected: PASS
Run: `npm run typecheck -w @brewlog/mobile`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/auth/AuthContext.tsx apps/mobile/src/features/auth/AuthContext.test.tsx
git commit -m "feat(mobile): implement mobile AuthContext and useAuth hook"
```

---

### Task 5: Implement `ProfileHeaderButton` Component

**Files:**
- Create: `apps/mobile/src/features/auth/ProfileHeaderButton.tsx`
- Create: `apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `INDUSTRIAL_PRECISION_THEME`
- Produces: `ProfileHeaderButtonProps`, `ProfileHeaderButton`

- [ ] **Step 1: Write the failing test for `ProfileHeaderButton`**

Create `apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx`:
```typescript
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ProfileHeaderButton } from "./ProfileHeaderButton";
import * as AuthContextModule from "./AuthContext";

describe("ProfileHeaderButton", () => {
  it("renders logged-out icon when user is not signed in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const onPressMock = vi.fn();
    const { getByLabelText } = render(<ProfileHeaderButton onPress={onPressMock} />);

    const button = getByLabelText("Account profile");
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders user initials and active connection dot when logged in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "123",
        email: "greg@example.com",
        user_metadata: { display_name: "Greg Lawrence" },
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const { getByText, getByTestId } = render(<ProfileHeaderButton onPress={vi.fn()} />);

    expect(getByText("GL")).toBeDefined();
    expect(getByTestId("connection-dot")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx`
Expected: FAIL ("Cannot find module ./ProfileHeaderButton").

- [ ] **Step 3: Implement `ProfileHeaderButton.tsx`**

Create `apps/mobile/src/features/auth/ProfileHeaderButton.tsx`:
```typescript
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { User as UserIcon } from "lucide-react-native";
import { INDUSTRIAL_PRECISION_THEME } from "@brewlog/core";
import { FONTS } from "../../theme/fonts";
import { useAuth } from "./AuthContext";

export interface ProfileHeaderButtonProps {
  onPress: () => void;
}

function getInitials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (nameOrEmail.substring(0, 2)).toUpperCase();
}

export const ProfileHeaderButton: React.FC<ProfileHeaderButtonProps> = ({ onPress }) => {
  const { colors } = INDUSTRIAL_PRECISION_THEME;
  const { user } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email;
  const initials = displayName ? getInitials(displayName) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Account profile"
      activeOpacity={0.7}
      style={styles.container}
    >
      {initials ? (
        <View
          style={[
            styles.avatarBadge,
            {
              backgroundColor: colors.panelRecessed,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.initialsText, { color: colors.textPrimary }]}>
            {initials}
          </Text>
          <View
            testID="connection-dot"
            style={[
              styles.connectionDot,
              {
                backgroundColor: colors.statusSuccess,
                borderColor: colors.panel,
              },
            ]}
          />
        </View>
      ) : (
        <View style={styles.iconWrapper}>
          <UserIcon size={20} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  initialsText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    fontWeight: "700",
  },
  connectionDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx`
Expected: PASS
Run: `npm run typecheck -w @brewlog/mobile`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/auth/ProfileHeaderButton.tsx apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx
git commit -m "feat(mobile): implement ProfileHeaderButton component"
```

---

### Task 6: Implement `AuthSheet` Bottom Sheet Component

**Files:**
- Create: `apps/mobile/src/features/auth/AuthSheet.tsx`
- Create: `apps/mobile/src/features/auth/AuthSheet.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `INDUSTRIAL_PRECISION_THEME`, `expo-haptics`
- Produces: `AuthSheetProps`, `AuthSheet`

- [ ] **Step 1: Write the failing test for `AuthSheet`**

Create `apps/mobile/src/features/auth/AuthSheet.test.tsx`:
```typescript
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { AuthSheet } from "./AuthSheet";
import * as AuthContextModule from "./AuthContext";

describe("AuthSheet", () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Sign In form by default when user is logged out", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: vi.fn(),
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    expect(getByText("SIGN IN")).toBeDefined();
    expect(getByPlaceholderText("you@example.com")).toBeDefined();
    expect(getByPlaceholderText("••••••••")).toBeDefined();
  });

  it("switches to Create Account mode and renders Barista Tag input", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: vi.fn(),
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.click(getByText("CREATE ACCOUNT"));
    expect(getByPlaceholderText("e.g. Greg")).toBeDefined();
  });

  it("renders profile summary and Sign Out action when logged in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-750e-42a3",
        email: "barista@brewlog.dev",
        user_metadata: { display_name: "Greg" },
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: vi.fn(),
      signOut: mockSignOut,
    });

    const { getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    expect(getByText("CLOUD CONNECTED")).toBeDefined();
    expect(getByText("Greg")).toBeDefined();
    expect(getByText("barista@brewlog.dev")).toBeDefined();
    expect(getByText("SIGN OUT")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/src/features/auth/AuthSheet.test.tsx`
Expected: FAIL ("Cannot find module ./AuthSheet").

- [ ] **Step 3: Implement `AuthSheet.tsx`**

Create `apps/mobile/src/features/auth/AuthSheet.tsx`:
```typescript
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Sparkles,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react-native";
import { INDUSTRIAL_PRECISION_THEME } from "@brewlog/core";
import { FONTS } from "../../theme/fonts";
import { useAuth } from "./AuthContext";

export interface AuthSheetProps {
  visible: boolean;
  onClose: () => void;
}

type AuthMode = "signin" | "signup" | "forgot";

export const AuthSheet: React.FC<AuthSheetProps> = ({ visible, onClose }) => {
  const { colors } = INDUSTRIAL_PRECISION_THEME;
  const {
    user,
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    signOut,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setSubmitting(false);
    }
  }, [visible, user]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    Haptics.selectionAsync().catch(() => {});
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    if (mode !== "forgot" && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMessage("Signed in successfully!");
          setTimeout(() => onClose(), 600);
        }
      } else if (mode === "signup") {
        const { error } = await signUpWithEmail(email, password, displayName);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMessage("Check your inbox for the confirmation link!");
        }
      } else if (mode === "forgot") {
        const { error } = await resetPasswordForEmail(email);
        if (error) {
          setErrorMessage(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setSuccessMessage("Password reset email sent!");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of BrewLog cloud?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={[
                styles.sheetContainer,
                { backgroundColor: colors.panel, borderColor: colors.borderSubtle },
              ]}
            >
              {/* Grabber Handle */}
              <View style={[styles.grabber, { backgroundColor: colors.borderSubtle }]} />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Sparkles size={18} color={colors.accent} />
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                      {user ? "BARISTA PROFILE" : mode === "forgot" ? "RESET PASSWORD" : "BREWLOG CLOUD"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Close sheet"
                  >
                    <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Logged In View */}
                {user ? (
                  <View style={styles.profileSection}>
                    <View
                      style={[
                        styles.statusCard,
                        { backgroundColor: colors.panelRecessed, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: colors.statusSuccess }]} />
                        <Text style={[styles.statusText, { color: colors.statusSuccess }]}>
                          CLOUD CONNECTED
                        </Text>
                      </View>
                      <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                        {user.user_metadata?.display_name || "Barista"}
                      </Text>
                      <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
                        {user.email}
                      </Text>
                      <Text style={[styles.profileId, { color: colors.textMuted }]}>
                        ID: {user.id.substring(0, 18)}...
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={handleSignOut}
                      activeOpacity={0.8}
                      style={[
                        styles.signOutButton,
                        { borderColor: colors.statusError + "66", backgroundColor: colors.statusError + "1a" },
                      ]}
                    >
                      <LogOut size={16} color={colors.statusError} />
                      <Text style={[styles.signOutText, { color: colors.statusError }]}>SIGN OUT</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Logged Out View */
                  <View style={styles.formSection}>
                    {/* Unconfigured Alert */}
                    {!isConfigured && (
                      <View
                        style={[
                          styles.alertBanner,
                          { backgroundColor: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.3)" },
                        ]}
                      >
                        <AlertCircle size={16} color={colors.accent} />
                        <Text style={[styles.alertText, { color: colors.accent }]}>
                          Supabase credentials not detected in .env. Running in offline mode.
                        </Text>
                      </View>
                    )}

                    {/* Mode Toggle */}
                    {mode !== "forgot" && (
                      <View
                        style={[
                          styles.modeToggleContainer,
                          { backgroundColor: colors.panelRecessed, borderColor: colors.borderSubtle },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => switchMode("signin")}
                          style={[
                            styles.toggleTab,
                            mode === "signin" && [styles.activeTab, { backgroundColor: colors.accent }],
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleTabText,
                              { color: mode === "signin" ? colors.canvas : colors.textMuted },
                            ]}
                          >
                            SIGN IN
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => switchMode("signup")}
                          style={[
                            styles.toggleTab,
                            mode === "signup" && [styles.activeTab, { backgroundColor: colors.accent }],
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleTabText,
                              { color: mode === "signup" ? colors.canvas : colors.textMuted },
                            ]}
                          >
                            CREATE ACCOUNT
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Error / Success Feedback */}
                    {errorMessage && (
                      <View style={[styles.errorBanner, { backgroundColor: colors.statusError + "1a", borderColor: colors.statusError + "4d" }]}>
                        <AlertCircle size={15} color={colors.statusError} />
                        <Text style={[styles.errorText, { color: colors.statusError }]}>{errorMessage}</Text>
                      </View>
                    )}

                    {successMessage && (
                      <View style={[styles.successBanner, { backgroundColor: colors.statusSuccess + "1a", borderColor: colors.statusSuccess + "4d" }]}>
                        <CheckCircle2 size={15} color={colors.statusSuccess} />
                        <Text style={[styles.successText, { color: colors.statusSuccess }]}>{successMessage}</Text>
                      </View>
                    )}

                    {/* Form Inputs */}
                    {mode === "signup" && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                          BARISTA TAG / NAME
                        </Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            { backgroundColor: colors.panelRecessed, borderColor: colors.borderSubtle },
                          ]}
                        >
                          <UserIcon size={16} color={colors.textMuted} />
                          <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="e.g. Greg"
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, { color: colors.textPrimary }]}
                            autoCapitalize="words"
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                        EMAIL ADDRESS
                      </Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          { backgroundColor: colors.panelRecessed, borderColor: colors.borderSubtle },
                        ]}
                      >
                        <Mail size={16} color={colors.textMuted} />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="you@example.com"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={[styles.input, { color: colors.textPrimary }]}
                        />
                      </View>
                    </View>

                    {mode !== "forgot" && (
                      <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                            PASSWORD
                          </Text>
                          {mode === "signin" && (
                            <TouchableOpacity onPress={() => switchMode("forgot")}>
                              <Text style={[styles.forgotLink, { color: colors.accent }]}>
                                Forgot password?
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View
                          style={[
                            styles.inputWrapper,
                            { backgroundColor: colors.panelRecessed, borderColor: colors.borderSubtle },
                          ]}
                        >
                          <Lock size={16} color={colors.textMuted} />
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry={true}
                            textContentType={mode === "signup" ? "newPassword" : "password"}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            style={[styles.input, { color: colors.textPrimary }]}
                          />
                        </View>
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={submitting}
                      activeOpacity={0.8}
                      style={[
                        styles.submitButton,
                        { backgroundColor: colors.accent, opacity: submitting ? 0.6 : 1 },
                      ]}
                    >
                      {submitting ? (
                        <ActivityIndicator color={colors.canvas} size="small" />
                      ) : (
                        <Text style={[styles.submitButtonText, { color: colors.canvas }]}>
                          {mode === "signin"
                            ? "SIGN IN"
                            : mode === "signup"
                            ? "CREATE ACCOUNT"
                            : "SEND RESET LINK"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {mode === "forgot" && (
                      <TouchableOpacity
                        onPress={() => switchMode("signin")}
                        style={styles.backButton}
                      >
                        <Text style={[styles.backButtonText, { color: colors.textMuted }]}>
                          ← Back to Sign In
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "90%",
    paddingBottom: 28,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  closeText: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
  profileSection: {
    gap: 16,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  profileName: {
    fontFamily: FONTS.sansBold,
    fontSize: 20,
  },
  profileEmail: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
  },
  profileId: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  signOutText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  formSection: {
    gap: 14,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  alertText: {
    flex: 1,
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
  },
  modeToggleContainer: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  toggleTabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    flex: 1,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  forgotLink: {
    fontFamily: FONTS.monoRegular,
    fontSize: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.monoRegular,
    fontSize: 13,
    height: "100%",
  },
  submitButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  submitButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  backButtonText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
  },
});
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run apps/mobile/src/features/auth/AuthSheet.test.tsx`
Expected: PASS
Run: `npm run typecheck -w @brewlog/mobile`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/auth/AuthSheet.tsx apps/mobile/src/features/auth/AuthSheet.test.tsx
git commit -m "feat(mobile): implement AuthSheet bottom sheet modal component"
```

---

### Task 7: Root Navigation & Tab Layout Integration

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.test.tsx`

**Interfaces:**
- Consumes: `AuthProvider`, `ProfileHeaderButton`, `AuthSheet`
- Produces: Integrated mobile app with reactive auth provider and header sheet launcher

- [ ] **Step 1: Write integration test for Tab Layout Header Profile Button**

Create `apps/mobile/app/(tabs)/_layout.test.tsx`:
```typescript
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import TabLayout from "./_layout";
import { AuthProvider } from "../../src/features/auth/AuthContext";

vi.mock("expo-router", () => {
  return {
    Tabs: Object.assign(
      ({ children, screenOptions }: any) => {
        const headerRight = screenOptions?.headerRight ? screenOptions.headerRight() : null;
        return (
          <div data-testid="tabs-mock">
            <div data-testid="header-right">{headerRight}</div>
            {children}
          </div>
        );
      },
      {
        Screen: ({ name }: any) => <div data-testid={`tab-screen-${name}`} />,
      }
    ),
  };
});

describe("TabLayout Integration", () => {
  it("mounts Tabs with ProfileHeaderButton in headerRight", () => {
    const { getByTestId, getByLabelText } = render(
      <AuthProvider>
        <TabLayout />
      </AuthProvider>
    );

    expect(getByTestId("tabs-mock")).toBeDefined();
    expect(getByLabelText("Account profile")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/mobile/app/(tabs)/_layout.test.tsx`
Expected: FAIL (ProfileHeaderButton not yet in `TabLayout`).

- [ ] **Step 3: Update `apps/mobile/app/_layout.tsx`**

Wrap `RootLayout` in `AuthProvider`:
```typescript
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { AuthProvider } from '../src/features/auth/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;

  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.canvas,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: Update `apps/mobile/app/(tabs)/_layout.tsx`**

Embed `ProfileHeaderButton` and `AuthSheet`:
```typescript
import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import {
  Timer,
  BookOpen,
  Coffee,
  Wrench,
  Award,
} from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { ProfileHeaderButton } from '../../src/features/auth/ProfileHeaderButton';
import { AuthSheet } from '../../src/features/auth/AuthSheet';

export default function TabLayout() {
  const { colors } = INDUSTRIAL_PRECISION_THEME;
  const [authSheetVisible, setAuthSheetVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.panel,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          headerRight: () => (
            <ProfileHeaderButton onPress={() => setAuthSheetVisible(true)} />
          ),
          tabBarStyle: {
            backgroundColor: colors.panel,
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Timer',
            tabBarIcon: ({ color, size }) => (
              <Timer size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarIcon: ({ color, size }) => (
              <BookOpen size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stash"
          options={{
            title: 'Stash',
            tabBarIcon: ({ color, size }) => (
              <Coffee size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="equipment"
          options={{
            title: 'Equipment',
            tabBarIcon: ({ color, size }) => (
              <Wrench size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cupping"
          options={{
            title: 'Cupping',
            tabBarIcon: ({ color, size }) => (
              <Award size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <AuthSheet
        visible={authSheetVisible}
        onClose={() => setAuthSheetVisible(false)}
      />
    </>
  );
}
```

- [ ] **Step 5: Run integration tests and typecheck**

Run: `npx vitest run apps/mobile/app/\(tabs\)/_layout.test.tsx`
Expected: PASS
Run: `npm run typecheck -w @brewlog/mobile`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/app/\(tabs\)/_layout.test.tsx
git commit -m "feat(mobile): integrate AuthProvider and header ProfileHeaderButton in TabLayout"
```

---

### Task 8: Cross-Platform Verification Gate & Metro Bundling

**Files:**
- None (verification run)

**Interfaces:**
- Consumes: All monorepo packages, Metro bundler, Expo CLI

- [ ] **Step 1: Monorepo Typecheck**

Run: `npm run typecheck` across all workspaces (`packages/core`, `packages/supabase`, `apps/web`, `apps/mobile`).
Expected: PASS with 0 errors across all 4 projects.

- [ ] **Step 2: Run all Monorepo Unit Tests**

Run: `npm test`
Expected: PASS (all tests across core, supabase, web, and mobile pass).

- [ ] **Step 3: Run Expo Doctor on Mobile Workspace**

Run: `npx expo-doctor` in `apps/mobile`
Expected: 0 errors / 0 warnings.

- [ ] **Step 4: Run Metro Production Bundle Exports**

Run:
```bash
cd apps/mobile && npx expo export --platform ios && npx expo export --platform android
```
Expected: Successfully exports production JavaScript bundles for both iOS and Android with 0 unresolved module or packaging errors.

---

### Task 9: Documentation & Roadmap Milestone Update

**Files:**
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-09-20-mobile-supabase-auth-secure-store.md`
- Modify: `README.md`

- [ ] **Step 1: Update `docs/ROADMAP.md`**

Mark Phase 3C as Complete (`[x] Phase 3C: Supabase Auth & Secure Storage (Complete ✅)`), documenting `LargeSecureStore`, `AuthSheet`, and `ProfileHeaderButton`.

- [ ] **Step 2: Create Devlog `docs/devlogs/2026-09-20-mobile-supabase-auth-secure-store.md`**

Detail the implementation of Phase 3C, architecture decisions, security hardening, test coverage, and bundling metrics.

- [ ] **Step 3: Update `README.md`**

Reflect Mobile Phase 3C status in features and roadmap summary.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md docs/devlogs/2026-09-20-mobile-supabase-auth-secure-store.md README.md
git commit -m "docs: document Phase 3C mobile Supabase auth and secure storage completion"
```
