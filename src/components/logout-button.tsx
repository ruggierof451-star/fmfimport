"use client";

import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";

export function LogoutButton({ className, redirectTo }: { className?: string; redirectTo?: string } = {}) {
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={async () => {
        await logoutAction();
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }}
    >
      Esci
    </button>
  );
}
