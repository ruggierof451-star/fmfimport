import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Admin · Etichetta" };

const SENDER = {
  name: "FMF Cards S.R.L.S.",
  street: "Traversa Garibaldi 24",
  postal: "80040",
  city: "Striano",
  province: "NA",
  country: "Italia",
  vat: "P.IVA 11105221219",
};

export default async function AdminLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <BackButton fallbackHref="/admin/etichette" />
        <PrintButton />
      </div>

      <div className="label-sheet">
        <div className="label-box">
          <div className="label-head">Mittente</div>
          <div>
            <b>{SENDER.name}</b>
            <br />
            {SENDER.street}
            <br />
            {SENDER.postal} {SENDER.city} ({SENDER.province}), {SENDER.country}
            <br />
            {SENDER.vat}
          </div>
        </div>

        <div className="label-box" style={{ marginTop: 18 }}>
          <div className="label-head">Destinatario</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{order.shipName}</div>
          <div style={{ fontSize: 16 }}>
            {order.shipStreet}
            <br />
            {order.shipPostal} {order.shipCity} ({order.shipProvince}), {order.shipCountry}
            <br />
            {order.shipPhone ? `Tel. ${order.shipPhone}` : null}
          </div>
        </div>

        <div className="label-box" style={{ marginTop: 18 }}>
          <div className="label-head">Ordine</div>
          <div style={{ fontSize: 18, fontWeight: 700 }} className="mono">
            {order.orderNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
