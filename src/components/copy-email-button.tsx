"use client";

import { useState } from "react";

export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn btn-line btn-sm" onClick={handleCopy}>
      {copied ? "Email copiata ✓" : "Copia indirizzo email"}
    </button>
  );
}
