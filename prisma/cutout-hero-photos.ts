import sharp from "sharp";
import path from "path";
import fs from "fs";
import { prisma } from "../src/lib/prisma";

const OUT_DIR = path.join(__dirname, "..", "public", "products-cutout");

/** Rimuove lo sfondo bianco uniforme delle foto prodotto (color-key + feather ai bordi). */
async function cutoutWhiteBackground(srcPath: string, destPath: string) {
  const img = sharp(srcPath);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const saturation = max - min; // basso = grigio/bianco, alto = colore acceso
    // Vicino al bianco puro e poco saturo -> trasparente. Rampa morbida tra 230 e 255 per bordi puliti.
    const brightness = min;
    let alpha = 255;
    if (saturation < 18) {
      if (brightness >= 250) alpha = 0;
      else if (brightness >= 225) alpha = Math.round(((250 - brightness) / (250 - 225)) * 255);
    }
    data[i + 3] = Math.min(data[i + 3], alpha);
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .trim()
    .toFile(destPath);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const products = await prisma.product.findMany({
    where: { published: true, imageUrl: { not: null }, isNew: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, imageUrl: true, game: true, language: true },
  });

  const seenCombos = new Set<string>();
  const picked: typeof products = [];
  for (const p of products) {
    const combo = `${p.game}-${p.language}`;
    if (seenCombos.has(combo)) continue;
    seenCombos.add(combo);
    picked.push(p);
    if (picked.length === 3) break;
  }

  for (const p of picked) {
    const srcPath = path.join(__dirname, "..", "public", p.imageUrl!.replace(/^\//, ""));
    const destPath = path.join(OUT_DIR, `${p.slug}.png`);
    await cutoutWhiteBackground(srcPath, destPath);
    console.log(`Ritagliato: ${p.slug}`);
  }

  console.log(`Fatto. ${picked.length} immagini salvate in ${OUT_DIR}`);
  await prisma.$disconnect();
}

main();
