"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setMarketingOptInAction } from "@/lib/account-actions";

export function MarketingOptInToggle({ optIn }: { optIn: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(optIn);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: boolean) {
    setChecked(next);
    setSaving(true);
    await setMarketingOptInAction({ optIn: next });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="box" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2>Email di marketing</h2>
      <label className="check">
        <input type="checkbox" checked={checked} disabled={saving} onChange={(e) => handleChange(e.target.checked)} />
        Voglio ricevere offerte e novità via email
      </label>
    </div>
  );
}
