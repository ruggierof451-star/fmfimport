// Genera lo sfondo della home per i telefoni a partire da quello desktop.
// Rilanciare con `node scripts/make-hero-bg-mobile.mjs` se l'illustrazione cambia.
//
// L'originale è orizzontale (1672x941): su uno schermo verticale, con background-size:cover,
// andrebbe ingrandito di oltre il doppio (sgranato) oppure coprirebbe solo una fascia in alto.
// Qui l'illustrazione viene messa a tutta larghezza e ripetuta in verticale, alternandola
// con la sua copia capovolta, così le giunture combaciano senza stacchi: lo sfondo riempie
// tutto lo schermo del telefono e resta nitido (nessun ingrandimento).
import sharp from "sharp";

const SOURCE = "public/art/hero-bg.webp";
const OUT = "public/art/hero-bg-mobile.webp";
const W = 1170;
const REPEAT = 3;

async function build() {
  const art = await sharp(SOURCE).resize({ width: W }).toBuffer();
  const h = (await sharp(art).metadata()).height ?? 0;
  const flipped = await sharp(art).flip().toBuffer();

  await sharp({ create: { width: W, height: h * REPEAT, channels: 3, background: "#f4f4f4" } })
    .composite(Array.from({ length: REPEAT }, (_, i) => ({ input: i % 2 ? flipped : art, top: i * h, left: 0 })))
    .webp({ quality: 88 })
    .toFile(OUT);

  console.log(`Sfondo per telefono generato: ${OUT} (${W}x${h * REPEAT})`);
}

build();
