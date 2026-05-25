import { base64ToBytes, bytesToBase64, deriveAesKey, randomBytes, toArrayBuffer } from "./keys";

export type EncryptionResult = {
  blob: Blob;
  iv: string;
  salt: string;
};

export type AsymmetricEncryptionResult = {
  blob: Blob;
  iv: string;
  wrappedKey: string;
};

export class SymmetricFileCipher {
  async encrypt(file: File, password: string): Promise<EncryptionResult> {
    const iv = randomBytes(12);
    const salt = randomBytes(16);
    const key = await deriveAesKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      await file.arrayBuffer(),
    );

    return {
      blob: new Blob([encrypted], { type: "application/octet-stream" }),
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
    };
  }

  async decrypt(
    encryptedBlob: Blob,
    password: string,
    ivBase64: string,
    saltBase64: string,
    contentType: string,
  ): Promise<Blob> {
    const iv = base64ToBytes(ivBase64);
    const salt = base64ToBytes(saltBase64);
    const key = await deriveAesKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      await encryptedBlob.arrayBuffer(),
    );

    return new Blob([decrypted], { type: contentType || "application/octet-stream" });
  }
}

export class AsymmetricFileCipher {
  async encrypt(file: File, publicKeyJson: string): Promise<AsymmetricEncryptionResult> {
    const iv = randomBytes(12);
    const publicKeyData = JSON.parse(publicKeyJson) as JsonWebKey;
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicKeyData,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["wrapKey"],
    );
    const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      aesKey,
      await file.arrayBuffer(),
    );
    const wrappedKey = await crypto.subtle.wrapKey("raw", aesKey, publicKey, { name: "RSA-OAEP" });

    return {
      blob: new Blob([encrypted], { type: "application/octet-stream" }),
      iv: bytesToBase64(iv),
      wrappedKey: bytesToBase64(new Uint8Array(wrappedKey)),
    };
  }

  async decrypt(
    encryptedBlob: Blob,
    privateKeyJson: string,
    ivBase64: string,
    wrappedKeyBase64: string,
    contentType: string,
  ): Promise<Blob> {
    const privateKeyData = JSON.parse(privateKeyJson) as JsonWebKey;
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateKeyData,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["unwrapKey"],
    );
    const aesKey = await crypto.subtle.unwrapKey(
      "raw",
      toArrayBuffer(base64ToBytes(wrappedKeyBase64)),
      privateKey,
      { name: "RSA-OAEP" },
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const iv = base64ToBytes(ivBase64);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      aesKey,
      await encryptedBlob.arrayBuffer(),
    );

    return new Blob([decrypted], { type: contentType || "application/octet-stream" });
  }
}

export class BlobDownloader {
  save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

const symmetricFileCipher = new SymmetricFileCipher();
const asymmetricFileCipher = new AsymmetricFileCipher();
const blobDownloader = new BlobDownloader();

export async function encryptFile(file: File, password: string): Promise<EncryptionResult> {
  return symmetricFileCipher.encrypt(file, password);
}

export async function decryptBlob(
  encryptedBlob: Blob,
  password: string,
  ivBase64: string,
  saltBase64: string,
  contentType: string,
): Promise<Blob> {
  return symmetricFileCipher.decrypt(encryptedBlob, password, ivBase64, saltBase64, contentType);
}

export async function encryptFileAsymmetric(file: File, publicKeyJson: string): Promise<AsymmetricEncryptionResult> {
  return asymmetricFileCipher.encrypt(file, publicKeyJson);
}

export async function decryptBlobAsymmetric(
  encryptedBlob: Blob,
  privateKeyJson: string,
  ivBase64: string,
  wrappedKeyBase64: string,
  contentType: string,
): Promise<Blob> {
  return asymmetricFileCipher.decrypt(encryptedBlob, privateKeyJson, ivBase64, wrappedKeyBase64, contentType);
}

export function saveBlob(blob: Blob, filename: string): void {
  blobDownloader.save(blob, filename);
}
