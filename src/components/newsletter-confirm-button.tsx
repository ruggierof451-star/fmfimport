"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmNewsletterAction } from "@/lib/newsletter-actions";

export function NewsletterConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (state === "done") {
    return (
      <>
        <div className="alert ok">Iscrizione confermata, grazie! Ti scriveremo per nuovi arrivi e offerte.</div>
        <Link className="btn btn-dark" href="/">
          Torna al negozio
        </Link>
      </>
    );
  }

  return (
    <>
      {state === "error" ? <div className="alert err">{error}</div> : null}
      <button
        type="button"
        className="btn btn-gold"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const res = await confirmNewsletterAction({ token }).catch(() => ({ ok: false, error: "Conferma non riuscita. Riprova." }));
          if (res.ok) setState("done");
          else {
            setError(res.error ?? "Conferma non riuscita.");
            setState("error");
          }
        }}
      >
        {state === "busy" ? "Conferma in corso…" : "Confermo l'iscrizione"}
      </button>
    </>
  );
}
