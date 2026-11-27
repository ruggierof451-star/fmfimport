"use client";

import { displayImageUrl } from "@/lib/blob-image";
import { useRef, useState } from "react";

// Le foto da telefono possono pesare 5-10 MB: prima dell'invio le riduciamo a max
// 1600px sul lato lungo in WEBP (trasparenza conservata). Così restano sotto il limite
// di Vercel (~4,5 MB per richiesta) e il sito carica più veloce. Se il browser non
// riesce a convertirla, si invia l'originale.
const MAX_SIDE = 1600;

async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob || blob.type !== "image/webp" || (scale === 1 && blob.size >= file.size)) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

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
      formData.append("file", await shrinkImage(file));
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      // Se il server risponde con una pagina d'errore invece che JSON (es. file troppo
      // grande per Vercel) mostriamo comunque un messaggio comprensibile.
      const data = (await res.json().catch(() => null)) as { imageUrl?: string; error?: string } | null;
      if (!res.ok || !data?.imageUrl) {
        setError(
          data?.error ??
            (res.status === 413 ? "Foto troppo pesante. Prova con un'immagine più piccola." : `Caricamento fallito (errore ${res.status}).`),
        );
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
          <img src={displayImageUrl(value)} alt="" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 6, background: "#FBFBFB" }} />
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
