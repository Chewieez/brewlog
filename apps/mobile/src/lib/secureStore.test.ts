import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("react-native-get-random-values", () => ({}));

import { LargeSecureStore, SecureStoreDriver, AsyncStorageDriver } from "./secureStore";
import { isSupabaseConfigured, supabase } from "./supabase";

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

  it("instantiates with default drivers without throwing", () => {
    const defaultStore = new LargeSecureStore();
    expect(defaultStore).toBeInstanceOf(LargeSecureStore);
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

  it("returns null when decryption fails or payload is corrupt", async () => {
    mockAsyncMap["corrupt-payload"] = "not-valid-encrypted-data";
    mockSecureMap["corrupt-payload"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const result = await store.getItem("corrupt-payload");
    expect(result).toBeNull();
  });

  it("returns null gracefully if AsyncStorage driver throws on getItem", async () => {
    mockAsyncStorage.getItem = vi.fn().mockRejectedValue(new Error("Storage disk error"));
    const result = await store.getItem("disk-error-key");
    expect(result).toBeNull();
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

describe("supabase mobile singleton", () => {
  it("exports isSupabaseConfigured as a boolean and handles null or client properly", () => {
    expect(typeof isSupabaseConfigured).toBe("boolean");
    if (isSupabaseConfigured) {
      expect(supabase).not.toBeNull();
      expect(supabase?.auth).toBeDefined();
    } else {
      expect(supabase).toBeNull();
    }
  });
});
