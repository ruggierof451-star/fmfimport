"use client";

import { useCart } from "@/components/cart-context";

export function Toast() {
  const { toastMsg } = useCart();
  if (!toastMsg) return null;
  return <div className="toast">{toastMsg}</div>;
}
