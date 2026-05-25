import { UploadCloud } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { uploadEncryptedFile } from "../api/files";
import { encryptFile, encryptFileAsymmetric } from "../crypto/aes";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const BLOCKED_EXTENSIONS = new Set([".exe", ".mp4"]);

type Props = {
  publicKey: string;
  onUploaded: () => void;
};

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) return "Максимальний розмір файлу: 50 MB.";
  if (BLOCKED_EXTENSIONS.has(getFileExtension(file.name))) return "Цей тип файлу не підтримується.";
  return null;
}

export function FileUploader({ publicKey, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"symmetric" | "asymmetric">("symmetric");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function selectFile(candidate: File | null) {
    setStatus("");
    if (!candidate) {
      setFile(null);
      return;
    }

    const error = validateFile(candidate);
    if (error) {
      setFile(null);
      setStatus(error);
      return;
    }

    setFile(candidate);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setStatus(error);
      return;
    }

    if (mode === "asymmetric" && !publicKey) {
      setStatus("Для акаунта ще не створено public key. Увійдіть повторно.");
      return;
    }

    setBusy(true);
    setStatus("Шифрування...");

    try {
      if (mode === "symmetric") {
        const encrypted = await encryptFile(file, password);
        await uploadEncryptedFile(encrypted.blob, file.name, file.type, encrypted.iv, encrypted.salt, "symmetric");
      } else {
        const encrypted = await encryptFileAsymmetric(file, publicKey);
        await uploadEncryptedFile(encrypted.blob, file.name, file.type, encrypted.iv, "", "asymmetric", encrypted.wrappedKey);
      }

      setFile(null);
      setPassword("");
      setStatus("Файл збережено.");
      onUploaded();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Не вдалося завантажити файл");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="uploader" onSubmit={upload}>
      <div>
        <h2>Завантажити файл</h2>
        <p>До 50 MB. `.exe` і `.mp4` заблоковані.</p>
      </div>

      <label className="dropzone">
        <UploadCloud size={28} />
        <span>{file ? file.name : "Обрати файл"}</span>
        <input type="file" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
      </label>

      <label>
        Метод
        <select value={mode} onChange={(event) => setMode(event.target.value as "symmetric" | "asymmetric")}>
          <option value="symmetric">AES-GCM з паролем</option>
          <option value="asymmetric">RSA-OAEP + AES-GCM</option>
        </select>
      </label>

      {mode === "symmetric" && (
        <label>
          Пароль файлу
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
      )}

      <button className="primary" type="submit" disabled={!file || busy || (mode === "symmetric" && !password)}>
        <UploadCloud size={18} />
        {busy ? "Обробка..." : "Зашифрувати"}
      </button>
      {status && <p className="status">{status}</p>}
    </form>
  );
}
