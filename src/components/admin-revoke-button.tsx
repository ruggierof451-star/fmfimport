"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revokeAdminAction } from "@/lib/admin-actions";

export function AdminRevokeButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    if (!confirm(`Rimuovere i permessi admin a ${email}? Diventerà un account cliente normale.`)) return;
    setSaving(true);
    await revokeAdminAction({ userId });
    setSaving(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-line btn-sm" onClick={handleClick} disabled={saving}>
      {saving ? "…" : "Rimuovi admin"}
    </button>
  );
}
