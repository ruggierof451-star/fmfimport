import { NextResponse, type NextRequest } from "next/server";

/**
 * SEO: un solo dominio pubblico indicizzabile, https://www.fmfcards.com.
 *
 * - Il dominio tecnico di produzione (fmfimport.vercel.app) e il dominio senza "www"
 *   vengono reindirizzati in modo permanente (308) allo stesso percorso su
 *   www.fmfcards.com, così Google vede un solo URL per ogni pagina.
 * - Le chiamate /api NON vengono reindirizzate: webhook di Stripe e richieste già in
 *   corso devono continuare a funzionare su qualunque host (un redirect le romperebbe).
 * - Gli altri host *.vercel.app (anteprime dei rami, URL dei singoli deployment) restano
 *   utilizzabili per i test ma ricevono X-Robots-Tag: noindex, così non finiscono mai
 *   nei risultati di ricerca.
 *
 * Valori ripetuti qui di proposito (invece di importarli da src/lib/site.ts): il proxy
 * gira separato dal resto dell'app e deve restare autonomo.
 */
const CANONICAL_HOST = "www.fmfcards.com";
const REDIRECT_HOSTS = new Set(["fmfimport.vercel.app", "fmfcards.com"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const { pathname, search } = request.nextUrl;

  if (REDIRECT_HOSTS.has(host) && !pathname.startsWith("/api")) {
    return NextResponse.redirect(`https://${CANONICAL_HOST}${pathname}${search}`, 308);
  }

  if (host !== CANONICAL_HOST && host.endsWith(".vercel.app")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  // Tutto tranne gli asset statici e le immagini ottimizzate di Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
