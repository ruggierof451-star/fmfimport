import { get } from "@vercel/blob";

/**
 * Foto prodotto dall'archivio Vercel Blob privato (vedi src/lib/blob-image.ts).
 * La risposta viene tenuta in cache dalla CDN di Vercel, quindi l'archivio viene letto
 * raramente. Serve solo immagini.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path?.length) return new Response("Non trovata.", { status: 404 });
  // Credenziali: BLOB_READ_WRITE_TOKEN oppure (archivi collegati più di recente) OIDC di
  // Vercel + BLOB_STORE_ID. Le legge da sola la libreria.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return new Response("Archivio immagini non collegato.", { status: 503, headers: { "X-Img-Reason": "no-credentials" } });
  }
  const pathname = path.map((p) => decodeURIComponent(p)).join("/");
  if (pathname.includes("..")) return new Response("Non trovata.", { status: 404 });

  try {
    const res = await get(pathname, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.blob.contentType.startsWith("image/")) {
      const reason = !res ? "not-found" : res.statusCode !== 200 ? `status-${res.statusCode}` : "not-image";
      return new Response("Non trovata.", { status: 404, headers: { "X-Img-Reason": reason } });
    }
    return new Response(res.stream, {
      headers: {
        "Content-Type": res.blob.contentType,
        "Content-Length": String(res.blob.size),
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[img] lettura dall'archivio non riuscita:", pathname, err);
    const reason = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 180).replace(/[^\x20-\x7E]/g, " ") : "error";
    return new Response("Non trovata.", { status: 404, headers: { "X-Img-Reason": reason } });
  }
}
