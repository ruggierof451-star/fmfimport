"use client";

import { useState } from "react";
import { unsubscribeFromMarketingAction } from "@/lib/account-actions";

export function UnsubscribeButton({ userId }: { userId: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (done) {
    return <div className="alert ok">Fatto, non riceverai più le nostre email di marketing.</div>;
  }

  return (
    <button
      className="btn btn-dark"
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await unsubscribeFromMarketingAction({ userId });
        setLoading(false);
        setDone(true);
      }}
    >
      {loading ? "Attendere…" : "Conferma disiscrizione"}
    </button>
  );
}
