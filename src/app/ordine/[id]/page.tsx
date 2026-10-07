import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";

export const metadata = { title: "Ordine confermato" };

const STEPS: { status: string; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Ricevuto" },
  { status: "PREPARING", label: "In preparazione" },
  { status: "SHIPPED", label: "Spedito" },
  { status: "DELIVERED", label: "Consegnato" },
];

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();

  const stepIndex = Math.max(
    0,
    ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "AVAILABILITY_CHECK", "TO_PROCURE", "PREPARING", "SHIPPED", "DELIVERED"].indexOf(order.status)
  );
  const simplifiedIndex = order.status === "DELIVERED" ? 3 : order.status === "SHIPPED" ? 2 : stepIndex >= 4 ? 1 : 0;

  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="box" style={{ maxWidth: 720, margin: "0 auto", width: "100%", alignItems: "flex-start" }}>
          <span className="eyebrow">Ordine ricevuto</span>
          <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500 }}>Grazie, {order.shipName.split(" ")[0]}.</h1>
          <p style={{ margin: 0 }}>
            Ordine <b className="mono">{order.orderNumber}</b> · totale <b>{formatEuro(order.totalCents)}</b>. Il
            riepilogo è associato a <b>{order.guestEmail ?? "il tuo account"}</b>.
          </p>
          <div className="alert info">
            Modalità test: nessun pagamento reale è stato addebitato. L&apos;ordine resta &ldquo;in attesa di
            pagamento&rdquo; finché non viene collegato un gateway di pagamento reale.
          </div>
          <div className="timeline" style={{ width: "100%" }}>
            {STEPS.map((s, i) => (
              <div key={s.status} className={i <= simplifiedIndex ? "done" : ""}>
                {s.label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            {order.items.map((item) => (
              <div key={item.id} className="r" style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>
                  {item.quantity} × {item.nameSnapshot}
                </span>
                <span>{formatEuro(item.lineTotalCents)}</span>
              </div>
            ))}
            <div className="r" style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>Spedizione</span>
              <span>{order.shippingCents ? formatEuro(order.shippingCents) : "Gratis"}</span>
            </div>
            {order.invoiceVatCents > 0 ? (
              <div className="r" style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>IVA fattura</span>
                <span>{formatEuro(order.invoiceVatCents)}</span>
              </div>
            ) : null}
            <div className="r t" style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>Totale</span>
              <span>{formatEuro(order.totalCents)}</span>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              Prezzi IVA esclusa{order.invoiceVatCents > 0 ? ", con supplemento IVA per la fattura richiesta" : ""}.
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-dark" href="/account">
              Segui l&apos;ordine
            </Link>
            <Link className="btn btn-line" href="/">
              Torna al negozio
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
