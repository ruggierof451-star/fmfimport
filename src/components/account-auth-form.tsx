"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction, registerAction, requestPasswordResetAction } from "@/lib/auth-actions";

export function AccountAuthForm() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (mode === "forgot") {
      const result = await requestPasswordResetAction({ email });
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error ?? "Si è verificato un errore.");
        return;
      }
      setResetSent(true);
      setResetUrl(result.resetUrl ?? "");
      return;
    }

    const result = mode === "register" ? await registerAction({ name, email, password }) : await loginAction({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Si è verificato un errore.");
      return;
    }
    router.refresh();
  }

  if (mode === "forgot" && resetSent) {
    return (
      <main className="wrap page">
        <div className="box" style={{ maxWidth: 480, marginInline: "auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Controlla la tua email</h1>
          <p className="muted">
            Se esiste un account con questa email, riceverai un link per reimpostare la password (valido 1 ora).
          </p>
          {resetUrl ? (
            <div className="alert info">
              Non siamo riusciti a inviare l&apos;email in questo momento: usa questo link —{" "}
              <Link href={resetUrl}>{resetUrl}</Link>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-line btn-sm"
            onClick={() => {
              setMode("login");
              setResetSent(false);
            }}
          >
            Torna al login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap page">
      <div className="two">
        <div className="a">
          <form className="box" onSubmit={handleSubmit} noValidate>
            <div className="seg" style={{ background: "var(--soft)" }} role="tablist">
              <button type="button" role="tab" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>
                Accedi
              </button>
              <button type="button" role="tab" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>
                Crea account
              </button>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 500 }}>
              {mode === "register" ? "Crea il tuo account" : mode === "forgot" ? "Recupera la password" : "Accedi al tuo account"}
            </h1>
            {error ? (
              <div className="alert err" role="alert">
                {error}
              </div>
            ) : null}
            <div className="form">
              {mode === "register" ? (
                <label className="fl full" htmlFor="ac-nome">
                  Nome
                  <input className="in" id="ac-nome" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
              ) : null}
              <label className="fl full" htmlFor="ac-email">
                Email
                <input className="in" id="ac-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {mode !== "forgot" ? (
                <label className="fl full" htmlFor="ac-pw">
                  Password
                  <input
                    className="in"
                    id="ac-pw"
                    type="password"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {mode === "register" ? (
                    <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                      Almeno 8 caratteri.
                    </span>
                  ) : null}
                </label>
              ) : null}
            </div>
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                }}
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, textAlign: "left", cursor: "pointer", padding: 0 }}
              >
                Password dimenticata?
              </button>
            ) : null}
            <button className="btn btn-dark" type="submit" disabled={submitting}>
              {submitting ? "Attendere…" : mode === "register" ? "Crea account" : mode === "forgot" ? "Invia link di recupero" : "Accedi"}
            </button>
            {mode === "forgot" ? (
              <button type="button" className="btn btn-line btn-sm" onClick={() => setMode("login")} style={{ alignSelf: "flex-start" }}>
                ← Torna al login
              </button>
            ) : null}
          </form>
        </div>
        <div className="b" style={{ position: "static" }}>
          <div className="box">
            <h2>Non serve un account per comprare</h2>
            <p className="muted" style={{ margin: 0 }}>
              Puoi completare l&apos;ordine come ospite. Con l&apos;account hai in più:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>storico ordini e tracking in un posto solo</li>
              <li>indirizzi e dati di fatturazione salvati</li>
              <li>avvisi quando un prodotto torna disponibile</li>
            </ul>
            <Link className="btn btn-line btn-sm" href="/checkout" style={{ alignSelf: "flex-start" }}>
              Continua come ospite
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
