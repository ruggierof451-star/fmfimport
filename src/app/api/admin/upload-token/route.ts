import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth";

/**
 * Autorizza il caricamento diretto di una foto prodotto dal dispositivo dell'admin
 * all'archivio Vercel Blob, SENZA far passare il file dal server.
 *
 * Perché così: una funzione serverless accetta richieste fino a ~4,5 MB e ha un tempo
 * massimo di esecuzione; mandando il file al server, una foto da telefono (anche
 * ridimensionata) poteva superare il limite o andare in timeout su rete lenta, e il
 * caricamento falliva. Qui il server rilascia solo un permesso a tempo: il file viaggia
 * direttamente dal browser all'archivio, senza limiti di dimensione né timeout.
 *
 * Il permesso viene rilasciato solo a un admin autenticato e vale solo per immagini.
 */
/**
 * Diagnosi per il pannello admin: la libreria di Blob, quando il permesso non viene
 * rilasciato, riporta sempre lo stesso messaggio generico ("Failed to retrieve the
 * client token") nascondendo il motivo vero. Qui lo diciamo chiaramente.
 */
export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ready: false, reason: "Sessione admin scaduta: esci e rientra nel pannello." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({
      ready: false,
      reason:
        "Archivio foto non collegato: su Vercel apri il progetto → Storage, collega lo store Blob al progetto, poi rifai il deploy (le variabili si leggono solo al momento della build).",
    });
  }
  return NextResponse.json({ ready: true });
}

export async function POST(req: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Archivio foto non collegato al sito (manca Vercel Blob): collega uno store Blob al progetto su Vercel." },
      { status: 503 }
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        addRandomSuffix: true,
        maximumSizeInBytes: 15 * 1024 * 1024,
      }),
      // Niente da fare a caricamento finito: l'indirizzo della foto viene salvato sul
      // prodotto quando l'admin salva il modulo.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload] permesso di caricamento non rilasciato:", err);
    return NextResponse.json({ error: "Caricamento non autorizzato. Riprova." }, { status: 400 });
  }
}
