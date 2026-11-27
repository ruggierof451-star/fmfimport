import { describe, expect, it } from "vitest";
import { displayImageUrl, isPrivateBlobUrl } from "./blob-image";

describe("displayImageUrl", () => {
  it("serve le foto private dal sito, senza il permesso temporaneo", () => {
    const u =
      "https://abc123.private.blob.vercel-storage.com/foto%20prodott/one-piece.webp?vercel-blob-delegation=xyz.abc&vercel-blob-signature=s";
    expect(isPrivateBlobUrl(u)).toBe(true);
    expect(displayImageUrl(u)).toBe("/img/foto%20prodott/one-piece.webp");
  });
  it("lascia stare foto pubbliche, locali e di altri siti", () => {
    expect(displayImageUrl("https://abc.public.blob.vercel-storage.com/products/a.webp")).toBe(
      "https://abc.public.blob.vercel-storage.com/products/a.webp"
    );
    expect(displayImageUrl("/products/a.png")).toBe("/products/a.png");
    expect(displayImageUrl("https://esempio.it/a.jpg")).toBe("https://esempio.it/a.jpg");
  });
});
