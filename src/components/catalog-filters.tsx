"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { PRICE_BANDS } from "@/lib/catalog";

export function CatalogFilters({
  availableTypes,
  manyGames,
  manyLangs,
  counts,
}: {
  availableTypes: string[];
  manyGames: boolean;
  manyLangs: boolean;
  counts: {
    gamePk: number;
    gameOp: number;
    langJp: number;
    langCn: number;
    langKr: number;
    byType: Record<string, number>;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const games = searchParams.getAll("game");
  const langs = searchParams.getAll("lang");
  const types = searchParams.getAll("type");
  const price = searchParams.get("price") ?? "all";

  function updateParams(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    router.push(`${pathname}?${p.toString()}`);
  }

  function toggleMulti(key: string, value: string) {
    updateParams((p) => {
      const current = p.getAll(key);
      p.delete(key);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      next.forEach((v) => p.append(key, v));
    });
  }

  function setSingle(key: string, value: string) {
    updateParams((p) => p.set(key, value));
  }

  const hasFilters = games.length || langs.length || types.length || price !== "all";

  return (
    <>
      <button className="btn btn-line btn-sm ftoggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Nascondi filtri" : "Filtri"}
      </button>
      <aside className={`filters ${open ? "" : "closed"}`} aria-label="Filtri">
        {manyGames ? (
          <fieldset>
            <legend>Gioco</legend>
            <label>
              <input type="checkbox" checked={games.includes("pokemon")} onChange={() => toggleMulti("game", "pokemon")} />
              Pokémon<span className="n">{counts.gamePk}</span>
            </label>
            <label>
              <input type="checkbox" checked={games.includes("one_piece")} onChange={() => toggleMulti("game", "one_piece")} />
              One Piece<span className="n">{counts.gameOp}</span>
            </label>
          </fieldset>
        ) : null}
        {manyLangs ? (
          <fieldset>
            <legend>Lingua</legend>
            <label>
              <input type="checkbox" checked={langs.includes("jp")} onChange={() => toggleMulti("lang", "jp")} />
              Giapponese<span className="n">{counts.langJp}</span>
            </label>
            <label>
              <input type="checkbox" checked={langs.includes("cn")} onChange={() => toggleMulti("lang", "cn")} />
              Cinese<span className="n">{counts.langCn}</span>
            </label>
            <label>
              <input type="checkbox" checked={langs.includes("kr")} onChange={() => toggleMulti("lang", "kr")} />
              Coreano<span className="n">{counts.langKr}</span>
            </label>
          </fieldset>
        ) : null}
        <fieldset>
          <legend>Tipologia</legend>
          {availableTypes.map((t) => (
            <label key={t}>
              <input type="checkbox" checked={types.includes(t)} onChange={() => toggleMulti("type", t)} />
              {t}
              <span className="n">{counts.byType[t] ?? 0}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Prezzo</legend>
          {Object.entries(PRICE_BANDS).map(([k, v]) => (
            <label key={k}>
              <input type="radio" name="pr" checked={price === k} onChange={() => setSingle("price", k)} />
              {v[2]}
            </label>
          ))}
        </fieldset>
        {hasFilters ? (
          <button className="link" onClick={() => router.push(pathname)}>
            Azzera filtri
          </button>
        ) : null}
      </aside>
    </>
  );
}

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") ?? "rel";

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 14 }}>
      Ordina
      <select
        className="in"
        style={{ width: "auto" }}
        value={sort}
        onChange={(e) => {
          const p = new URLSearchParams(searchParams.toString());
          p.set("sort", e.target.value);
          router.push(`${pathname}?${p.toString()}`);
        }}
      >
        <option value="rel">In evidenza</option>
        <option value="asc">Prezzo crescente</option>
        <option value="desc">Prezzo decrescente</option>
        <option value="name">Nome A–Z</option>
      </select>
    </label>
  );
}

export function LoadMoreButton({ currentPage }: { currentPage: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <button
      className="btn btn-line"
      onClick={() => {
        const p = new URLSearchParams(searchParams.toString());
        p.set("page", String(currentPage + 1));
        router.push(`${pathname}?${p.toString()}`, { scroll: false });
      }}
    >
      Carica altri prodotti
    </button>
  );
}
