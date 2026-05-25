import { Download, Share2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { deleteFile, downloadEncryptedFile, listFiles } from "../api/files";
import { decryptBlob, decryptBlobAsymmetric, saveBlob } from "../crypto/aes";
import type { SecureFile } from "../types";
import { ShareDialog } from "./ShareDialog";

type Props = {
  refreshKey: number;
  privateKeyJson: string;
};

export function FileList({ refreshKey, privateKeyJson }: Props) {
  const [files, setFiles] = useState<SecureFile[]>([]);
  const [error, setError] = useState("");
  const [selectedShare, setSelectedShare] = useState<SecureFile | null>(null);

  useEffect(() => {
    listFiles()
      .then(setFiles)
      .catch((err) => setError(err instanceof Error ? err.message : "Не вдалося завантажити файли"));
  }, [refreshKey]);

  async function download(file: SecureFile) {
    try {
      const encrypted = await downloadEncryptedFile(file.id);
      const secret = file.encryption_mode === "asymmetric" ? privateKeyJson : window.prompt(`Пароль для ${file.original_name}`);

      if (!secret) return;

      const decrypted =
        file.encryption_mode === "asymmetric"
          ? await decryptBlobAsymmetric(encrypted, secret, file.encryption_iv, file.wrapped_key, file.content_type)
          : await decryptBlob(encrypted, secret, file.encryption_iv, file.encryption_salt, file.content_type);

      saveBlob(decrypted, file.original_name);
    } catch {
      alert("Не вдалося розшифрувати файл.");
    }
  }

  async function remove(file: SecureFile) {
    if (!confirm(`Видалити ${file.original_name}?`)) return;
    await deleteFile(file.id);
    setFiles((items) => items.filter((item) => item.id !== file.id));
  }

  return (
    <section className="file-panel">
      <div className="section-heading">
        <div>
          <h2>Мої файли</h2>
          <p>{files.length ? `${files.length} файлів` : "Сховище порожнє"}</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="file-table">
        {files.map((file) => (
          <article className="file-row" key={file.id}>
            <div className="file-main">
              <strong>{file.original_name}</strong>
              <span>
                {(file.size / 1024).toFixed(1)} KB · {file.encryption_mode === "asymmetric" ? "RSA + AES" : "AES"} ·{" "}
                {new Date(file.created_at).toLocaleString()}
              </span>
            </div>
            <div className="row-actions">
              <button className="icon-button" type="button" onClick={() => download(file)} title="Скачати">
                <Download size={17} />
              </button>
              <button className="icon-button" type="button" onClick={() => setSelectedShare(file)} title="Share">
                <Share2 size={17} />
              </button>
              <button className="icon-button danger" type="button" onClick={() => remove(file)} title="Видалити">
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedShare && <ShareDialog file={selectedShare} onClose={() => setSelectedShare(null)} />}
    </section>
  );
}
