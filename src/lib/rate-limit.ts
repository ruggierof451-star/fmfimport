import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Limite di tentativi per finestra temporale, contro i tentativi automatici ripetuti
 * (brute force) su login, registrazione e recupero password. Il conteggio sta nel
 * database, così il limite vale davvero anche con più funzioni serverless su Vercel
 * (una variabile in memoria non basterebbe: ogni richiesta può girare su un processo
 * diverso). È "best effort": in caso di corse tra richieste simultanee il conteggio può
 * sbagliare di poco, ma per fermare gli attacchi a forza bruta è più che sufficiente.
 */
export interface RateLimitResult {
  ok: boolean;
  /** Secondi da attendere prima di riprovare, quando ok = false. */
  retryAfterSec: number;
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const rec = await prisma.rateLimit.findUnique({ where: { key } });
    // Prima volta o finestra scaduta: riparte da 1.
    if (!rec || rec.resetAt.getTime() <= now) {
      const resetAt = new Date(now + windowMs);
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, retryAfterSec: 0 };
    }
    if (rec.count >= max) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((rec.resetAt.getTime() - now) / 1000)) };
    }
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return { ok: true, retryAfterSec: 0 };
  } catch (err) {
    // In caso di problemi col database non blocchiamo gli utenti legittimi: meglio
    // lasciar passare che chiudere fuori tutti. L'errore viene comunque registrato.
    console.error("[rate-limit] controllo fallito, richiesta consentita:", err);
    return { ok: true, retryAfterSec: 0 };
  }
}

/** Azzera il contatore dopo un'azione andata a buon fine (es. login riuscito). */
export async function rateLimitReset(key: string): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { key } });
  } catch {
    // non critico
  }
}

/** Indirizzo IP del chiamante, dalle intestazioni del proxy (Vercel). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "sconosciuto";
}

/** Messaggio uniforme quando si supera il limite. */
export function tooManyAttemptsMessage(retryAfterSec: number): string {
  const min = Math.ceil(retryAfterSec / 60);
  return `Troppi tentativi. Riprova tra ${min <= 1 ? "un minuto" : `${min} minuti`}.`;
}
