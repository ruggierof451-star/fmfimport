import { formatEuro } from "@/lib/pricing";

export function ResellerPriceTable({
  rows,
}: {
  rows: { name: string; standardCents: number; bulkCents: number }[];
}) {
  return (
    <section className="box">
      <h2 style={{ margin: 0 }}>Esempio di prezzi</h2>
      <div className="tscroll">
        <table className="pt">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Prezzo standard</th>
              <th>Prezzo quantità (oltre 10 pz)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{formatEuro(r.standardCents)}</td>
                <td>{formatEuro(r.bulkCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
