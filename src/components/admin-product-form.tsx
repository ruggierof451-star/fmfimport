"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductAction, deleteProductAction } from "@/lib/admin-actions";
import type { Product } from "@/generated/prisma";

const CATEGORY_OPTIONS = [
  { value: "pokemon-jp", label: "Pokémon Giapponese" },
  { value: "pokemon-cn", label: "Pokémon Cinese" },
  { value: "pokemon-kr", label: "Pokémon Coreano" },
  { value: "one-piece-jp", label: "One Piece Giapponese" },
  { value: "one-piece-cn", label: "One Piece Cinese" },
];

export function AdminProductForm({ product }: { product: Product }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [productSetName, setProductSetName] = useState(product.setName);
  const [type, setType] = useState(product.type);
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [isNew, setIsNew] = useState(product.isNew);
  const [isPreorder, setIsPreorder] = useState(product.isPreorder);
  const [supplierCode, setSupplierCode] = useState(product.supplierCode ?? "");
  const [costEuro, setCostEuro] = useState(product.supplierCostCents != null ? (product.supplierCostCents / 100).toFixed(2) : "");
  const [costVatTreatment, setCostVatTreatment] = useState(product.costVatTreatment);
  const [costIsEstimated, setCostIsEstimated] = useState(product.costIsEstimated);
  const [vatRate, setVatRate] = useState((product.vatRateBps / 100).toString());
  const [stockQty, setStockQty] = useState(product.stockQty != null ? String(product.stockQty) : "");
  const [published, setPublished] = useState(product.published);
  const [matchStatus, setMatchStatus] = useState(product.matchStatus);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const CATEGORY_TO_GAME_LANG: Record<string, { game: "POKEMON" | "ONE_PIECE"; language: "JP" | "CN" | "KR" }> = {
    "pokemon-jp": { game: "POKEMON", language: "JP" },
    "pokemon-cn": { game: "POKEMON", language: "CN" },
    "pokemon-kr": { game: "POKEMON", language: "KR" },
    "one-piece-jp": { game: "ONE_PIECE", language: "JP" },
    "one-piece-cn": { game: "ONE_PIECE", language: "CN" },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { game, language } = CATEGORY_TO_GAME_LANG[category] ?? CATEGORY_TO_GAME_LANG["pokemon-jp"];
    const result = await updateProductAction({
      id: product.id,
      name,
      category: category as "pokemon-jp" | "pokemon-cn" | "pokemon-kr" | "one-piece-jp" | "one-piece-cn",
      game,
      language,
      setName: productSetName,
      type,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
      description: description.trim() === "" ? null : description,
      isNew,
      isPreorder,
      supplierCode: supplierCode || undefined,
      supplierCostCents: costEuro.trim() === "" ? null : Math.round(parseFloat(costEuro.replace(",", ".")) * 100),
      costVatTreatment,
      costIsEstimated,
      vatRateBps: Math.round(parseFloat(vatRate.replace(",", ".")) * 100),
      stockQty: stockQty.trim() === "" ? null : parseInt(stockQty, 10),
      published,
      matchStatus,
    });
    setSaving(false);
    if (result.ok) {
      setMessage("Salvato.");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore durante il salvataggio.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare definitivamente "${name}"? L'operazione non è reversibile.`)) return;
    setDeleting(true);
    setMessage("");
    const result = await deleteProductAction({ id: product.id });
    if (result.ok) {
      router.push("/admin/prodotti");
    } else {
      setDeleting(false);
      setMessage(result.error ?? "Errore durante l'eliminazione.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
      {message ? <div className={`alert ${message === "Salvato." ? "ok" : "err"}`}>{message}</div> : null}

      <label className="fl">
        Nome prodotto
        <input className="in" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="fl">
        Categoria
        <select className="in" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="fl">
        Nome set
        <input className="in" value={productSetName} onChange={(e) => setProductSetName(e.target.value)} />
      </label>

      <label className="fl">
        Tipo (es. Booster box, Display, Tin…)
        <input className="in" value={type} onChange={(e) => setType(e.target.value)} />
      </label>

      <label className="fl">
        URL immagine (es. /products/nome-file.webp)
        <input className="in" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="vuoto = immagine generata automaticamente" />
      </label>

      <label className="fl">
        Descrizione (HTML consentito)
        <textarea className="in" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="check">
        <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} />
        Mostra come novità in homepage
      </label>

      <label className="check">
        <input type="checkbox" checked={isPreorder} onChange={(e) => setIsPreorder(e.target.checked)} />
        Preordine
      </label>

      <hr style={{ border: "none", borderTop: "1px solid #2A2A2A", margin: "4px 0" }} />

      <label className="fl">
        Codice fornitore
        <input className="in" value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} />
      </label>

      <label className="fl">
        Costo fornitore (€)
        <input className="in" value={costEuro} onChange={(e) => setCostEuro(e.target.value)} placeholder="es. 72.00" />
      </label>

      <label className="fl">
        Trattamento IVA del costo
        <select className="in" value={costVatTreatment} onChange={(e) => setCostVatTreatment(e.target.value as typeof costVatTreatment)}>
          <option value="NET_OF_VAT">Netto IVA (il costo NON include IVA)</option>
          <option value="GROSS_WITH_VAT">Lordo (il costo include già IVA)</option>
        </select>
      </label>

      <label className="check">
        <input type="checkbox" checked={costIsEstimated} onChange={(e) => setCostIsEstimated(e.target.checked)} />
        Costo stimato (non verificato con il fornitore) — mostra &quot;indicativo&quot; ai clienti
      </label>

      <label className="fl">
        Aliquota IVA (%)
        <input className="in" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
      </label>

      <label className="fl">
        Quantità in stock (vuoto = non tracciata)
        <input className="in" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="es. 12, oppure vuoto" />
      </label>

      <label className="fl">
        Stato abbinamento fornitore
        <select className="in" value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as typeof matchStatus)}>
          <option value="UNMATCHED">Non abbinato</option>
          <option value="NEEDS_REVIEW">Da rivedere (ambiguo)</option>
          <option value="MATCHED">Abbinato (automatico)</option>
          <option value="MANUAL">Abbinato manualmente</option>
        </select>
      </label>

      <label className="check">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Pubblicato (visibile ai clienti)
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
          {saving ? "Salvataggio…" : "Salva modifiche"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-sm"
          style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
        >
          {deleting ? "Eliminazione…" : "Elimina prodotto"}
        </button>
      </div>
    </form>
  );
}
