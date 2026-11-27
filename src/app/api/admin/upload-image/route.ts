import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { cutoutImageBuffer } from "@/lib/image-cutout";
import fs from "fs";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// Vercel accetta richieste fino a ~4,5 MB: il browser ridimensiona già le foto prima
// dell'invio (vedi ImageUploadField), questo è solo il limite di sicurezza.
const MAX_SIZE_BYTES = 4 * 1024 * 1024;

/**
 * Caricamento foto prodotto dal pannello admin.
 *
 * Online (Vercel) il disco del server è di sola lettura e non conserva file tra un
 * deploy e l'altro, quindi le foto vanno su Vercel Blob: serve la variabile
 * BLOB_READ_WRITE_TOKEN, che Vercel aggiunge da sola collegando uno store Blob al
 * progetto (Vercel → progetto → Storage → Create → Blob). In sviluppo locale, senza
 * quella variabile, la foto viene salvata in public/products come prima.
 *
 * Prima di salvarla, lo sfondo studio (bianco/grigio chiaro) viene ritagliato in
 * memoria (vedi cutoutImageBuffer): così il prodotto appare "a sfondo trasparente"
 * su tutto il sito senza bisogno di una cache su disco separata, che su Vercel non
 * si potrebbe comunque creare a runtime.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Formato non supportato. Usa JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File troppo grande (massimo 4 MB)." }, { status: 400 });
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  let buffer: Buffer = originalBuffer;
  let finalExt = ext;
  let contentType = file.type;
  try {
    buffer = Buffer.from(await cutoutImageBuffer(originalBuffer));
    finalExt = "webp";
    contentType = "image/webp";
  } catch (err) {
    console.error("Ritaglio sfondo fallito, uso la foto originale:", err);
  }

  const filename = `upload-${Date.now()}-${Math.round(Math.random() * 1e6)}.${finalExt}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // L'archivio del progetto può essere privato o pubblico: si prova prima privato
      // (le foto poi si vedono tramite /img/…, vedi src/lib/blob-image.ts).
      let blob;
      try {
        blob = await put(`products/${filename}`, buffer, { access: "private", contentType });
      } catch {
        blob = await put(`products/${filename}`, buffer, { access: "public", contentType });
      }
      return NextResponse.json({ ok: true, imageUrl: blob.url });
    } catch (err) {
      console.error("Upload su Vercel Blob fallito", err);
      return NextResponse.json({ error: "Caricamento sull'archivio immagini non riuscito. Riprova tra poco." }, { status: 502 });
    }
  }

  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "Archivio immagini non ancora collegato al sito (manca Vercel Blob). Nel frattempo incolla l'indirizzo di un'immagine nel campo URL.",
      },
      { status: 503 },
    );
  }

  try {
    const dir = path.join(process.cwd(), "public", "products");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), buffer);
    return NextResponse.json({ ok: true, imageUrl: `/products/${filename}` });
  } catch (err) {
    console.error("Salvataggio locale della foto fallito", err);
    return NextResponse.json({ error: "Impossibile salvare la foto sul server." }, { status: 500 });
  }
}
