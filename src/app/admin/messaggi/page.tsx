import { prisma } from "@/lib/prisma";
import { AdminMessageRow } from "@/components/admin-message-row";

export const metadata = { title: "Admin · Messaggi" };

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>
        Messaggi ({messages.length})
        {messages.some((m) => !m.read) ? (
          <span className="badge-status" style={{ marginLeft: 10, fontSize: 13 }}>
            {messages.filter((m) => !m.read).length} da leggere
          </span>
        ) : null}
      </h1>
      <p className="muted" style={{ margin: 0 }}>
        Richieste arrivate dal modulo &quot;Scrivici&quot; del Centro assistenza.
      </p>

      {messages.length === 0 ? (
        <div className="admin-card">
          <p className="muted" style={{ margin: 0 }}>Nessun messaggio ricevuto.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m) => (
            <AdminMessageRow key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  );
}
