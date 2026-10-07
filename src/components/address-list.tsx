"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAddressAction, deleteAddressAction, setDefaultAddressAction } from "@/lib/account-actions";
import type { Address } from "@/generated/prisma";

export function AddressList({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(addresses.length === 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {addresses.map((a) => (
        <div className="box" key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <b>
              {a.label || a.fullName}
              {a.isDefault ? (
                <span className="badge-status" style={{ marginLeft: 8, fontSize: 11 }}>
                  Predefinito
                </span>
              ) : null}
            </b>
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            {a.fullName}
            <br />
            {a.street}
            <br />
            {a.postalCode} {a.city} ({a.province}) · {a.country}
            {a.phone ? (
              <>
                <br />
                Tel. {a.phone}
              </>
            ) : null}
          </div>
          <AddressActions id={a.id} isDefault={a.isDefault} onDone={() => router.refresh()} />
        </div>
      ))}

      {showForm ? (
        <NewAddressForm
          onSaved={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
        />
      ) : (
        <button type="button" className="btn btn-line btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowForm(true)}>
          + Aggiungi indirizzo
        </button>
      )}
    </div>
  );
}

function AddressActions({ id, isDefault, onDone }: { id: string; isDefault: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleSetDefault() {
    setBusy(true);
    await setDefaultAddressAction({ id });
    setBusy(false);
    onDone();
  }

  async function handleDelete() {
    if (!confirm("Eliminare questo indirizzo?")) return;
    setBusy(true);
    await deleteAddressAction({ id });
    setBusy(false);
    onDone();
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {!isDefault ? (
        <button type="button" className="btn btn-line btn-sm" onClick={handleSetDefault} disabled={busy}>
          Imposta come predefinito
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
        onClick={handleDelete}
        disabled={busy}
      >
        Elimina
      </button>
    </div>
  );
}

function NewAddressForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const [label, setLabel] = useState("");
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await createAddressAction({ label, fullName, street, postalCode, city, province, country: "IT", phone });
    setSaving(false);
    if (result.ok) {
      onSaved();
    } else {
      setError(result.error ?? "Errore durante il salvataggio.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="box" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16 }}>Nuovo indirizzo</h2>
      {error ? <div className="alert err">{error}</div> : null}
      <label className="fl">
        Etichetta (facoltativa)
        <input className="in" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="es. Casa, Ufficio…" />
      </label>
      <label className="fl">
        Nome e cognome destinatario
        <input className="in" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>
      <label className="fl">
        Indirizzo e numero civico
        <input className="in" value={street} onChange={(e) => setStreet(e.target.value)} />
      </label>
      <label className="fl">
        CAP
        <input className="in" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
      </label>
      <label className="fl">
        Città
        <input className="in" value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <label className="fl">
        Provincia
        <input className="in" value={province} onChange={(e) => setProvince(e.target.value)} />
      </label>
      <label className="fl">
        Telefono (facoltativo)
        <input className="in" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-dark btn-sm" type="submit" disabled={saving}>
          {saving ? "Salvataggio…" : "Salva indirizzo"}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-line btn-sm" onClick={onCancel}>
            Annulla
          </button>
        ) : null}
      </div>
    </form>
  );
}
