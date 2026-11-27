"use client";

/**
 * Editor delle varianti di un prodotto nel pannello admin (es. box "Rivali Predestinati"
 * → "Busta singola" a 6,90 €). Ogni variante ha solo nome e prezzo pubblico IVA inclusa;
 * il prodotto principale resta acquistabile con il suo prezzo.
 */

export interface VariantDraft {
  key: string;
  id?: string;
  name: string;
  priceEuro: string;
}

let keySeq = 0;
function newKey() {
  keySeq += 1;
  return `v${Date.now().toString(36)}${keySeq}`;
}

export function variantDraftsFrom(variants: { id: string; name: string; priceCents: number }[]): VariantDraft[] {
  return variants.map((v) => ({ key: v.id, id: v.id, name: v.name, priceEuro: (v.priceCents / 100).toFixed(2) }));
}

/** Converte le bozze nel formato dell'azione server; restituisce un errore leggibile se qualcosa non va. */
export function variantsPayload(
  drafts: VariantDraft[]
): { ok: true; variants: { id?: string; name: string; priceCents: number }[] } | { ok: false; error: string } {
  const out: { id?: string; name: string; priceCents: number }[] = [];
  for (const [i, d] of drafts.entries()) {
    const name = d.name.trim();
    const priceText = d.priceEuro.trim().replace(",", ".");
    if (!name && !priceText) continue; // riga lasciata vuota: si ignora
    if (!name) return { ok: false, error: `Variante ${i + 1}: manca il nome.` };
    const price = Number(priceText);
    if (!priceText || !Number.isFinite(price) || price < 0) {
      return { ok: false, error: `Variante "${name}": inserisci un prezzo valido (es. 6.90).` };
    }
    out.push({ id: d.id, name, priceCents: Math.round(price * 100) });
  }
  return { ok: true, variants: out };
}

export function AdminVariantsEditor({
  value,
  onChange,
  mainLabel,
}: {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
  /** Come si chiama l'opzione principale sul sito (il tipo del prodotto, es. "Booster box"). */
  mainLabel: string;
}) {
  function update(key: string, patch: Partial<VariantDraft>) {
    onChange(value.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 14 }}>Varianti (opzionale)</b>
        <span className="muted" style={{ fontSize: 13 }}>
          Altri formati acquistabili dalla stessa scheda, es. &quot;Busta singola&quot;. Sul sito il cliente sceglie tra{" "}
          <b>{mainLabel || "il prodotto"}</b> (con il prezzo qui sopra) e le varianti. Ogni variante ha il suo prezzo pubblico IVA
          inclusa; non ha magazzino proprio né prezzo rivenditore.
        </span>
      </div>

      {value.map((v, i) => (
        <div key={v.key} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="fl" style={{ flex: "2 1 200px" }}>
            Nome variante {i + 1}
            <input className="in" value={v.name} onChange={(e) => update(v.key, { name: e.target.value })} placeholder="es. Busta singola" />
          </label>
          <label className="fl" style={{ flex: "1 1 110px" }}>
            Prezzo (€, IVA incl.)
            <input
              className="in"
              inputMode="decimal"
              value={v.priceEuro}
              onChange={(e) => update(v.key, { priceEuro: e.target.value })}
              placeholder="es. 6.90"
            />
          </label>
          <button
            type="button"
            className="btn btn-line btn-sm"
            style={{ marginBottom: 2 }}
            aria-label={`Rimuovi variante ${i + 1}`}
            onClick={() => onChange(value.filter((x) => x.key !== v.key))}
          >
            Rimuovi
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-line btn-sm"
        style={{ alignSelf: "flex-start" }}
        onClick={() => onChange([...value, { key: newKey(), name: "", priceEuro: "" }])}
      >
        + Aggiungi variante
      </button>
    </div>
  );
}
