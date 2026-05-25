import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

import { createShareLink } from "../api/files";
import type { SecureFile } from "../types";

type Props = {
  file: SecureFile;
  onClose: () => void;
};

export function ShareDialog({ file, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Створення...");

  useEffect(() => {
    createShareLink(file.id)
      .then((link) => {
        setUrl(`${window.location.origin}/?share=${link.token}`);
        setStatus("Посилання готове.");
      })
      .catch((err) => setStatus(err instanceof Error ? err.message : "Не вдалося створити посилання"));
  }, [file.id]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setStatus("Скопійовано.");
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-title">
          <div>
            <h2>Share</h2>
            <p>{file.original_name}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Закрити">
            <X size={18} />
          </button>
        </div>
        <input value={url} readOnly />
        <button className="primary" type="button" onClick={copy} disabled={!url}>
          <Copy size={17} />
          Копіювати
        </button>
        <p className="status">{status}</p>
      </section>
    </div>
  );
}
