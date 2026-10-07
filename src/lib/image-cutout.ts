import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "products-cutout");

export interface CutoutImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Ritaglia lo sfondo di una foto prodotto e salva il risultato (PNG con alpha) in cache
 * su disco. Tecnica: flood-fill a partire dai bordi dell'immagine attraverso i pixel
 * "chiari e poco saturi" (sfondo studio bianco/grigio chiaro, incluse le sfumature
 * d'ombra morbide verso il prodotto), poi un piccolo blur sul solo canale alpha per
 * bordi lisci. A differenza di una semplice soglia di colore globale, la connettività
 * del flood-fill evita di bucare zone chiare DENTRO il prodotto (es. scritte bianche
 * su una carta), perché quelle non sono collegate allo sfondo esterno.
 *
 * Ritorna url + dimensioni reali dell'immagine ritagliata: è fondamentale usare le
 * dimensioni vere lato chiamante, altrimenti un contenitore con aspect-ratio diverso
 * dal ritaglio lascia spazio vuoto che mostra lo sfondo della pagina.
 */
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
    return null; // filesystem di sola lettura: vedi commento piu' sotto
  }

  const img = sharp(srcPath);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const total = width * height;

  const isBg = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qTail = 0;

  const BRIGHTNESS_MIN = 200;
  const SATURATION_MAX = 35;

  function bgScore(idx: number): boolean {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= BRIGHTNESS_MIN && max - min < SATURATION_MAX;
  }

  function trySeed(x: number, y: number) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (bgScore(p * channels)) {
      visited[p] = 1;
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  }

  for (let x = 0; x < width; x++) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  let qHead = 0;
  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % width;
    const y = (p / width) | 0;
    trySeed(x - 1, y);
    trySeed(x + 1, y);
    trySeed(x, y - 1);
    trySeed(x, y + 1);
  }

  // Blur leggero sul solo canale alpha per bordi morbidi (niente aliasing netto).
  const alpha = new Float32Array(total);
  for (let p = 0; p < total; p++) alpha[p] = isBg[p] ? 0 : 255;

  const blurred = new Float32Array(total);
  const RADIUS = 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += alpha[ny * width + nx];
          count++;
        }
      }
      blurred[y * width + x] = sum / count;
    }
  }

  for (let p = 0; p < total; p++) {
    data[p * channels + 3] = Math.min(data[p * channels + 3], Math.round(blurred[p]));
  }

  try {
    const trimmed = sharp(data, { raw: { width, height, channels } })
      .webp({ quality: 85, alphaQuality: 90 })
      .trim({ threshold: 5 });
    await trimmed.toFile(destPath);
    const outMeta = await sharp(destPath).metadata();
    return { url: destPublicPath, width: outMeta.width ?? width, height: outMeta.height ?? height };
  } catch {
    // Filesystem di sola lettura (es. funzione serverless su Vercel): niente cache su
    // disco possibile a runtime. I ritagli vanno pre-generati in locale col script
    // prisma/cutout-all-products.ts e committati; qui ripieghiamo sulla foto originale.
    return null;
  }
}
