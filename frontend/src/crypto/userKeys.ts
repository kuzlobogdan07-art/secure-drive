import type { User } from "../types";
import type { UserKeyPayload } from "../api/auth";
import { base64ToBytes, bytesToBase64, deriveAesKey, randomBytes, toArrayBuffer } from "./keys";

const PRIVATE_KEY_STORAGE_KEY = "secure-drive-private-key";

export class UserKeyManager {
  async generatePayload(password: string): Promise<UserKeyPayload & { privateKeyJson: string }> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["wrapKey", "unwrapKey"],
    );
    const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const privateKeyJson = JSON.stringify(privateKey);
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const wrappingKey = await deriveAesKey(password, salt);
    const encryptedPrivateKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      wrappingKey,
      new TextEncoder().encode(privateKeyJson),
    );

    return {
      public_key: JSON.stringify(publicKey),
      encrypted_private_key: bytesToBase64(new Uint8Array(encryptedPrivateKey)),
      private_key_salt: bytesToBase64(salt),
      private_key_iv: bytesToBase64(iv),
      privateKeyJson,
    };
  }

  async unlockPrivateKey(user: User, password: string): Promise<string> {
    if (!user.encrypted_private_key || !user.private_key_salt || !user.private_key_iv) {
      throw new Error("Для цього акаунта ще не створено asymmetric key pair.");
    }

    const salt = base64ToBytes(user.private_key_salt);
    const iv = base64ToBytes(user.private_key_iv);
    const wrappingKey = await deriveAesKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      wrappingKey,
      toArrayBuffer(base64ToBytes(user.encrypted_private_key)),
    );

    return new TextDecoder().decode(decrypted);
  }
}

export class UnlockedPrivateKeyStore {
  save(privateKeyJson: string): void {
    sessionStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyJson);
  }

  load(): string {
    return sessionStorage.getItem(PRIVATE_KEY_STORAGE_KEY) ?? "";
  }

  clear(): void {
    sessionStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
  }
}

const userKeyManager = new UserKeyManager();
const unlockedPrivateKeyStore = new UnlockedPrivateKeyStore();

export async function generateUserKeyPayload(password: string): Promise<UserKeyPayload & { privateKeyJson: string }> {
  return userKeyManager.generatePayload(password);
}

export async function unlockPrivateKey(user: User, password: string): Promise<string> {
  return userKeyManager.unlockPrivateKey(user, password);
}

export function storeUnlockedPrivateKey(privateKeyJson: string): void {
  unlockedPrivateKeyStore.save(privateKeyJson);
}

export function loadUnlockedPrivateKey(): string {
  return unlockedPrivateKeyStore.load();
}

export function clearUnlockedPrivateKey(): void {
  unlockedPrivateKeyStore.clear();
}
