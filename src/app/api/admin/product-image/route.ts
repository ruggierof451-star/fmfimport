import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * Sostituisce la foto di un prodotto (solo admin) con una già caricata nel database
 * (/immagini/<id>, vedi /api/admin/upload-image). Serve per i lavori in blocco, es.
 * togliere lo sfondo bianco dalle foto importate dal fornitore: il ritaglio si fa nel
 * browser (stesso algoritmo di cutout-core usato al caricamento), qui si aggiorna solo
 * il collegamento e si registra la modifica nello storico del prodotto.
 */
const bodySchema = z.object({
  productId: z.string().min(1),
  imageUrl: z.string().regex(/^\/immagini\/[A-Za-z0-9_-]+$/, "Foto non valida."),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi." }, { status: 400 });
  const { productId, imageUrl } = parsed.data;

  const imageId = imageUrl.slice("/immagini/".length);
  const [product, image] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true, imageUrl: true } }),
    prisma.uploadedImage.findUnique({ where: { id: imageId }, select: { id: true } }),
  ]);
  if (!product) return NextResponse.json({ error: "Prodotto non trovato." }, { status: 404 });
  if (!image) return NextResponse.json({ error: "Foto non trovata." }, { status: 404 });

  await prisma.product.update({
    where: { id: productId },
    data: {
      imageUrl,
      changeLogs: { create: { field: "Immagine", oldValue: product.imageUrl, newValue: imageUrl, changedBy: admin.email } },
    },
  });
  revalidatePath(`/prodotto/${product.slug}`);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
