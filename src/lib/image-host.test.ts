import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isOptimizableImage } from "./image-host";

describe("isOptimizableImage", () => {
  it("ottimizza le foto caricate dall'admin (servite dal sito dal database)", () => {
    expect(isOptimizableImage("/immagini/cm123abc")).toBe(true);
  });

  it("ottimizza le altre immagini locali del sito", () => {
    expect(isOptimizableImage("/products-cutout/booster-box.webp")).toBe(true);
    expect(isOptimizableImage("/fmf-cards-logo-cropped.png")).toBe(true);
  });

  it("non ottimizza un indirizzo incollato da un altro sito (dominio non autorizzabile in anticipo)", () => {
    expect(isOptimizableImage("https://esempio.it/foto.jpg")).toBe(false);
    expect(isOptimizableImage("http://esempio.it/foto.jpg")).toBe(false);
  });

  it("resta coerente con next.config: nessun dominio esterno è autorizzato lì", () => {
    const config = fs.readFileSync("next.config.ts", "utf8");
    expect(config.includes("remotePatterns")).toBe(false);
  });
});
