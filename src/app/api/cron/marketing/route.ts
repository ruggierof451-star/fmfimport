import { NextResponse } from "next/server";
import { processQueue } from "@/lib/marketing-engine";

/**
 * Giro giornaliero della coda email marketing (vercel.json → crons). Vercel chiama questo
 * indirizzo con "Authorization: Bearer <CRON_SECRET>" se la variabile CRON_SECRET è
 * impostata; senza CRON_SECRET l'indirizzo è disattivato.
 */
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const result = await processQueue();
  return NextResponse.json(result);
}
