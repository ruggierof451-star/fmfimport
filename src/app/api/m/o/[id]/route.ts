import { prisma } from "@/lib/prisma";

// GIF trasparente 1×1: pixel per contare le aperture delle email di marketing.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const send = await prisma.marketingSend.findUnique({ where: { id }, select: { openedAt: true } });
    if (send) {
      await prisma.marketingSend.update({
        where: { id },
        data: { openCount: { increment: 1 }, ...(send.openedAt ? {} : { openedAt: new Date() }) },
      });
    }
  } catch (err) {
    console.error("[marketing] registrazione apertura fallita:", err);
  }
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private", "X-Robots-Tag": "noindex" },
  });
}
