"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "fmf_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // storage non disponibile: il banner ricomparirà, non è un problema bloccante
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consenso cookie"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 120,
        maxWidth: 560,
        marginInline: "auto",
        background: "#111",
        color: "#fff",
        borderRadius: 12,
        padding: "16px 18px",
        boxShadow: "0 12px 32px rgba(0,0,0,.3)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        Usiamo cookie tecnici necessari al funzionamento del sito (carrello, accesso). Continuando accetti il loro
        utilizzo. <Link href="/cookie" style={{ color: "var(--gold)" }}>Scopri di più</Link>.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={accept}
          style={{
            background: "var(--gold)",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Accetta
        </button>
      </div>
    </div>
  );
}
