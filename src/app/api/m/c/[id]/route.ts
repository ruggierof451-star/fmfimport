import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClick } from "@/lib/marketing-render";
import { absoluteUrl } from "@/lib/site";

/**
 * Clic su un link di un'email di marketing: registra il clic e porta all'indirizzo
 * originale. La firma impedisce di usare questo indirizzo per mandare le persone su siti
 * diversi da quelli scritti nell'email.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("u") ?? "";
  const sig = url.searchParams.get("s") ?? "";
  const secret = process.env.AUTH_SECRET ?? "";

  if (!/^https?:\/\//i.test(target) || !secret || !verifyClick(secret, id, target, sig)) {
    return NextResponse.redirect(absoluteUrl("/"), 302);
  }
  try {
    const send = await prisma.marketingSend.findUnique({ where: { id }, select: { clickedAt: true, openedAt: true } });
    if (send) {
      const now = new Date();
      await prisma.$transaction([
        prisma.marketingClick.create({ data: { sendId: id, url: target.slice(0, 2000) } }),
        prisma.marketingSend.update({
          where: { id },
          data: {
            clickCount: { increment: 1 },
            ...(send.clickedAt ? {} : { clickedAt: now }),
            // chi clicca ha per forza aperto (anche se il pixel è stato bloccato)
            ...(send.openedAt ? {} : { openedAt: now }),
          },
        }),
      ]);
    }
  } catch (err) {
    console.error("[marketing] registrazione clic fallita:", err);
  }
  return NextResponse.redirect(target, 302);
}
