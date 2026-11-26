"use client";

import { useCart } from "@/components/cart-context";

export function AddToCartButton({
  productId,
  quantity = 1,
  label,
  className = "btn btn-gold",
  disabled = false,
}: {
  productId: string;
  quantity?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { addItem, showToast } = useCart();
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        addItem(productId, quantity);
        showToast("Aggiunto al carrello");
      }}
    >
      {disabled ? "Esaurito" : label ?? "Aggiungi al carrello"}
    </button>
  );
}
