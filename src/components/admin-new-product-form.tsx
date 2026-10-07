"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "@/lib/admin-actions";

const CATEGORY_OPTIONS = [
  { value: "pokemon-jp", label: "Pokémon Giapponese" },
  { value: "pokemon-cn", label: "Pokémon Cinese" },
  { value: "pokemon-kr", label: "Pokémon Coreano" },
  { value: "one-piece-jp", label: "One Piece Giapponese" },
  { value: "one-piece-cn", label: "One Piece Cinese" },
];

export function AdminNewProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("pokemon-jp");
  const [productSetName, setProductSetName] = useState("");
  const [type, setType] = useState("Booster box");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [costEuro, setCostEuro] = useState("");
  const [vatRate, setVatRate] = useState("22");
  const [stockQty, setStockQty] = useState("");
  const [published, setPublished] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !productSetName.trim() || !type.trim()) {
      setMessage("Nome, nome set e tipo sono obbligatori.");
      return;
    }
    setSaving(true);
    setMessage("");
    const result = await createProductAction({
      name: name.trim(),
      category: category as "pokemon-jp" | "pokemon-cn" | "pokemon-kr" | "one-piece-jp" | "one-piece-cn",
      setName: productSetName.trim(),
      type: type.trim(),
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
      description: description.trim() === "" ? null : description,
      supplierCostCents: costEuro.trim() === "" ? null : Math.round(parseFloat(costEuro.replace(",", ".")) * 100),
      vatRateBps: Math.round(parseFloat(vatRate.replace(",", ".") || "0") * 100),
      stockQty: stockQty.trim() === "" ? null : parseInt(stockQty, 10),
      published,
      isNew,
    });
    setSaving(false);
    if (result.ok && result.id) {
      router.push(`/admin/prodotti/${result.id}`);
    } else {
      setMessage(result.error ?? "Errore durante la creazione.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
      {message ? <div className="alert err">{message}</div> : null}

      <label className="fl">
        Nome prodotto *
        <input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Scarlet &amp; Violet Booster Box" />
      </label>

      <label className="fl">
        Categoria *
        <select className="in" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="fl">
        Nome set *
        <input className="in" value={productSetName} onChange={(e) => setProductSetName(e.target.value)} placeholder="es. Scarlet &amp; Violet" />
      </label>

      <label className="fl">
        Tipo *
        <input className="in" value={type} onChange={(e) => setType(e.target.value)} placeholder="es. Booster box, Display, Tin…" />
      </label>

      <label className="fl">
        URL immagine
        <input className="in" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="vuoto = immagine generata automaticamente" />
      </label>

      <label className="fl">
        Descrizione (HTML consentito)
        <textarea className="in" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="fl">
        Costo fornitore (€)
        <input className="in" value={costEuro} onChange={(e) => setCostEuro(e.target.value)} placeholder="es. 72.00 — vuoto = costo da verificare" />
      </label>

      <label className="fl">
        Aliquota IVA (%)
        <input className="in" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
      </label>

      <label className="fl">
        Quantità in stock
        <input className="in" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="es. 12, oppure vuoto" />
      </label>

      <label className="check">
        <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} />
        Mostra come novità in homepage
      </label>

      <label className="check">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Pubblicato (visibile ai clienti)
      </label>

      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Creazione…" : "Crea prodotto"}
      </button>
    </form>
  );
}
