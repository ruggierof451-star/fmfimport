"use client";

import { useState } from "react";
import { formatEuro, splitVat } from "@/lib/pricing";

export function ResellerPriceTable({
  rows,
}: {
  rows: { name: string; standardCents: number; bulkCents: number; vatRateBps: number }[];
}) {
  const [netView, setNetView] = useState(false);

  return (
    <section className="box">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Esempio di prezzi</h2>
        <label className="switch">
          <input type="checkbox" checked={netView} onChange={(e) => setNetView(e.target.checked)} />
          Mostra prezzi IVA esclusa
        </label>
      </div>
      <div className="tscroll">
        <table className="pt">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Prezzo standard</th>
              <th>Prezzo quantità</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const std = netView ? splitVat(r.standardCents, r.vatRateBps).netCents : r.standardCents;
              const bulk = netView ? splitVat(r.bulkCents, r.vatRateBps).netCents : r.bulkCents;
              return (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{formatEuro(std)}</td>
                  <td>{formatEuro(bulk)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        {netView ? "Prezzi IVA esclusa, calcolati dal prezzo pubblico." : "Prezzi IVA inclusa, come mostrati ai clienti."}
      </p>
    </section>
  );
}
