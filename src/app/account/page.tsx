import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AccountAuthForm } from "@/components/account-auth-form";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro } from "@/lib/pricing";

export const metadata = { title: "Account" };

const STEPS = ["Ricevuto", "In preparazione", "Spedito", "Consegnato"];
const ORDER_FLOW = ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "AVAILABILITY_CHECK", "TO_PROCURE", "PREPARING", "SHIPPED", "DELIVERED"];

function stepIndexFor(status: string) {
  if (status === "DELIVERED") return 3;
  if (status === "SHIPPED") return 2;
  const i = ORDER_FLOW.indexOf(status);
  return i >= 4 ? 1 : 0;
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  const { tab } = await searchParams;
  const activeTab = tab ?? "orders";

  if (!user) {
    return (
      <>
        <Header activeKey="account" />
        <AccountAuthForm />
        <Footer />
      </>
    );
  }

  const orders = activeTab === "orders" ? await prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <>
      <Header activeKey="account" />
      <main className="wrap page" style={{ gap: 24 }}>
        <h1 style={{ fontSize: "clamp(26px,3vw,34px)", fontWeight: 500 }}>Ciao {user.name ?? ""}</h1>
        <div className="lay">
          <nav className="side" aria-label="Area cliente">
            <Link href="/account?tab=orders" className={activeTab === "orders" ? "on" : ""}>
              Ordini e tracking
            </Link>
            <Link href="/account?tab=addr" className={activeTab === "addr" ? "on" : ""}>
              Indirizzi
            </Link>
            <Link href="/account?tab=data" className={activeTab === "data" ? "on" : ""}>
              Dati e fatturazione
            </Link>
            <LogoutButton />
          </nav>
          <div className="content">
            {activeTab === "orders" ? (
              orders.length ? (
                orders.map((o) => (
                  <div className="box" key={o.id}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                      <b className="mono">{o.orderNumber}</b>
                      <span className="muted">{o.createdAt.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</span>
                      <b>{formatEuro(o.totalCents)}</b>
                    </div>
                    <div className="timeline">
                      {STEPS.map((s, i) => (
                        <div key={s} className={i <= stepIndexFor(o.status) ? "done" : ""}>
                          {s}
                        </div>
                      ))}
                    </div>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {o.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(" · ")}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      Tracking:{" "}
                      <span className="muted">
                        {o.trackingNumber ? `${o.trackingCarrier ?? ""} ${o.trackingNumber}` : "comparirà qui appena il pacco viene affidato al corriere."}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <b>Nessun ordine ancora</b>
                  <p>Quando completi un ordine lo trovi qui con lo stato di spedizione.</p>
                  <Link className="btn btn-dark btn-sm" href="/">
                    Vai al catalogo
                  </Link>
                </div>
              )
            ) : activeTab === "addr" ? (
              <div className="box">
                <h2>Indirizzi salvati</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Nessun indirizzo salvato. Verrà proposto quello usato nel prossimo ordine.
                </p>
              </div>
            ) : (
              <div className="box">
                <h2>Dati personali</h2>
                <dl className="spec">
                  <dt>Nome</dt>
                  <dd>{user.name ?? "—"}</dd>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                  {user.companyName ? (
                    <>
                      <dt>Ragione sociale</dt>
                      <dd>{user.companyName}</dd>
                    </>
                  ) : null}
                  {user.vatNumber ? (
                    <>
                      <dt>Partita IVA</dt>
                      <dd>{user.vatNumber}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
