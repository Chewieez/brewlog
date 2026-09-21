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

  private async _getOrCreateKey(key: string): Promise<Uint8Array> {
    const existingKeyHex = await this.secureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    if (existingKeyHex && existingKeyHex.length === 64) {
      return aesjs.utils.hex.toBytes(existingKeyHex);
    }

    const rawKey = new Uint8Array(256 / 8);
    crypto.getRandomValues(rawKey);

    await this.secureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(rawKey),
      SECURE_STORE_OPTIONS
    );

    return rawKey;
  }

  private _encrypt(rawKey: Uint8Array, value: string): string {
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);

    const cipher = new aesjs.ModeOfOperation.ctr(rawKey, new aesjs.Counter(iv));
    const textBytes = aesjs.utils.utf8.toBytes(value);
    const encryptedBytes = cipher.encrypt(textBytes);

    const ivHex = aesjs.utils.hex.fromBytes(iv);
    const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return `${ivHex}:${encryptedHex}`;
  }

  private async _decrypt(key: string, stored: string): Promise<string | null> {
    const keyHex = await this.secureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    if (!keyHex || keyHex.length !== 64) {
      return null;
    }

    try {
      const rawKey = aesjs.utils.hex.toBytes(keyHex);
      let ivBytes: Uint8Array;
      let cipherBytes: Uint8Array;

      if (stored.includes(":") && stored.indexOf(":") === 32) {
        const [ivHex, cipherHex] = stored.split(":");
        ivBytes = aesjs.utils.hex.toBytes(ivHex);
        cipherBytes = aesjs.utils.hex.toBytes(cipherHex);
      } else {
        // Backwards compatibility with legacy records encrypted with static Counter(1)
        const legacyCounter = new Uint8Array(16);
        legacyCounter[15] = 1;
        ivBytes = legacyCounter;
        cipherBytes = aesjs.utils.hex.toBytes(stored);
      }

      const cipher = new aesjs.ModeOfOperation.ctr(rawKey, new aesjs.Counter(ivBytes));
      const decryptedBytes = cipher.decrypt(cipherBytes);
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch {
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = await this.asyncStorage.getItem(key);
      if (encrypted === null) {
        return null;
      }
      return await this._decrypt(key, encrypted);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const rawKey = await this._getOrCreateKey(key);
    const payload = this._encrypt(rawKey, value);
    await this.asyncStorage.setItem(key, payload);
  }

  async removeItem(key: string): Promise<void> {
    await Promise.allSettled([
      this.asyncStorage.removeItem(key),
      this.secureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
    ]);
  }
}
