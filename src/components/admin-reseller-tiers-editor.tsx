"use client";

/**
 * Editor degli scaglioni di prezzo per i rivenditori approvati (uguali per tutti i
 * rivenditori): "da N pezzi in su → prezzo unitario". Sotto il primo scaglione vale il
 * prezzo rivenditore base del prodotto.
 */

export interface TierDraft {
  key: string;
  minQty: string;
  priceEuro: string;
}

let keySeq = 0;
function newKey() {
  keySeq += 1;
  return `t${Date.now().toString(36)}${keySeq}`;
}

export function tierDraftsFrom(tiers: { minQty: number; priceCents: number }[]): TierDraft[] {
  return [...tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .map((t) => ({ key: newKey(), minQty: String(t.minQty), priceEuro: (t.priceCents / 100).toFixed(2) }));
}

/** Converte le bozze nel formato dell'azione server; restituisce un errore leggibile se qualcosa non va. */
export function tiersPayload(
  drafts: TierDraft[]
): { ok: true; tiers: { minQty: number; priceCents: number }[] } | { ok: false; error: string } {
  const out: { minQty: number; priceCents: number }[] = [];
  for (const [i, d] of drafts.entries()) {
    const qtyText = d.minQty.trim();
    const priceText = d.priceEuro.trim().replace(",", ".");
    if (!qtyText && !priceText) continue; // riga lasciata vuota: si ignora
    const minQty = Number(qtyText);
    if (!Number.isInteger(minQty) || minQty < 1) return { ok: false, error: `Scaglione ${i + 1}: la quantità minima deve essere un numero intero da 1 in su.` };
    const price = Number(priceText);
    if (!priceText || !Number.isFinite(price) || price < 0) {
      return { ok: false, error: `Scaglione da ${minQty} pz: inserisci un prezzo valido (es. 68.00).` };
    }
    if (out.some((t) => t.minQty === minQty)) return { ok: false, error: `Due scaglioni partono entrambi da ${minQty} pezzi.` };
    out.push({ minQty, priceCents: Math.round(price * 100) });
  }
  return { ok: true, tiers: out.sort((a, b) => a.minQty - b.minQty) };
}

export function AdminResellerTiersEditor({ value, onChange }: { value: TierDraft[]; onChange: (next: TierDraft[]) => void }) {
  function update(key: string, patch: Partial<TierDraft>) {
    onChange(value.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 14 }}>Prezzi rivenditore per quantità (opzionale)</b>
        <span className="muted" style={{ fontSize: 13 }}>
          Validi per tutti i rivenditori approvati. Esempio: da 6 pz → 68,00 €, da 12 pz → 64,00 €. Sotto il primo
          scaglione si applica il prezzo rivenditore qui sopra (o quello pubblico se vuoto).
        </span>
      </div>

      {value.map((t, i) => (
        <div key={t.key} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="fl" style={{ flex: "1 1 110px" }}>
            Da quanti pezzi
            <input className="in" inputMode="numeric" value={t.minQty} onChange={(e) => update(t.key, { minQty: e.target.value })} placeholder="es. 6" />
          </label>
          <label className="fl" style={{ flex: "1 1 130px" }}>
            Prezzo cad. (€, IVA incl.)
            <input className="in" inputMode="decimal" value={t.priceEuro} onChange={(e) => update(t.key, { priceEuro: e.target.value })} placeholder="es. 68.00" />
          </label>
          <button
            type="button"
            className="btn btn-line btn-sm"
            style={{ marginBottom: 2 }}
            aria-label={`Rimuovi scaglione ${i + 1}`}
            onClick={() => onChange(value.filter((x) => x.key !== t.key))}
          >
            Rimuovi
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-line btn-sm"
        style={{ alignSelf: "flex-start" }}
        onClick={() => onChange([...value, { key: newKey(), minQty: "", priceEuro: "" }])}
      >
        + Aggiungi scaglione
      </button>
    </div>
  );
}
