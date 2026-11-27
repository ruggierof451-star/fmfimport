// Genera le varianti del logo a partire da public/fmf-cards-logo.png.
// Rilanciare con `node scripts/make-logo-variants.mjs` se il logo originale cambia.
//
// - fmf-cards-logo-cropped.png : logo senza margini, sfondo bianco (fondi chiari)
// - fmf-cards-logo-dark.png    : logo senza margini, sfondo trasparente (fondi scuri:
//                                barra admin, intestazione delle email)
import sharp from "sharp";

const SOURCE = "public/fmf-cards-logo.png";
const WHITE_MIN = 236; // oltre questa luminosità il pixel è "carta bianca", non logo

async function build() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // Bianco e grigi chiarissimi diventano trasparenti; l'oro del logo resta.
    if (r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN) data[i + 3] = 0;
  }

  await sharp(data, { raw: { width, height, channels } })
    .trim({ threshold: 1 })
    .resize({ width: 720, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile("public/fmf-cards-logo-dark.png");

  await sharp(SOURCE)
    .trim({ threshold: 10 })
    .resize({ width: 720, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile("public/fmf-cards-logo-cropped.png");

  console.log("Varianti del logo generate.");
}

build();
