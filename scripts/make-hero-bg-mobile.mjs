// Genera lo sfondo della home per i telefoni a partire da quello desktop.
// Rilanciare con `node scripts/make-hero-bg-mobile.mjs` se l'illustrazione cambia.
//
// Perché serve: l'originale è orizzontale (1672x941). Su uno schermo verticale, con
// background-size:cover, se ne vede solo una fascia centrale larga circa un quarto —
// Luffy e Pikachu restano fuori — e il telefono scarica comunque l'immagine intera.
// Qui l'illustrazione viene messa su una tela verticale 900x1600, a tutta larghezza e
// in alto (dove sta il contenuto principale), con il resto nella stessa tinta della
// carta e una sfumatura che nasconde il bordo inferiore.
import sharp from "sharp";

const SOURCE = "public/art/hero-bg.webp";
const OUT = "public/art/hero-bg-mobile.webp";
const W = 900;
const H = 1600;
const PAPER = { r: 244, g: 244, b: 244 }; // tinta di fondo misurata sull'illustrazione
const FADE = 220; // altezza della sfumatura verso il fondo, in pixel

async function build() {
  const art = await sharp(SOURCE).resize({ width: W }).toBuffer();
  const artHeight = (await sharp(art).metadata()).height ?? 0;

  // Sfumatura: dall'illustrazione (trasparente) alla tinta della carta (opaca).
  const fade = Buffer.alloc(W * FADE * 4);
  for (let y = 0; y < FADE; y++) {
    const alpha = Math.round((y / (FADE - 1)) * 255);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      fade[i] = PAPER.r;
      fade[i + 1] = PAPER.g;
      fade[i + 2] = PAPER.b;
      fade[i + 3] = alpha;
    }
  }

  await sharp({ create: { width: W, height: H, channels: 3, background: PAPER } })
    .composite([
      { input: art, top: 0, left: 0 },
      { input: fade, raw: { width: W, height: FADE, channels: 4 }, top: Math.max(0, artHeight - FADE), left: 0 },
    ])
    .webp({ quality: 72 })
    .toFile(OUT);

  console.log(`Sfondo per telefono generato: ${OUT} (${W}x${H}, illustrazione alta ${artHeight}px)`);
}

build();
