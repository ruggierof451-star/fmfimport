import { describe, expect, it } from "vitest";
import { isOptimizableImage } from "./image-host";

describe("isOptimizableImage", () => {
  it("ottimizza le immagini locali del sito", () => {
    expect(isOptimizableImage("/products-cutout/booster-box.webp")).toBe(true);
    expect(isOptimizableImage("/products/upload-123.webp")).toBe(true);
  });

  it("ottimizza le foto su Vercel Blob (dove finiscono gli upload dell'admin)", () => {
    expect(isOptimizableImage("https://abc123.public.blob.vercel-storage.com/products/upload-1.webp")).toBe(true);
  });

  it("non ottimizza un indirizzo incollato da un altro sito (dominio non autorizzabile in anticipo)", () => {
    expect(isOptimizableImage("https://esempio.it/foto.jpg")).toBe(false);
  });

  it("non si fa ingannare da un dominio che imita quello di Blob", () => {
    expect(isOptimizableImage("https://public.blob.vercel-storage.com.esempio.it/foto.jpg")).toBe(false);
    expect(isOptimizableImage("https://finto-public-blob-vercel-storage-com.it/foto.jpg")).toBe(false);
  });

  it("non ottimizza un indirizzo non valido", () => {
    expect(isOptimizableImage("https://")).toBe(false);
  });
});
