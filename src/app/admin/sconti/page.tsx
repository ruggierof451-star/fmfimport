import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/back-button";
import { AdminNewDiscountForm } from "@/components/admin-new-discount-form";
import { AdminDiscountToggleButton } from "@/components/admin-discount-toggle-button";
import { AdminDiscountEditForm } from "@/components/admin-discount-edit-form";

export const metadata = { title: "Admin · Codici sconto" };

export default async function AdminDiscountsPage() {
  const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackButton />
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Codici sconto</h1>
      <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
        Sconto in percentuale su tutto il subtotale del carrello, verificato in automatico al
        checkout. Il codice <b className="mono">FMFCARDS</b> (5%) è già attivo per il lancio del
        sito.
      </p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Codice</th>
              <th>Sconto</th>
              <th>Utilizzi totali</th>
              <th>Max per profilo</th>
              <th>Scadenza</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.code}</td>
                <td>{(c.percentOffBps / 100).toLocaleString("it-IT")}%</td>
                <td>
                  {c.usedCount}
                  {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                </td>
                <td>{c.maxUsesPerUser != null ? c.maxUsesPerUser : "—"}</td>
                <td>{c.expiresAt ? c.expiresAt.toLocaleDateString("it-IT") : "—"}</td>
                <td>
                  <span className="badge-status">{c.active ? "Attivo" : "Disattivato"}</span>
                </td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <AdminDiscountToggleButton id={c.id} active={c.active} code={c.code} />
                    <AdminDiscountEditForm
                      discount={{
                        id: c.id,
                        code: c.code,
                        percentOff: (c.percentOffBps / 100).toString(),
                        maxUses: c.maxUses != null ? String(c.maxUses) : "",
                        maxUsesPerUser: c.maxUsesPerUser != null ? String(c.maxUsesPerUser) : "",
                        expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "",
                        active: c.active,
                        usedCount: c.usedCount,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {codes.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nessun codice sconto ancora creato.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Crea nuovo codice</h2>
      <AdminNewDiscountForm />
    </div>
  );
}
