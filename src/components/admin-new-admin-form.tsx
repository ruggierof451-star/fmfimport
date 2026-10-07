"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminUserAction } from "@/lib/admin-actions";

export function AdminNewAdminForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await createAdminUserAction({ name, email, password });
    setSaving(false);
    if (result.ok) {
      setMessage("Admin creato.");
      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } else {
      setMessage(result.error ?? "Errore.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
      {message ? <div className={`alert ${message === "Admin creato." ? "ok" : "err"}`}>{message}</div> : null}
      <label className="fl">
        Nome
        <input className="in" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="fl">
        Email
        <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="fl">
        Password (almeno 8 caratteri)
        <input className="in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Creazione…" : "Crea admin"}
      </button>
    </form>
  );
}
