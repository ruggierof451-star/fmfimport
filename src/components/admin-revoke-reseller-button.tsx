"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revokeResellerRoleAction } from "@/lib/admin-actions";

export function AdminRevokeResellerButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    if (!confirm(`Rimuovere il listino rivenditore a ${email}? Torna a vedere i prezzi pubblici.`)) return;
    setSaving(true);
    await revokeResellerRoleAction({ userId });
    setSaving(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-line btn-sm" onClick={handleClick} disabled={saving}>
      {saving ? "…" : "Rimuovi rivenditore"}
    </button>
  );
}
