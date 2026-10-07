"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-context";
import { searchSuggestions, type SearchSuggestion } from "@/lib/search-actions";
import { NAV } from "@/lib/catalog";

const MENU = [
  {
    title: "Categorie",
    items: NAV,
  },
  {
    title: "Scopri",
    items: [
      { key: "pokemon", label: "Tutto Pokémon" },
      { key: "onepiece", label: "Tutto One Piece" },
      { key: "piu-venduti", label: "Più venduti" },
      { key: "offerte", label: "Offerte" },
    ],
  },
  {
    title: "Informazioni",
    items: [
      { key: "chi-siamo", label: "Chi siamo" },
      { key: "come-funziona", label: "Come funziona" },
      { key: "negozianti", label: "Ingrosso" },
      { key: "assistenza", label: "Centro assistenza" },
      { key: "contatti", label: "Contatti" },
    ],
  },
];

const routeFor = (key: string) =>
  ["pokemon-jp", "pokemon-cn", "pokemon-kr", "one-piece-jp", "one-piece-cn", "bgrade", "novita", "pokemon", "onepiece", "piu-venduti", "offerte"].includes(key)
    ? `/${key}`
    : `/${key}`;

export function HeaderClient({ isLoggedIn, activeKey }: { isLoggedIn: boolean; activeKey: string }) {
  const { count, openDrawer, menuOpen, setMenuOpen } = useCart();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sugOpen, setSugOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      searchSuggestions(q).then((res) => !cancelled && setSuggestions(res));
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setSugOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSugOpen(false);
    router.push(`/cerca?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <header className="site">
        <div className="wrap hrow">
          <button
            className="burger"
            aria-label="Apri il menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <Link href="/" className="logo" aria-label="FMF Import, homepage">
            <b>FMF</b>
            <span>IMPORT</span>
          </Link>
          <div className="hicons">
            <Link className="hicon" href={isLoggedIn ? "/account" : "/account"}>
              <UserIcon />
              <span className="lbl">{isLoggedIn ? "Account" : "Accedi"}</span>
            </Link>
            <button className="hicon" onClick={openDrawer} aria-label={`Carrello, ${count} articoli`}>
              <CartIcon />
              <span className="lbl">Carrello</span>
              {count > 0 ? <span className="badge">{count}</span> : null}
            </button>
          </div>
        </div>
        <div className="wrap searchrow">
          <div className="search" ref={boxRef}>
            <form onSubmit={submitSearch} role="search">
              <SearchIcon />
              <label htmlFor="q" className="sr">
                Cerca prodotti
              </label>
              <input
                id="q"
                type="search"
                autoComplete="off"
                placeholder="Cerca prodotti"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSugOpen(true);
                }}
                onFocus={() => setSugOpen(true)}
                aria-expanded={sugOpen}
                aria-controls="sug"
              />
              <button type="submit">Cerca</button>
            </form>
            {sugOpen && q.trim().length >= 2 ? (
              <div className="suggest" id="sug" role="listbox">
                {suggestions.length ? (
                  <>
                    {suggestions.map((p) => (
                      <Link key={p.slug} href={`/prodotto/${p.slug}`} role="option" onClick={() => setSugOpen(false)}>
                        <span className="thumb" />
                        <span style={{ minWidth: 0 }}>
                          <div className="t1">{p.name}</div>
                          <div className="t2">{p.priceLabel}</div>
                        </span>
                      </Link>
                    ))}
                    <Link className="all" href={`/cerca?q=${encodeURIComponent(q)}`} onClick={() => setSugOpen(false)}>
                      Vedi tutti i risultati per &ldquo;{q}&rdquo; →
                    </Link>
                  </>
                ) : (
                  <div className="none">
                    Nessun prodotto per &ldquo;<b>{q}</b>&rdquo;. Prova con il codice del set (es. <b>OP-14</b>) o con il nome
                    dell&apos;espansione.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <nav className="cats" aria-label="Categorie">
          <div className="wrap">
            {NAV.map((n) => (
              <Link key={n.key} href={routeFor(n.key)} className={activeKey === n.key ? "on" : ""}>
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      {menuOpen ? (
        <>
          <div className="scrim" onClick={() => setMenuOpen(false)} />
          <aside className="drawer left" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="dh">
              <b>Menu</b>
              <button className="x" aria-label="Chiudi il menu" onClick={() => setMenuOpen(false)}>
                ×
              </button>
            </div>
            <nav className="db menu">
              {MENU.map((group) => (
                <div key={group.title}>
                  <h3>{group.title}</h3>
                  {group.items.map((item) => (
                    <Link key={item.key} href={routeFor(item.key)} onClick={() => setMenuOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        </>
      ) : null}
    </>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2l2.2 11h11.3L21 7H6.2" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C5B60" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}
