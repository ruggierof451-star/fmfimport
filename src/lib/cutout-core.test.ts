import { describe, expect, it } from "vitest";
import { cutoutRgbaInPlace } from "./cutout-core";

/** Immagine di prova: sfondo bianco con un quadrato colorato al centro. */
function whiteWithColoredSquare(size: number, square: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  const from = Math.floor((size - square) / 2);
  for (let y = from; y < from + square; y++) {
    for (let x = from; x < from + square; x++) {
      const i = (y * size + x) * 4;
      data[i] = 200;
      data[i + 1] = 20;
      data[i + 2] = 20;
      data[i + 3] = 255;
    }
  }
  return data;
}

const alphaAt = (data: Uint8ClampedArray, size: number, x: number, y: number) => data[(y * size + x) * 4 + 3];

describe("cutoutRgbaInPlace", () => {
  const SIZE = 40;
  const SQUARE = 16;

  it("rende trasparente lo sfondo e lascia opaco il prodotto", () => {
    const data = whiteWithColoredSquare(SIZE, SQUARE);
    cutoutRgbaInPlace(data, SIZE, SIZE);

    expect(alphaAt(data, SIZE, 0, 0)).toBe(0); // angolo: sfondo
    expect(alphaAt(data, SIZE, SIZE / 2, SIZE / 2)).toBe(255); // centro: prodotto
  });

  it("non tocca i colori, solo la trasparenza", () => {
    const data = whiteWithColoredSquare(SIZE, SQUARE);
    cutoutRgbaInPlace(data, SIZE, SIZE);

    const i = ((SIZE / 2) * SIZE + SIZE / 2) * 4;
    expect([data[i], data[i + 1], data[i + 2]]).toEqual([200, 20, 20]);
  });

  it("non buca le zone chiare dentro il prodotto (es. scritte bianche su una carta)", () => {
    const data = whiteWithColoredSquare(SIZE, SQUARE);
    // pixel bianco isolato al centro del quadrato: chiaro, ma non collegato allo sfondo
    const cx = SIZE / 2;
    const i = (cx * SIZE + cx) * 4;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;

    cutoutRgbaInPlace(data, SIZE, SIZE);
    expect(alphaAt(data, SIZE, cx, cx)).toBe(255);
  });

  it("lascia tutto opaco se non c'è sfondo chiaro ai bordi", () => {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let p = 0; p < SIZE * SIZE; p++) {
      data[p * 4] = 10;
      data[p * 4 + 1] = 90;
      data[p * 4 + 2] = 160;
      data[p * 4 + 3] = 255;
    }
    cutoutRgbaInPlace(data, SIZE, SIZE);
    expect(alphaAt(data, SIZE, 0, 0)).toBe(255);
  });

  it("non esplode su un'immagine vuota", () => {
    expect(() => cutoutRgbaInPlace(new Uint8ClampedArray(0), 0, 0)).not.toThrow();
  });
});
