import fs from "fs";
import path from "path";
import { cutoutRgbaInPlace } from "@/lib/cutout-core";

const OUT_DIR = path.join(process.cwd(), "public", "products-cutout");

export interface CutoutImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Ritaglia lo sfondo di una foto prodotto (buffer in memoria, nessuna scrittura su
 * disco): funziona ovunque, incluse le funzioni serverless con filesystem di sola
 * lettura. Tecnica: flood-fill a partire dai bordi dell'immagine attraverso i pixel
 * "chiari e poco saturi" (sfondo studio bianco/grigio chiaro, incluse le sfumature
 * d'ombra morbide verso il prodotto), poi un piccolo blur sul solo canale alpha per
 * bordi lisci. A differenza di una semplice soglia di colore globale, la connettività
 * del flood-fill evita di bucare zone chiare DENTRO il prodotto (es. scritte bianche
 * su una carta), perché quelle non sono collegate allo sfondo esterno.
 */
export async function cutoutImageBuffer(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  cutoutRgbaInPlace(data, width, height);

  return sharp(data, { raw: { width, height, channels } })
    .webp({ quality: 85, alphaQuality: 90 })
    .trim({ threshold: 5 })
    .toBuffer();
}

/**
 * Ritaglia lo sfondo di una foto prodotto già salvata in public/ e mette il risultato
 * in cache su disco (public/products-cutout). Serve per le foto del catalogo iniziale,
 * pre-generate in locale e committate: su Vercel il filesystem a runtime è di sola
 * lettura, quindi qui si legge solo la cache già presente, non se ne crea di nuova (le
 * foto caricate dall'admin via Blob vengono invece già ritagliate al momento
 * dell'upload nel browser, vedi cutout-core.ts e ImageUploadField).
 */
/**
 * Indirizzo del ritaglio già pronto, senza aprire il file. Per le immagini mostrate con
 * `fill` (griglia, scheda prodotto, carrello) le dimensioni reali non servono: evitarne
 * la lettura toglie un accesso al disco per ogni prodotto a ogni caricamento di pagina.
 */
export function cutoutUrlIfReady(slug: string): string | null {
  return fs.existsSync(path.join(OUT_DIR, `${slug}.webp`)) ? `/products-cutout/${slug}.webp` : null;
}

export async function ensureCutoutImage(imageUrl: string, slug: string): Promise<CutoutImage | null> {
  const destPath = path.join(OUT_DIR, `${slug}.webp`);
  const destPublicPath = `/products-cutout/${slug}.webp`;

  const sharp = (await import("sharp")).default;

  if (fs.existsSync(destPath)) {
    const meta = await sharp(destPath).metadata();
    return { url: destPublicPath, width: meta.width ?? 1, height: meta.height ?? 1 };
  }

  const srcPath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  if (!fs.existsSync(srcPath)) return null;

  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  } catch {
    return null; // filesystem di sola lettura: vedi commento qui sopra
  }

  try {
    const buffer = await cutoutImageBuffer(await fs.promises.readFile(srcPath));
    await fs.promises.writeFile(destPath, buffer);
    const outMeta = await sharp(destPath).metadata();
    return { url: destPublicPath, width: outMeta.width ?? 1, height: outMeta.height ?? 1 };
  } catch {
    return null;
  }
}
