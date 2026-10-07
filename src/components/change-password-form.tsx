"use client";

import { useState } from "react";
import { changePasswordAction } from "@/lib/auth-actions";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
    setSaving(false);
    if (result.ok) {
      setMessage("Password aggiornata.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setMessage(result.error ?? "Errore durante l'aggiornamento.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="box" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2>Cambia password</h2>
      {message ? <div className={`alert ${message === "Password aggiornata." ? "ok" : "err"}`}>{message}</div> : null}
      <label className="fl">
        Password attuale
        <input
          className="in"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label className="fl">
        Nuova password (almeno 8 caratteri)
        <input
          className="in"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="fl">
        Conferma nuova password
        <input
          className="in"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <button className="btn btn-dark btn-sm" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Salvataggio…" : "Aggiorna password"}
      </button>
    </form>
  );
}
