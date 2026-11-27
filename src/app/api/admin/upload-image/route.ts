import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * Caricamento di una foto prodotto dal pannello admin.
 *
 * La foto viene conservata nel database, insieme ai prodotti: non serve configurare
 * nessun archivio esterno e la foto non può sparire (il disco delle funzioni su Vercel
 * è temporaneo e gli indirizzi di foto prese da altri siti smettono di funzionare dopo
 * qualche ora). Arriva già ridotta e ritagliata dal browser (vedi ImageUploadField),
 * quindi pesa poche decine di KB: ben sotto il limite di ~4,5 MB per richiesta.
 */
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_SIZE_BYTES = 3 * 1024 * 1024;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sessione admin scaduta: esci e rientra nel pannello." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato non supportato. Usa JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Foto troppo pesante. Riprova con un'immagine più piccola." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());

  try {
    const saved = await prisma.uploadedImage.create({
      data: { mimeType: file.type, data, byteSize: data.byteLength, createdBy: admin.email },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, imageUrl: `/immagini/${saved.id}` });
  } catch (err) {
    console.error("[upload] salvataggio foto nel database fallito:", err);
    return NextResponse.json({ error: "Non è stato possibile salvare la foto. Riprova." }, { status: 500 });
  }
}
