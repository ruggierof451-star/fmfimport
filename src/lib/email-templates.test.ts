import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES, escapeHtml, getTemplateDef, sampleValues } from "./email-templates";

function placeholdersUsedIn(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);
}

describe("modelli delle email automatiche", () => {
  it("ha chiavi uniche", () => {
    const keys = EMAIL_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("usa solo segnaposto dichiarati (un refuso lascerebbe {{...}} nell'email reale)", () => {
    for (const def of EMAIL_TEMPLATES) {
      const declared = new Set(def.placeholders.map((p) => p.name));
      const used = new Set([...placeholdersUsedIn(def.defaultSubject), ...placeholdersUsedIn(def.defaultBody)]);
      for (const name of used) {
        expect(declared, `${def.key}: segnaposto {{${name}}} non dichiarato`).toContain(name);
      }
    }
  });

  // Un segnaposto dichiarato ma non usato nel testo predefinito va bene: resta a
  // disposizione dell'admin (es. {{totale}}, che di default sta dentro la tabella).
  it("non dichiara due volte lo stesso segnaposto", () => {
    for (const def of EMAIL_TEMPLATES) {
      const names = def.placeholders.map((p) => p.name);
      expect(new Set(names).size, `${def.key}: segnaposto duplicato`).toBe(names.length);
    }
  });

  it("non mette blocchi HTML nell'oggetto (l'oggetto è testo semplice)", () => {
    for (const def of EMAIL_TEMPLATES) {
      const blockNames = new Set(def.placeholders.filter((p) => p.kind === "block").map((p) => p.name));
      for (const name of placeholdersUsedIn(def.defaultSubject)) {
        expect(blockNames, `${def.key}: l'oggetto usa il blocco {{${name}}}`).not.toContain(name);
      }
    }
  });

  it("fornisce un valore d'esempio per ogni segnaposto, per l'invio di prova", () => {
    for (const def of EMAIL_TEMPLATES) {
      const { text, blocks } = sampleValues(def);
      for (const p of def.placeholders) {
        expect(p.kind === "text" ? text[p.name] : blocks[p.name], `${def.key}/${p.name}`).toBeTruthy();
      }
    }
  });

  it("trova un modello per chiave e nulla per una chiave inventata", () => {
    expect(getTemplateDef("order_confirmation")?.label).toBe("Conferma ordine");
    expect(getTemplateDef("non_esiste")).toBeUndefined();
  });
});

describe("escapeHtml", () => {
  it("neutralizza l'HTML nei dati del cliente", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("lascia intatto un testo normale", () => {
    expect(escapeHtml("Mario Rossi — ordine n. 12")).toBe("Mario Rossi — ordine n. 12");
  });
});
