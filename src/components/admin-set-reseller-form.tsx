"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setResellerRoleAction } from "@/lib/admin-actions";

export function AdminSetResellerForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await setResellerRoleAction({ email });
    setSaving(false);
    if (result.ok) {
      setMessage("Account promosso a rivenditore.");
      setEmail("");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
      {message ? <div className={`alert ${message.startsWith("Account") ? "ok" : "err"}`}>{message}</div> : null}
      <label className="fl">
        Email account cliente già registrato
        <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@azienda.it" />
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Salvataggio…" : "Promuovi a rivenditore"}
      </button>
    </form>
  );
}
