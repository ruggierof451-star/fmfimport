import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Archivio immagini non ancora collegato al sito (manca Vercel Blob). Nel frattempo incolla l'indirizzo di un'immagine nel campo URL." },
      { status: 503 }
    );
  }

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
    return NextResponse.json({ error: "File troppo grande (massimo 8 MB)." }, { status: 400 });
  }

  const filename = `products/upload-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const blob = await put(filename, file, { access: "public", contentType: file.type });

  return NextResponse.json({ ok: true, imageUrl: blob.url });
}
