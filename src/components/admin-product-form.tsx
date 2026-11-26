"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductAction, deleteProductAction, archiveProductAction, unarchiveProductAction } from "@/lib/admin-actions";
import { ImageUploadField } from "@/components/image-upload-field";
import type { Product } from "@/generated/prisma";

const CATEGORY_OPTIONS = [
  { value: "pokemon-it", label: "Pokémon Italiano" },
  { value: "pokemon-jp", label: "Pokémon Giapponese" },
  { value: "pokemon-cn", label: "Pokémon Cinese" },
  { value: "pokemon-kr", label: "Pokémon Coreano" },
  { value: "one-piece-jp", label: "One Piece Giapponese" },
  { value: "one-piece-cn", label: "One Piece Cinese" },
  { value: "yugioh", label: "Yu-Gi-Oh!" },
  { value: "dragon-ball", label: "Dragon Ball" },
];

const PACKAGING_OPTIONS = [
  { value: "SEALED", label: "Con pellicola (sigillato)" },
  { value: "NO_WRAP", label: "Senza pellicola" },
  { value: "DAMAGED", label: "Danneggiato" },
];

const LANGUAGE_OPTIONS = [
  { value: "JP", label: "Giapponese" },
  { value: "EN", label: "Inglese" },
  { value: "IT", label: "Italiano" },
  { value: "CN", label: "Cinese" },
  { value: "KR", label: "Coreano" },
];

const JP_CATEGORIES = new Set(["pokemon-jp", "one-piece-jp"]);
const FREE_LANGUAGE_CATEGORIES = new Set(["yugioh", "dragon-ball"]);

const DEFAULT_TYPES = ["Booster box", "Slim box", "Display", "Tin", "Deck", "Collection", "Promo e pack", "Accessori"];

export function AdminProductForm({ product, existingTypes = [] }: { product: Product; existingTypes?: string[] }) {
  const router = useRouter();
  const typeOptions = Array.from(new Set([...DEFAULT_TYPES, ...existingTypes, product.type])).sort((a, b) =>
    a.localeCompare(b, "it")
  );
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [productSetName, setProductSetName] = useState(product.setName);
  const [type, setType] = useState(product.type);
  const [customType, setCustomType] = useState("");
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [isNew, setIsNew] = useState(product.isNew);
  const [isPreorder, setIsPreorder] = useState(product.isPreorder);
  const [priceEuro, setPriceEuro] = useState(product.priceCents != null ? (product.priceCents / 100).toFixed(2) : "");
  const [resellerPriceEuro, setResellerPriceEuro] = useState(
    product.resellerPriceCents != null ? (product.resellerPriceCents / 100).toFixed(2) : ""
  );
  const [costEuro, setCostEuro] = useState(product.supplierCostCents != null ? (product.supplierCostCents / 100).toFixed(2) : "");
  const [stockQty, setStockQty] = useState(product.stockQty != null ? String(product.stockQty) : "");
  const [published, setPublished] = useState(product.published);
  const [packaging, setPackaging] = useState<"SEALED" | "NO_WRAP" | "DAMAGED">(product.packaging);
  const [language, setLanguage] = useState<"IT" | "JP" | "CN" | "KR" | "EN">(product.language);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const CATEGORY_TO_GAME_LANG: Record<
    string,
    { game: "POKEMON" | "ONE_PIECE" | "YUGIOH" | "DRAGON_BALL"; language: "IT" | "JP" | "CN" | "KR" | "EN" }
  > = {
    "pokemon-it": { game: "POKEMON", language: "IT" },
    "pokemon-jp": { game: "POKEMON", language: "JP" },
    "pokemon-cn": { game: "POKEMON", language: "CN" },
    "pokemon-kr": { game: "POKEMON", language: "KR" },
    "one-piece-jp": { game: "ONE_PIECE", language: "JP" },
    "one-piece-cn": { game: "ONE_PIECE", language: "CN" },
    yugioh: { game: "YUGIOH", language: "JP" },
    "dragon-ball": { game: "DRAGON_BALL", language: "JP" },
  };

  function toCents(euro: string): number | null {
    return euro.trim() === "" ? null : Math.round(parseFloat(euro.replace(",", ".")) * 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { game, language: defaultLanguage } = CATEGORY_TO_GAME_LANG[category] ?? CATEGORY_TO_GAME_LANG["pokemon-jp"];
    const finalLanguage = FREE_LANGUAGE_CATEGORIES.has(category) ? language : defaultLanguage;
    const finalType = type === "__altro__" ? customType.trim() : type;
    if (!finalType) {
      setMessage("Specifica il tipo di prodotto.");
      setSaving(false);
      return;
    }
    const result = await updateProductAction({
      id: product.id,
      name,
      category: category as
        | "pokemon-it"
        | "pokemon-jp"
        | "pokemon-cn"
        | "pokemon-kr"
        | "one-piece-jp"
        | "one-piece-cn"
        | "yugioh"
        | "dragon-ball",
      game,
      language: finalLanguage,
      setName: productSetName,
      type: finalType,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
      description: description.trim() === "" ? null : description,
      isNew,
      isPreorder,
      priceCents: toCents(priceEuro),
      resellerPriceCents: toCents(resellerPriceEuro),
      supplierCostCents: toCents(costEuro),
      stockQty: stockQty.trim() === "" ? null : parseInt(stockQty, 10),
      published,
      packaging: JP_CATEGORIES.has(category) && type === "Booster box" ? packaging : "SEALED",
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
    if (!confirm(`Eliminare "${name}"? Sparisce dal sito ma resta recuperabile dalla sezione Eliminati.`)) return;
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

  async function handleArchiveToggle() {
    setSaving(true);
    setMessage("");
    const result = product.archived ? await unarchiveProductAction({ id: product.id }) : await archiveProductAction({ id: product.id });
    setSaving(false);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore.");
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
        Tipo
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

      {FREE_LANGUAGE_CATEGORIES.has(category) ? (
        <label className="fl">
          Lingua / edizione
          <select className="in" value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}>
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {JP_CATEGORIES.has(category) && type === "Booster box" ? (
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
        Prezzo di vendita (€, IVA inclusa) — vuoto = non in vendita
        <input className="in" value={priceEuro} onChange={(e) => setPriceEuro(e.target.value)} placeholder="es. 89.90" />
      </label>

      <label className="fl">
        Prezzo rivenditore (€, IVA inclusa) — opzionale, visibile solo ai rivenditori approvati
        <input className="in" value={resellerPriceEuro} onChange={(e) => setResellerPriceEuro(e.target.value)} placeholder="es. 72.00" />
      </label>

      <label className="fl">
        Costo di acquisto (€) — uso interno, opzionale
        <input className="in" value={costEuro} onChange={(e) => setCostEuro(e.target.value)} placeholder="es. 60.00" />
      </label>

      <label className="fl">
        Quantità in stock (vuoto = non tracciata)
        <input className="in" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="es. 12, oppure vuoto" />
      </label>

      <label className="check">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Pubblicato (visibile ai clienti)
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
          {saving ? "Salvataggio…" : "Salva modifiche"}
        </button>
        <button type="button" onClick={handleArchiveToggle} disabled={saving} className="btn btn-line btn-sm">
          {product.archived ? "Riattiva prodotto" : "Archivia prodotto"}
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
