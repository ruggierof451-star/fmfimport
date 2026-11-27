/**
 * Ritaglio dello sfondo studio da una foto prodotto, su pixel grezzi RGBA.
 *
 * Volutamente senza dipendenze (niente sharp, niente canvas, niente filesystem): gli
 * stessi identici pixel vengono calcolati sul server (sharp) e nel browser (canvas),
 * così la foto ritagliata è la stessa ovunque la si prepari.
 *
 * Tecnica: flood-fill dai bordi dell'immagine attraverso i pixel "chiari e poco saturi"
 * (sfondo bianco/grigio chiaro, comprese le ombre morbide verso il prodotto), poi una
 * sfocatura leggera del solo canale alpha per bordi lisci. La connettività del
 * flood-fill, a differenza di una soglia di colore globale, evita di bucare le zone
 * chiare DENTRO il prodotto (es. scritte bianche su una carta): quelle non sono
 * collegate allo sfondo esterno.
 */

const BRIGHTNESS_MIN = 200;
const SATURATION_MAX = 35;
const BLUR_RADIUS = 2;

/** Modifica in place il canale alpha di `data` (RGBA, 4 byte per pixel). */
export function cutoutRgbaInPlace(data: Uint8Array | Uint8ClampedArray, width: number, height: number): void {
  const total = width * height;
  if (total === 0) return;

  const isBg = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qTail = 0;

  const looksLikeBackground = (p: number): boolean => {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= BRIGHTNESS_MIN && max - min < SATURATION_MAX;
  };

  const trySeed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (looksLikeBackground(p)) {
      visited[p] = 1;
      isBg[p] = 1;
      queue[qTail++] = p;
    }
  };

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

  // Sfocatura del solo alpha: bordi morbidi invece di una scalettatura netta.
  const alpha = new Float32Array(total);
  for (let p = 0; p < total; p++) alpha[p] = isBg[p] ? 0 : 255;

  const blurred = new Float32Array(total);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -BLUR_RADIUS; dy <= BLUR_RADIUS; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -BLUR_RADIUS; dx <= BLUR_RADIUS; dx++) {
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
    const i = p * 4 + 3;
    data[i] = Math.min(data[i], Math.round(blurred[p]));
  }
}
