"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/lib/auth-actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await resetPasswordAction({ token, newPassword, confirmPassword });
    setSaving(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error ?? "Errore durante il salvataggio.");
    }
  }

  if (done) {
    return (
      <div className="alert ok">
        Password aggiornata. <Link href="/account">Vai al login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error ? <div className="alert err">{error}</div> : null}
      <label className="fl">
        Nuova password (almeno 8 caratteri)
        <input className="in" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
      </label>
      <label className="fl">
        Conferma nuova password
        <input className="in" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
      </label>
      <button className="btn btn-dark" type="submit" disabled={saving}>
        {saving ? "Salvataggio…" : "Reimposta password"}
      </button>
    </form>
  );
}
