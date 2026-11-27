import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("rimuove script e il loro contenuto", () => {
    expect(sanitizeHtml('ciao<script>alert(1)</script>mondo')).toBe("ciaomondo");
  });
  it("rimuove gli handler on* e gli attributi non ammessi", () => {
    expect(sanitizeHtml('<p onclick="alert(1)" style="x">testo</p>')).toBe("<p>testo</p>");
  });
  it("blocca i link javascript: ma tiene quelli http", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeHtml('<a href="https://esempio.it">x</a>')).toContain('href="https://esempio.it"');
    expect(sanitizeHtml('<a href="https://esempio.it">x</a>')).toContain('rel="nofollow noopener noreferrer"');
  });
  it("mantiene la formattazione sicura", () => {
    expect(sanitizeHtml('<b>grassetto</b> e <ul><li>uno</li></ul>')).toBe("<b>grassetto</b> e <ul><li>uno</li></ul>");
  });
  it("rimuove iframe e tag sconosciuti", () => {
    expect(sanitizeHtml('<iframe src="x"></iframe><custom>y</custom>')).toBe("y");
  });
  it("blocca img con onerror (tag non in lista bianca)", () => {
    expect(sanitizeHtml('<img src=x onerror="alert(1)">')).toBe("");
  });
});
