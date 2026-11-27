import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { absoluteUrl, CANONICAL_ORIGIN, DEFAULT_OG_IMAGE, GOOGLE_LOGO, organizationJsonLd } from "./site";

describe("scheda dell'attività per Google", () => {
  const org = organizationJsonLd() as Record<string, never> & {
    logo: { url: string; width: number; height: number };
    image: string;
  };

  it("include il logo, che è quello che Google mostra accanto al sito", () => {
    expect(org.logo.url).toBe(`${CANONICAL_ORIGIN}${GOOGLE_LOGO.path}`);
    expect(org.image).toBe(org.logo.url);
  });

  it("punta a un file che esiste davvero (se il logo viene rinominato, Google non lo troverebbe)", () => {
    expect(fs.existsSync(path.join(process.cwd(), "public", GOOGLE_LOGO.path))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "public", DEFAULT_OG_IMAGE.url))).toBe(true);
  });

  it("usa indirizzi assoluti sul dominio ufficiale, mai quello tecnico di Vercel", () => {
    expect(org.logo.url.startsWith("https://www.fmfcards.com/")).toBe(true);
    expect(absoluteUrl("/")).toBe(`${CANONICAL_ORIGIN}/`);
  });

  it("dichiara dimensioni del logo sufficienti per Google (almeno 112px di lato)", () => {
    expect(Math.min(GOOGLE_LOGO.width, GOOGLE_LOGO.height)).toBeGreaterThanOrEqual(112);
  });
});
