"use client";

import { useRef, useState } from "react";

export function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Caricamento fallito.");
      } else {
        onChange(data.imageUrl);
      }
    } catch {
      setError("Caricamento fallito. Controlla la connessione.");
    }
    setUploading(false);
  }

  return (
    <label className="fl">
      URL immagine (o carica una foto dal dispositivo)
      <input className="in" value={value} onChange={(e) => onChange(e.target.value)} placeholder="vuoto = immagine generata automaticamente" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button type="button" className="btn btn-line btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? "Caricamento…" : "Carica foto dal dispositivo"}
        </button>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 6, background: "#FBFBFB" }} />
        ) : null}
      </div>
      {error ? (
        <span className="e" style={{ display: "block", marginTop: 4 }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
