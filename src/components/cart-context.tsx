"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PackagingChoice } from "@/lib/pricing";

export interface CartItem {
  productId: string;
  quantity: number;
  /** Solo per i booster box giapponesi: quale confezione è stata scelta. Assente = "SEALED". */
  packaging?: PackagingChoice;
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
  isResellerPrice: boolean;
  lineTotalCents: number;
  packaging?: PackagingChoice;
}

function samePackaging(a: PackagingChoice | undefined, b: PackagingChoice | undefined): boolean {
  return (a ?? "SEALED") === (b ?? "SEALED");
}

export interface Quote {
  lines: QuoteLine[];
  totals: {
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    totalCents: number;
    freeShippingRemainderCents: number;
    qualifiesForFreeShipping: boolean;
  };
  removed: { productId: string; reason: string }[];
  adjusted: { productId: string; requestedQty: number; availableQty: number }[];
  coupon: { code: string; percentOffBps: number } | { error: string } | null;
}

interface CartContextValue {
  items: CartItem[];
  quote: Quote | null;
  quoteLoading: boolean;
  count: number;
  drawerOpen: boolean;
  menuOpen: boolean;
  toastMsg: string;
  couponCode: string;
  addItem: (productId: string, quantity: number, packaging?: PackagingChoice) => void;
  setQuantity: (productId: string, quantity: number, packaging?: PackagingChoice) => void;
  removeItem: (productId: string, packaging?: PackagingChoice) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setMenuOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "fmf_cart";
const COUPON_STORAGE_KEY = "fmf_coupon";

function loadCoupon(): string {
  try {
    return localStorage.getItem(COUPON_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveCoupon(code: string) {
  try {
    if (code) localStorage.setItem(COUPON_STORAGE_KEY, code);
    else localStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    // storage non disponibile: il codice resta solo in memoria per questa sessione
  }
}

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
  const [couponCode, setCouponCode] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setItems(loadCart());
    setCouponCode(loadCoupon());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) saveCoupon(couponCode);
  }, [couponCode, hydrated]);

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
        body: JSON.stringify({ items, couponCode: couponCode || undefined }),
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
  }, [items, hydrated, couponCode]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2600);
  }, []);

  const addItem = useCallback(
    (productId: string, quantity: number, packaging?: PackagingChoice) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId && samePackaging(i.packaging, packaging));
        if (existing) {
          return prev.map((i) =>
            i.productId === productId && samePackaging(i.packaging, packaging) ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { productId, quantity, packaging }];
      });
      setDrawerOpen(true);
    },
    []
  );

  const setQuantity = useCallback((productId: string, quantity: number, packaging?: PackagingChoice) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => !(i.productId === productId && samePackaging(i.packaging, packaging)))
        : prev.map((i) => (i.productId === productId && samePackaging(i.packaging, packaging) ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback((productId: string, packaging?: PackagingChoice) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && samePackaging(i.packaging, packaging))));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode("");
  }, []);

  const applyCoupon = useCallback((code: string) => setCouponCode(code.trim().toUpperCase()), []);
  const removeCoupon = useCallback(() => setCouponCode(""), []);

  const count = useMemo(() => items.reduce((a, i) => a + i.quantity, 0), [items]);

  const value: CartContextValue = {
    items,
    quote,
    quoteLoading,
    count,
    drawerOpen,
    menuOpen,
    toastMsg,
    couponCode,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    setMenuOpen,
    showToast,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve essere usato dentro <CartProvider>");
  return ctx;
}
