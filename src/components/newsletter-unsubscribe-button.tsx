"use client";

import { useState } from "react";
import Link from "next/link";
import { unsubscribeNewsletterAction } from "@/lib/newsletter-actions";

export function NewsletterUnsubscribeButton({ sendId }: { sendId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <>
        <div className="alert ok">Fatto: non riceverai più email promozionali.</div>
        <Link className="btn btn-dark" href="/">
          Torna al negozio
        </Link>
      </>
    );
  }
  return (
    <>
      {state === "error" ? <div className="alert err">Link non valido. Scrivici da Contatti e ti togliamo noi.</div> : null}
      <button
        type="button"
        className="btn btn-dark"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const res = await unsubscribeNewsletterAction({ sendId }).catch(() => ({ ok: false }));
          setState(res.ok ? "done" : "error");
        }}
      >
        {state === "busy" ? "Un attimo…" : "Sì, disiscrivimi"}
      </button>
    </>
  );
}
