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
      if (encrypted === null) {
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
