"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "@/lib/admin-actions";
import { ImageUploadField } from "@/components/image-upload-field";

const CATEGORY_OPTIONS = [
  { value: "pokemon-it", label: "Pokémon Italiano" },
  { value: "pokemon-jp", label: "Pokémon Giapponese" },
  { value: "pokemon-cn", label: "Pokémon Cinese" },
  { value: "pokemon-kr", label: "Pokémon Coreano" },
  { value: "one-piece-jp", label: "One Piece Giapponese" },
  { value: "one-piece-cn", label: "One Piece Cinese" },
];

const PACKAGING_OPTIONS = [
  { value: "SEALED", label: "Con pellicola (sigillato)" },
  { value: "NO_WRAP", label: "Senza pellicola" },
  { value: "DAMAGED", label: "Danneggiato" },
];

const JP_CATEGORIES = new Set(["pokemon-jp", "one-piece-jp"]);

const DEFAULT_TYPES = ["Booster box", "Slim box", "Display", "Tin", "Deck", "Collection", "Promo e pack", "Accessori"];

export function AdminNewProductForm({ existingTypes = [] }: { existingTypes?: string[] }) {
  const router = useRouter();
  const typeOptions = Array.from(new Set([...DEFAULT_TYPES, ...existingTypes])).sort((a, b) => a.localeCompare(b, "it"));
  const [name, setName] = useState("");
  const [category, setCategory] = useState("pokemon-jp");
  const [productSetName, setProductSetName] = useState("");
  const [type, setType] = useState("Booster box");
  const [customType, setCustomType] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuro, setPriceEuro] = useState("");
  const [resellerPriceEuro, setResellerPriceEuro] = useState("");
  const [costEuro, setCostEuro] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [published, setPublished] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [packaging, setPackaging] = useState<"SEALED" | "NO_WRAP" | "DAMAGED">("SEALED");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function toCents(euro: string): number | null {
    return euro.trim() === "" ? null : Math.round(parseFloat(euro.replace(",", ".")) * 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !productSetName.trim() || !type.trim()) {
      setMessage("Nome, nome set e tipo sono obbligatori.");
      return;
    }
    const finalType = type === "__altro__" ? customType.trim() : type;
    if (!finalType) {
      setMessage("Specifica il tipo di prodotto.");
      return;
    }
    setSaving(true);
    setMessage("");
    const result = await createProductAction({
      name: name.trim(),
      category: category as "pokemon-it" | "pokemon-jp" | "pokemon-cn" | "pokemon-kr" | "one-piece-jp" | "one-piece-cn",
      setName: productSetName.trim(),
      type: finalType,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
      description: description.trim() === "" ? null : description,
      priceCents: toCents(priceEuro),
      resellerPriceCents: toCents(resellerPriceEuro),
      supplierCostCents: toCents(costEuro),
      stockQty: stockQty.trim() === "" ? null : parseInt(stockQty, 10),
      published,
      isNew,
      packaging: JP_CATEGORIES.has(category) ? packaging : "SEALED",
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
        <select className="in" value={type} onChange={(e) => setType(e.target.value)}>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="__altro__">Altro…</option>
        </select>
      </label>

      {type === "__altro__" ? (
        <label className="fl">
          Specifica il tipo
          <input className="in" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="es. Scatola regalo" />
        </label>
      ) : null}

      {JP_CATEGORIES.has(category) ? (
        <label className="fl">
          Confezione
          <select className="in" value={packaging} onChange={(e) => setPackaging(e.target.value as typeof packaging)}>
            {PACKAGING_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <ImageUploadField value={imageUrl} onChange={setImageUrl} />

      <label className="fl">
        Descrizione (HTML consentito)
        <textarea className="in" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="fl">
        Prezzo di vendita (€, IVA inclusa) — vuoto = non in vendita
        <input className="in" value={priceEuro} onChange={(e) => setPriceEuro(e.target.value)} placeholder="es. 89.90" />
      </label>

      <label className="fl">
        Prezzo rivenditore (€, IVA inclusa) — opzionale
        <input className="in" value={resellerPriceEuro} onChange={(e) => setResellerPriceEuro(e.target.value)} placeholder="es. 72.00" />
      </label>

      <label className="fl">
        Costo di acquisto (€) — uso interno, opzionale
        <input className="in" value={costEuro} onChange={(e) => setCostEuro(e.target.value)} placeholder="es. 60.00" />
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
