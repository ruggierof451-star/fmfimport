import { prisma } from "@/lib/prisma";

/**
 * Serve una foto prodotto conservata nel database.
 *
 * Volutamente fuori da /api (che robots.txt esclude) perché le foto dei prodotti è bene
 * che Google possa vederle. Il contenuto di un indirizzo non cambia mai — una foto
 * nuova riceve un id nuovo — quindi si può dire al browser di tenerla in cache per
 * sempre: dalla seconda visita non viene più richiesta.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const image = await prisma.uploadedImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true, byteSize: true },
  });
  if (!image) return new Response("Immagine non trovata", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
