"use client";

import { useCart } from "@/components/cart-context";

export function AddToCartButton({
  productId,
  quantity = 1,
  label,
  className = "btn btn-gold",
}: {
  productId: string;
  quantity?: number;
  label?: string;
  className?: string;
}) {
  const { addItem, showToast } = useCart();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        addItem(productId, quantity);
        showToast("Aggiunto al carrello");
      }}
    >
      {label ?? "Aggiungi al carrello"}
    </button>
  );
}
