"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface QuoteLine {
  productId: string;
  slug: string;
  name: string;
  type: string;
  language: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
  standardUnitPriceCents: number;
  bulkUnitPriceCents: number;
  lineTotalCents: number;
  isBulkPricing: boolean;
  isEstimatedCost: boolean;
  stockLabel: string;
  maxOrderableQty: number;
}

export interface Quote {
  lines: QuoteLine[];
  totals: {
    subtotalCents: number;
    fullPriceSubtotalCents: number;
    bulkDiscountCents: number;
    shippingCents: number;
    totalCents: number;
    freeShippingRemainderCents: number;
    qualifiesForFreeShipping: boolean;
  };
  bulkThresholdQty: number;
  removed: { productId: string; reason: string }[];
  adjusted: { productId: string; requestedQty: number; availableQty: number }[];
  hasEstimatedPrices: boolean;
}

interface CartContextValue {
  items: CartItem[];
  quote: Quote | null;
  quoteLoading: boolean;
  count: number;
  drawerOpen: boolean;
  menuOpen: boolean;
  toastMsg: string;
  addItem: (productId: string, quantity: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setMenuOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "fmf_cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) => x && typeof x.productId === "string" && typeof x.quantity === "number" && x.quantity > 0
    );
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage non disponibile (es. modalità privata): il carrello resta solo in memoria
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const t = setTimeout(() => {
      fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
        .then((r) => r.json())
        .then((data: Quote) => {
          if (cancelled) return;
          setQuote(data);
          // Rimuove dal carrello gli articoli che il server ha scartato (esauriti/non trovati)
          if (data.removed?.length) {
            const removedIds = new Set(data.removed.map((r) => r.productId));
            setItems((prev) => prev.filter((i) => !removedIds.has(i.productId)));
          }
          // Riduce silenziosamente le quantità oltre la disponibilità reale
          if (data.adjusted?.length) {
            const byId = new Map(data.adjusted.map((a) => [a.productId, a.availableQty]));
            setItems((prev) => prev.map((i) => (byId.has(i.productId) ? { ...i, quantity: byId.get(i.productId)! } : i)));
          }
        })
        .catch(() => {})
        .finally(() => !cancelled && setQuoteLoading(false));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hydrated]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2600);
  }, []);

  const addItem = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        if (existing) {
          return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i));
        }
        return [...prev, { productId, quantity }];
      });
      setDrawerOpen(true);
    },
    []
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((a, i) => a + i.quantity, 0), [items]);

  const value: CartContextValue = {
    items,
    quote,
    quoteLoading,
    count,
    drawerOpen,
    menuOpen,
    toastMsg,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    setMenuOpen,
    showToast,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve essere usato dentro <CartProvider>");
  return ctx;
}
