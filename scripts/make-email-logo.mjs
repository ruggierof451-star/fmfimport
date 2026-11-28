// Logo per l'intestazione delle email: il logo bianco su una barra nera "incorporata"
// nell'immagine stessa. Così il logo si vede anche nei client di posta che rimuovono gli
// sfondi colorati (dove un logo bianco su sfondo trasparente diventerebbe invisibile).
// Rilanciare con `node scripts/make-email-logo.mjs` se il logo cambia.
import sharp from "sharp";

const W = 560;
const H = 104;
const LOGO_W = 190;

const logo = await sharp("public/fmf-cards-logo-white.png").resize({ width: LOGO_W }).toBuffer();
const logoH = (await sharp(logo).metadata()).height ?? 0;

await sharp({ create: { width: W, height: H, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite([{ input: logo, top: Math.round((H - logoH) / 2), left: Math.round((W - LOGO_W) / 2) }])
  .png()
  .toFile("public/fmf-email-logo.png");

console.log("Creato public/fmf-email-logo.png", `${W}x${H}`);
