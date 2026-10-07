import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "products-cutout");

/**
 * Ritaglia lo sfondo bianco di una foto prodotto (color-key + feather ai bordi) e salva
 * il risultato in cache su disco. Le foto fornitore sono tutte su sfondo bianco uniforme,
 * quindi questa tecnica è affidabile e non richiede servizi esterni.
 * Ritorna il path pubblico dell'immagine ritagliata, o null se la sorgente non esiste.
 */
export async function ensureCutoutImage(imageUrl: string, slug: string): Promise<string | null> {
  const destPath = path.join(OUT_DIR, `${slug}.png`);
  const destPublicPath = `/products-cutout/${slug}.png`;

  if (fs.existsSync(destPath)) return destPublicPath;

  const srcPath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  if (!fs.existsSync(srcPath)) return null;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const sharp = (await import("sharp")).default;
  const img = sharp(srcPath);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const saturation = max - min;
    const brightness = min;
    let alpha = 255;
    if (saturation < 18) {
      if (brightness >= 250) alpha = 0;
      else if (brightness >= 225) alpha = Math.round(((250 - brightness) / (250 - 225)) * 255);
    }
    data[i + 3] = Math.min(data[i + 3], alpha);
  }

  await sharp(data, { raw: { width, height, channels } }).png().trim().toFile(destPath);

  return destPublicPath;
}
