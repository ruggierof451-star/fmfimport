import { prisma } from "@/lib/prisma";
import { AdminImportForm } from "@/components/admin-import-form";
import { AdminSupplierMatchRow } from "@/components/admin-supplier-match-row";

export const metadata = { title: "Admin · Importazione catalogo" };

export default async function AdminImportPage() {
  const [pendingLinks, syncLogs, products] = await Promise.all([
    prisma.supplierLink.findMany({ where: { productId: null }, orderBy: { lastSeenAt: "desc" }, take: 50 }),
    prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Importazione catalogo</h1>
      <div className="alert info">
        Non esiste un&apos;API del fornitore collegata direttamente qui: questa è un&apos;importazione manuale da file CSV/XLSX che esporti dal
        tuo account fornitore/magazzino. Abbina prima per codice prodotto esatto; i casi ambigui restano in attesa di revisione
        qui sotto e NON modificano automaticamente prezzi o scorte.
      </div>

      <AdminImportForm />

      {pendingLinks.length > 0 ? (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <h2 style={{ fontSize: 16, padding: "16px 16px 0" }}>Da abbinare manualmente ({pendingLinks.length})</h2>
          <table className="admin">
            <thead>
              <tr>
                <th>Riga fornitore</th>
                <th>Abbina a</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingLinks.map((link) => (
                <AdminSupplierMatchRow key={link.id} linkId={link.id} supplierName={link.supplierName} supplierCode={link.supplierCode} products={products} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <h2 style={{ fontSize: 16, padding: "16px 16px 0" }}>Storico sincronizzazioni</h2>
        <table className="admin">
          <thead>
            <tr>
              <th>Data</th>
              <th>Origine</th>
              <th>Esito</th>
              <th>Aggiornati</th>
              <th>Da rivedere</th>
            </tr>
          </thead>
          <tbody>
            {syncLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.startedAt.toLocaleString("it-IT")}</td>
                <td>{log.source}</td>
                <td>
                  <span className="badge-status">{log.status}</span>
                </td>
                <td>{log.updatedCount}</td>
                <td>{log.errorCount}</td>
              </tr>
            ))}
            {syncLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nessuna importazione ancora eseguita.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
