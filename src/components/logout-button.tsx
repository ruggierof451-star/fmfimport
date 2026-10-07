"use client";

import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await logoutAction();
        router.refresh();
      }}
    >
      Esci
    </button>
  );
}
