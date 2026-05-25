import { api, apiBlob } from "./client";
import type { SecureFile, ShareLink } from "../types";

export function listFiles(): Promise<SecureFile[]> {
  return api<SecureFile[]>("/files");
}

export function uploadEncryptedFile(
  encryptedFile: Blob,
  originalName: string,
  originalContentType: string,
  iv: string,
  salt: string,
  mode: "symmetric" | "asymmetric" = "symmetric",
  wrappedKey = "",
): Promise<SecureFile> {
  const form = new FormData();
  form.append("encrypted_file", encryptedFile, `${originalName}.encrypted`);
  form.append("original_name", originalName);
  form.append("original_content_type", originalContentType || "application/octet-stream");
  form.append("encryption_iv", iv);
  form.append("encryption_salt", salt);
  form.append("encryption_mode", mode);
  form.append("wrapped_key", wrappedKey);

  return api<SecureFile>("/files", {
    method: "POST",
    body: form,
  });
}

export function downloadEncryptedFile(fileId: number): Promise<Blob> {
  return apiBlob(`/files/${fileId}/download`);
}

export function deleteFile(fileId: number): Promise<void> {
  return api<void>(`/files/${fileId}`, { method: "DELETE" });
}

export function createShareLink(fileId: number): Promise<ShareLink> {
  return api<ShareLink>(`/share/${fileId}`, { method: "POST" });
}

export function getSharedFile(token: string): Promise<SecureFile> {
  return api<SecureFile>(`/share/${token}`, { auth: false });
}

export function downloadSharedFile(token: string): Promise<Blob> {
  return apiBlob(`/share/${token}/download`, false);
}
