import { describe, expect, it } from "vitest";
import {
  addOpenPixel,
  ensureUnsubscribe,
  estimatedDays,
  injectPreheader,
  isFullDocument,
  marketingBudget,
  personalize,
  rewriteLinks,
  signClick,
  verifyClick,
} from "./marketing-render";

const FOOTER = '<p class="f"><a href="{{disiscrizione}}">Disiscriviti</a></p>';

describe("preparazione email di marketing", () => {
  it("riconosce un documento HTML completo (es. copiato da Claude Design)", () => {
    expect(isFullDocument("<!doctype html><html><body>ciao</body></html>")).toBe(true);
    expect(isFullDocument("<h1>Titolo</h1><p>testo</p>")).toBe(false);
  });

  it("personalizza nome ed email senza permettere HTML nei dati", () => {
    expect(personalize("Ciao {{nome}}, scrivi a {{ email }}", { firstName: "Mario", email: "m@x.it" })).toBe("Ciao Mario, scrivi a m@x.it");
    expect(personalize("Ciao {{nome}}", { firstName: "<b>x</b>", email: "a@b.c" })).toBe("Ciao &lt;b&gt;x&lt;/b&gt;");
    expect(personalize("Ciao {{nome}}!", { firstName: null, email: "a@b.c" })).toBe("Ciao !");
    expect(personalize("Ciao {{nome|collezionista}}!", { firstName: null, email: "a@b.c" })).toBe("Ciao collezionista!");
    expect(personalize("Ciao {{ nome | collezionista }}!", { firstName: "Anna", email: "a@b.c" })).toBe("Ciao Anna!");
  });

  it("usa {{disiscrizione}} se c'è, altrimenti aggiunge il piè di pagina prima di </body>", () => {
    expect(ensureUnsubscribe('<a href="{{disiscrizione}}">esci</a>', "https://x/u/1", FOOTER)).toBe('<a href="https://x/u/1">esci</a>');
    expect(ensureUnsubscribe("<html><body><p>hi</p></body></html>", "https://x/u/1", FOOTER)).toBe(
      '<html><body><p>hi</p><p class="f"><a href="https://x/u/1">Disiscriviti</a></p></body></html>'
    );
    // chiamato due volte di fila (regex globale) deve comportarsi uguale
    expect(ensureUnsubscribe("{{disiscrizione}}", "U", FOOTER)).toBe("U");
    expect(ensureUnsubscribe("{{disiscrizione}}", "U", FOOTER)).toBe("U");
  });

  it("aggiunge il testo di anteprima subito dopo <body>", () => {
    const out = injectPreheader('<html><body class="a"><p>x</p></body></html>', "Novità One Piece");
    expect(out.startsWith('<html><body class="a"><div style="display:none')).toBe(true);
    expect(out).toContain("Novità One Piece");
    expect(injectPreheader("<p>x</p>", null)).toBe("<p>x</p>");
  });

  it("traccia i link http(s) ma non disiscrizione, mailto e tel", () => {
    const html =
      '<a href="https://www.fmfcards.com/novita?a=1&amp;b=2">Vai</a> <a href=\'http://x.it\'>x</a> <a href="mailto:a@b.c">m</a> <a href="https://www.fmfcards.com/newsletter/disiscrizione/1">u</a>';
    const out = rewriteLinks(html, (u) => `https://t/c?u=${encodeURIComponent(u)}&s=1`, (u) => u.includes("/disiscrizione/"));
    expect(out).toContain('href="https://t/c?u=https%3A%2F%2Fwww.fmfcards.com%2Fnovita%3Fa%3D1%26b%3D2&amp;s=1"');
    expect(out).toContain("href='https://t/c?u=http%3A%2F%2Fx.it&amp;s=1'");
    expect(out).toContain('href="mailto:a@b.c"');
    expect(out).toContain('href="https://www.fmfcards.com/newsletter/disiscrizione/1"');
  });

  it("firma dei link: valida solo per lo stesso invio e lo stesso indirizzo", () => {
    const sig = signClick("segreto", "send1", "https://a.it");
    expect(verifyClick("segreto", "send1", "https://a.it", sig)).toBe(true);
    expect(verifyClick("segreto", "send1", "https://malevolo.it", sig)).toBe(false);
    expect(verifyClick("segreto", "send2", "https://a.it", sig)).toBe(false);
  });

  it("aggiunge il pixel delle aperture prima di </body>", () => {
    expect(addOpenPixel("<body>x</body>", "https://t/o.gif")).toMatch(/^<body>x<img src="https:\/\/t\/o\.gif"[^>]*\/><\/body>$/);
  });

  it("budget giornaliero: 100 totali, 30 riservate agli ordini", () => {
    expect(marketingBudget({ dailyLimit: 100, reservedForOrders: 30, sentLast24h: 0 })).toBe(70);
    expect(marketingBudget({ dailyLimit: 100, reservedForOrders: 30, sentLast24h: 65 })).toBe(5);
    expect(marketingBudget({ dailyLimit: 100, reservedForOrders: 30, sentLast24h: 90 })).toBe(0);
    expect(estimatedDays(250, 70)).toBe(4);
    expect(estimatedDays(0, 70)).toBe(0);
  });
});
