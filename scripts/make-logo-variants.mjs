// Genera le varianti del logo usate dal sito, a partire da public/fmf-cards-logo.png.
// Rilanciare con `node scripts/make-logo-variants.mjs` se il logo originale cambia.
//
// L'originale è oro su nero, dentro una doppia cornice. Sul sito l'oro stona e la
// cornice fa "targa", quindi qui si tiene solo la scritta e la si ricolora:
//
//   fmf-cards-logo-black.png  scritta nera, sfondo trasparente  → fondi chiari
//                                                                 (intestazione, footer)
//   fmf-cards-logo-white.png  scritta bianca, sfondo trasparente → fondi scuri
//                                                                 (barra admin, email)
//   fmf-cards-logo-google.png scritta nera su bianco             → dati strutturati per
//                                                                 Google (vuole un'immagine
//                                                                 con sfondo pieno)
import sharp from "sharp";

const SOURCE = "public/fmf-cards-logo.png";
const TOLERANCE = 26; // scarto ammesso dal colore di sfondo per considerarlo "sfondo"
const OPACO = 40; // soglia di alpha per dire che un pixel è disegno e non vuoto
const PIENA = 0.8; // una riga/colonna così piena di disegno è una linea della cornice

/** Toglie lo sfondo (qualunque colore sia) rendendolo trasparente. */
async function senzaSfondo() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2] };
  for (let p = 0; p < info.width * info.height; p++) {
    const i = p * 4;
    if (
      Math.abs(data[i] - bg.r) <= TOLERANCE &&
      Math.abs(data[i + 1] - bg.g) <= TOLERANCE &&
      Math.abs(data[i + 2] - bg.b) <= TOLERANCE
    ) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
}

/**
 * Ritaglia via la cornice. Le linee della cornice sono righe/colonne quasi interamente
 * coperte di disegno: si cerca l'ultima in alto/a sinistra e la prima in basso/a destra,
 * e si taglia appena dentro. Così funziona anche se lo spessore della cornice cambia.
 */
async function senzaCornice(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const pienaRiga = (y) => {
    let n = 0;
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > OPACO) n++;
    return n / w >= PIENA;
  };
  const pienaCol = (x) => {
    let n = 0;
    for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > OPACO) n++;
    return n / h >= PIENA;
  };

  let top = 0;
  for (let y = 0; y < h / 2; y++) if (pienaRiga(y)) top = y + 1;
  let bottom = h - 1;
  for (let y = h - 1; y > h / 2; y--) if (pienaRiga(y)) bottom = y - 1;
  let left = 0;
  for (let x = 0; x < w / 2; x++) if (pienaCol(x)) left = x + 1;
  let right = w - 1;
  for (let x = w - 1; x > w / 2; x--) if (pienaCol(x)) right = x - 1;

  const margine = 3; // un filo in più, per non lasciare residui della linea
  const l = Math.min(left + margine, w - 1);
  const t = Math.min(top + margine, h - 1);
  return sharp(input)
    .extract({ left: l, top: t, width: Math.max(1, right - margine - l), height: Math.max(1, bottom - margine - t) })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
}

/** Ricolora il disegno con un colore pieno, conservando i bordi morbidi (alpha). */
async function ricolora(input, { r, g, b }) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let p = 0; p < info.width * info.height; p++) {
    const i = p * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function build() {
  const scritta = await senzaCornice(await senzaSfondo());

  const nero = await sharp(await ricolora(scritta, { r: 17, g: 17, b: 17 }))
    .resize({ width: 720, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(nero).toFile("public/fmf-cards-logo-black.png");

  await sharp(await ricolora(scritta, { r: 255, g: 255, b: 255 }))
    .resize({ width: 720, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile("public/fmf-cards-logo-white.png");

  // Per Google serve un'immagine con sfondo pieno, non trasparente.
  const { width, height } = await sharp(nero).metadata();
  await sharp({ create: { width: width ?? 720, height: height ?? 300, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: nero }])
    .png({ compressionLevel: 9 })
    .toFile("public/fmf-cards-logo-google.png");

  console.log(`Varianti generate. Scritta senza cornice: ${width}x${height}px.`);
}

build();
