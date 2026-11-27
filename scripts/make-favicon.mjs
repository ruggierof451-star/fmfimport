// Genera le icone del sito (scheda del browser, Google, iPhone): una F maiuscola oro su
// fondo nero. Rilanciare con `node scripts/make-favicon.mjs` se si cambia il disegno.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const svg = (size, radius) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F2DA8C"/><stop offset=".5" stop-color="#C9A646"/><stop offset="1" stop-color="#8E6B1E"/>
  </linearGradient></defs>
  <rect width="100" height="100" rx="${radius}" fill="#000"/>
  <path d="M30 18h46v15H47v11h25v15H47v23H30z" fill="url(#g)"/>
</svg>`);

const png = (size, radius = 0) => sharp(svg(size, radius)).png().toBuffer();

writeFileSync("src/app/icon.png", await png(512));
writeFileSync("src/app/apple-icon.png", await png(180));

// favicon.ico con dentro i PNG 16, 32, 48 e 64
const sizes = [16, 32, 48, 64];
const images = await Promise.all(sizes.map((s) => png(s)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...images]));
console.log("Icone generate: icon.png, apple-icon.png, favicon.ico");
