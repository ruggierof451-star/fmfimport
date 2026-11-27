import { NextResponse } from "next/server";
import { unsubscribeBySendId } from "@/lib/newsletter-actions";
import { absoluteUrl } from "@/lib/site";

/**
 * Disiscrizione "con un clic" dal pulsante che Gmail, Apple Mail ecc. mostrano accanto al
 * mittente (intestazioni List-Unsubscribe / List-Unsubscribe-Post).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await unsubscribeBySendId(id);
  return new NextResponse(null, { status: 200 });
}

// Aperto da browser: porta alla pagina di disiscrizione con conferma.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.redirect(absoluteUrl(`/newsletter/disiscrizione/${id}`), 302);
}
