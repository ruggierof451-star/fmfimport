"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/admin" }: { fallbackHref?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "7px 12px",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ink)",
        cursor: "pointer",
      }}
    >
      ← Indietro
    </button>
  );
}
