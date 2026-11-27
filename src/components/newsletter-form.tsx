"use client";

import { useState } from "react";
import Link from "next/link";
import { subscribeNewsletterAction } from "@/lib/newsletter-actions";

const INTEREST_OPTIONS = [
  { key: "pokemon", label: "Pokémon" },
  { key: "onepiece", label: "One Piece" },
  { key: "yugioh", label: "Yu-Gi-Oh!" },
  { key: "dragonball", label: "Dragon Ball" },
] as const;

/** Modulo di iscrizione alla newsletter (footer): email, interessi e consenso esplicito. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(key: string) {
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setResult({ ok: false, text: "Spunta il consenso per iscriverti." });
      return;
    }
    setBusy(true);
    setResult(null);
    const res = await subscribeNewsletterAction({
      email,
      interests: interests as ("pokemon" | "onepiece" | "yugioh" | "dragonball")[],
      consent: true,
      website,
    }).catch(() => ({ ok: false, error: "Iscrizione non riuscita. Riprova tra poco." }) as { ok: boolean; error?: string; message?: string });
    setBusy(false);
    if (res.ok) {
      setResult({ ok: true, text: res.message ?? "Controlla la tua email per confermare." });
      setEmail("");
    } else {
      setResult({ ok: false, text: res.error ?? "Iscrizione non riuscita." });
    }
  }

  return (
    <form className="newsletter" onSubmit={onSubmit} aria-labelledby="nl-title">
      <div className="nl-head">
        <h3 id="nl-title">Newsletter</h3>
        <p>Nuovi arrivi, preordini e offerte, prima di tutti. Niente spam, ti disiscrivi con un clic.</p>
      </div>
      <div className="nl-row">
        <label htmlFor="nl-email" className="sr">
          La tua email
        </label>
        <input
          id="nl-email"
          className="in"
          type="email"
          required
          autoComplete="email"
          placeholder="La tua email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-dark" type="submit" disabled={busy}>
          {busy ? "Invio…" : "Iscriviti"}
        </button>
      </div>
      <fieldset className="nl-interests">
        <legend>Ti interessano (facoltativo)</legend>
        {INTEREST_OPTIONS.map((o) => (
          <label key={o.key} className="nl-chip">
            <input type="checkbox" checked={interests.includes(o.key)} onChange={() => toggle(o.key)} />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      {/* campo trappola per i bot: invisibile alle persone */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      <label className="nl-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Acconsento a ricevere email promozionali di FMF Cards. Ho letto l&apos;<Link href="/privacy">informativa privacy</Link>.
        </span>
      </label>
      {result ? (
        <p className={result.ok ? "nl-msg ok" : "nl-msg err"} role="status">
          {result.text}
        </p>
      ) : null}
    </form>
  );
}
