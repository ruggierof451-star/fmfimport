"use client";

import { useRef, useState } from "react";
import { cutoutRgbaInPlace } from "@/lib/cutout-core";

// Le foto da telefono possono pesare 5-10 MB: prima dell'invio vengono ridotte a max
// 1400px sul lato lungo e, già qui nel browser, viene tolto lo sfondo studio. Così la
// foto parte leggera (poche decine di KB) e già pronta: il server deve solo salvarla.
const MAX_SIDE = 1400;

async function prepareImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    try {
      const imageData = ctx.getImageData(0, 0, w, h);
      cutoutRgbaInPlace(imageData.data, w, h);
      ctx.putImageData(imageData, 0, 0);
    } catch (err) {
      // Ritaglio non riuscito: si procede comunque con la foto ridimensionata.
      console.error("Ritaglio sfondo non riuscito:", err);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp") return file;
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
      const prepared = await prepareImage(file);

      const body = new FormData();
      body.append("file", prepared);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { imageUrl?: string; error?: string } | null;

      if (!res.ok || !data?.imageUrl) {
        setError(data?.error ?? `Caricamento non riuscito (errore ${res.status}).`);
      } else {
        onChange(data.imageUrl);
      }
    } catch {
      setError("Caricamento non riuscito: controlla la connessione e riprova.");
    }
    setUploading(false);
  }

  return (
    <label className="fl">
      Foto prodotto
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <button type="button" className="btn btn-dark btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? "Caricamento…" : value ? "Sostituisci foto" : "Carica foto dal dispositivo"}
        </button>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ height: 48, width: 48, objectFit: "contain", borderRadius: 6 }} />
        ) : null}
        {value ? (
          <button type="button" className="btn btn-line btn-sm" onClick={() => onChange("")} disabled={uploading}>
            Rimuovi
          </button>
        ) : null}
      </div>
      <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
        La foto viene ridotta e ripulita dallo sfondo bianco qui nel browser, poi salvata nel database del sito
        insieme al prodotto: resta lì per sempre. Evita di incollare indirizzi di foto prese da altri siti, smettono di funzionare dopo
        qualche ora.
      </span>
      <details>
        <summary className="muted" style={{ fontSize: 13, cursor: "pointer", fontWeight: 400 }}>
          Oppure usa l&apos;indirizzo di un&apos;immagine
        </summary>
        <input
          className="in"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="vuoto = immagine generata automaticamente"
          style={{ marginTop: 6 }}
        />
      </details>
      {error ? (
        <span className="e" style={{ display: "block", marginTop: 4 }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
