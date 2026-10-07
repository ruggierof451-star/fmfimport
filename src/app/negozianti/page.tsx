import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { getPricingSettings, toPricingRules } from "@/lib/settings";
import { standardPriceCents, bulkPriceCents } from "@/lib/pricing";
import { cleanProductName } from "@/lib/product-art";
import { ResellerPriceTable } from "@/components/reseller-price-table";

export const metadata = { title: "Ingrosso e negozianti" };

export default async function NegoziantiPage() {
  const settings = await getPricingSettings();
  const rules = toPricingRules(settings);
  const sample = await prisma.product.findMany({ where: { published: true }, take: 6, orderBy: { isNew: "desc" } });

  const rows = sample.map((p) => {
    const input = { costCents: p.supplierCostCents ?? 0, costVatTreatment: p.costVatTreatment, vatRateBps: p.vatRateBps };
    return {
      name: cleanProductName(p.name),
      standardCents: standardPriceCents(input, rules),
      bulkCents: bulkPriceCents(input, rules),
    };
  });

  return (
    <>
      <Header activeKey="negozianti" />
      <main className="wrap page" style={{ gap: 32 }}>
        <div>
          <span className="eyebrow">Negozi · live seller · vending</span>
          <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500, marginTop: 6 }}>Condizioni per negozianti</h1>
          <p className="muted" style={{ maxWidth: 680 }}>
            Compri in quantità? Oltre {rules.bulkThresholdQty} pezzi dello stesso articolo il prezzo scende in
            automatico nel carrello, senza bisogno di codici o richieste.
          </p>
        </div>

        <section className="box">
          <h2>Come funziona</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Nessun account dedicato necessario: i prezzi sono visibili a tutti, anche senza registrazione.</li>
            <li>
              Lo sconto quantità si applica automaticamente nel carrello oltre {rules.bulkThresholdQty} pezzi per
              articolo.
            </li>
            <li>Al checkout puoi richiedere la fattura inserendo partita IVA e codice SDI.</li>
            <li>Per ordini continuativi o volumi importanti, contattaci per condizioni dedicate.</li>
          </ul>
        </section>

        <ResellerPriceTable rows={rows} />

        <section className="box">
          <h2>Richiedi condizioni dedicate</h2>
          <p className="muted" style={{ margin: 0 }}>
            Per acquisti ricorrenti o grandi volumi scrivici dalla pagina{" "}
            <a href="/assistenza">Centro assistenza</a> indicando il tipo di attività e i volumi indicativi.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
