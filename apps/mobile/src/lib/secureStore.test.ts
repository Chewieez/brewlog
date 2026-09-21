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

  it("reuses stable key in SecureStore and formats AsyncStorage payload with an IV delimiter", async () => {
    const key = "reused-key-record";
    await store.setItem(key, "payload-1");

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    // Payload should be formatted as <32-hex-iv>:<cipher-hex>
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      key,
      expect.stringMatching(/^[0-9a-f]{32}:[0-9a-f]+$/i)
    );

    // Second write to the same key should NOT rewrite SecureStore
    await store.setItem(key, "payload-2");
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);

    expect(await store.getItem(key)).toBe("payload-2");
  });

  it("decrypts legacy payloads stored without an IV delimiter using Counter(1)", async () => {
    // Generate key and legacy ciphertext using Counter(1)
    const rawKey = new Uint8Array(32);
    rawKey.fill(7);
    const rawKeyHex = Array.from(rawKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const aesjsModule = await import("aes-js");
    const cipher = new aesjsModule.ModeOfOperation.ctr(rawKey, new aesjsModule.Counter(1));
    const legacyEncrypted = cipher.encrypt(aesjsModule.utils.utf8.toBytes("legacy-session-data"));
    const legacyEncryptedHex = aesjsModule.utils.hex.fromBytes(legacyEncrypted);

    mockSecureMap["legacy-record"] = rawKeyHex;
    mockAsyncMap["legacy-record"] = legacyEncryptedHex; // No ':' separator

    const decrypted = await store.getItem("legacy-record");
    expect(decrypted).toBe("legacy-session-data");
  });

  it("preserves previous session decryptability if AsyncStorage.setItem fails during an update", async () => {
    const key = "session-update-guard";
    await store.setItem(key, "session-v1");

    expect(await store.getItem(key)).toBe("session-v1");
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);

    // Simulate disk failure on subsequent write
    mockAsyncStorage.setItem = vi.fn().mockRejectedValueOnce(new Error("Disk full"));

    await expect(store.setItem(key, "session-v2")).rejects.toThrow("Disk full");

    // SecureStore was NOT updated with a new key
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);

    // Previous session is still completely decryptable
    expect(await store.getItem(key)).toBe("session-v1");
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
