import { Download, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { downloadSharedFile, getSharedFile } from "../api/files";
import { decryptBlob, decryptBlobAsymmetric, saveBlob } from "../crypto/aes";
import type { SecureFile } from "../types";

type Props = {
  token: string;
};

export function SharedDownload({ token }: Props) {
  const [file, setFile] = useState<SecureFile | null>(null);
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState("Завантаження...");

  useEffect(() => {
    getSharedFile(token)
      .then((metadata) => {
        setFile(metadata);
        setStatus("Файл доступний.");
      })
      .catch(() => setStatus("Посилання недійсне."));
  }, [token]);

  async function download() {
    if (!file) return;

    try {
      setStatus("Розшифрування...");
      const encrypted = await downloadSharedFile(token);
      const decrypted =
        file.encryption_mode === "asymmetric"
          ? await decryptBlobAsymmetric(encrypted, secret, file.encryption_iv, file.wrapped_key, file.content_type)
          : await decryptBlob(encrypted, secret, file.encryption_iv, file.encryption_salt, file.content_type);

      saveBlob(decrypted, file.original_name);
      setStatus("Готово.");
    } catch {
      setStatus("Не вдалося розшифрувати файл.");
    }
  }

  const isAsymmetric = file?.encryption_mode === "asymmetric";

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={30} />
          </div>
          <div>
            <h1>Secure Drive</h1>
            <p>{file ? file.original_name : "Share link"}</p>
          </div>
        </div>

        <div className="auth-form">
          <label>
            {isAsymmetric ? "Private key JSON" : "Пароль"}
            <input
              type={isAsymmetric ? "text" : "password"}
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              minLength={isAsymmetric ? undefined : 8}
            />
          </label>
          <button className="primary" type="button" onClick={download} disabled={!file || !secret}>
            <Download size={18} />
            Скачати
          </button>
          <p className="status">{status}</p>
        </div>
      </section>
    </main>
  );
}
