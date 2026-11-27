"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { importContactsAction, removeContactAction, updateContactInterestsAction } from "@/lib/marketing-actions";

interface Contact {
  email: string;
  firstName: string | null;
  status: "SUBSCRIBED" | "PENDING";
  sources: string[];
  segments: string[];
  interests: string[];
  since: string | null;
}

const SOURCE_LABEL: Record<string, string> = { account: "Account", newsletter: "Newsletter", import: "Importato" };
const INTERESTS = [
  { key: "pokemon", label: "Pokémon" },
  { key: "onepiece", label: "One Piece" },
  { key: "yugioh", label: "Yu-Gi-Oh!" },
  { key: "dragonball", label: "Dragon Ball" },
];

export function AdminMarketingContacts({ contacts, segments }: { contacts: Contact[]; segments: { key: string; label: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("");
  const [showPending, setShowPending] = useState(true);
  const [csv, setCsv] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftInterests, setDraftInterests] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return contacts.filter(
      (c) =>
        (showPending || c.status === "SUBSCRIBED") &&
        (!segment || c.segments.includes(segment)) &&
        (!term || c.email.includes(term) || (c.firstName ?? "").toLowerCase().includes(term))
    );
  }, [contacts, q, segment, showPending]);

  const subscribed = contacts.filter((c) => c.status === "SUBSCRIBED").length;
  const pending = contacts.length - subscribed;
  const segLabel = (k: string) => segments.find((s) => s.key === k)?.label ?? k;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {msg ? <div className={`alert ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

      <div className="admin-card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="fl" style={{ flex: "2 1 220px" }}>
          Cerca
          <input className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email o nome" />
        </label>
        <label className="fl" style={{ flex: "1 1 200px" }}>
          Gruppo
          <select className="in" value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">Tutti</option>
            {segments.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="check" style={{ fontSize: 14, paddingBottom: 10 }}>
          <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />
          Mostra in attesa di conferma ({pending})
        </label>
        {/* download di un file CSV: serve un link normale, non la navigazione interna di Next */}
        <a className="btn btn-line btn-sm" href="/api/admin/marketing/contatti" download style={{ marginBottom: 4 }}>
          Esporta CSV
        </a>
      </div>

      <div className="muted" style={{ fontSize: 13 }}>
        {subscribed} iscritti confermati{pending ? ` · ${pending} in attesa di conferma` : ""} · {filtered.length} mostrati
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nome</th>
              <th>Provenienza</th>
              <th>Gruppi</th>
              <th>Dal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((c) => (
              <tr key={c.email}>
                <td>
                  {c.email}
                  {c.status === "PENDING" ? <span className="muted"> · in attesa di conferma</span> : null}
                </td>
                <td>{c.firstName ?? "—"}</td>
                <td>{c.sources.map((s) => SOURCE_LABEL[s] ?? s).join(", ")}</td>
                <td style={{ fontSize: 12 }}>
                  {editing === c.email ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {INTERESTS.map((i) => (
                        <label key={i.key} className="check">
                          <input
                            type="checkbox"
                            checked={draftInterests.includes(i.key)}
                            onChange={() => setDraftInterests((p) => (p.includes(i.key) ? p.filter((x) => x !== i.key) : [...p, i.key]))}
                          />
                          {i.label}
                        </label>
                      ))}
                    </div>
                  ) : (
                    c.segments.filter((s) => s !== "all").map(segLabel).join(", ") || "—"
                  )}
                </td>
                <td>{c.since ? new Date(c.since).toLocaleDateString("it-IT") : "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {c.sources.some((s) => s !== "account") ? (
                    editing === c.email ? (
                      <button
                        type="button"
                        className="btn btn-line btn-sm"
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy("int");
                          const r = await updateContactInterestsAction({ email: c.email, interests: draftInterests });
                          setBusy("");
                          setEditing(null);
                          setMsg(r.ok ? { ok: true, text: "Interessi aggiornati." } : { ok: false, text: r.error ?? "Errore." });
                          router.refresh();
                        }}
                      >
                        Salva
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-line btn-sm"
                        onClick={() => {
                          setEditing(c.email);
                          setDraftInterests(c.interests);
                        }}
                      >
                        Interessi
                      </button>
                    )
                  ) : null}{" "}
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: "transparent", border: "1px solid #B33", color: "#E55" }}
                    disabled={!!busy}
                    onClick={async () => {
                      if (!confirm(`Togliere ${c.email} dalle email di marketing? Non riceverà più campagne.`)) return;
                      setBusy("rm");
                      const r = await removeContactAction({ email: c.email });
                      setBusy("");
                      setMsg(r.ok ? { ok: true, text: `${c.email} rimosso.` } : { ok: false, text: r.error ?? "Errore." });
                      router.refresh();
                    }}
                  >
                    Rimuovi
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nessun contatto.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
        <b>Aggiungi o importa contatti</b>
        <span className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Una persona per riga: <code>email, nome, interessi</code> (nome e interessi facoltativi; interessi tra Pokémon, One Piece,
          Yu-Gi-Oh!, Dragon Ball). Puoi incollare anche le colonne copiate da Excel o Google Fogli. Massimo 2.000 righe per volta.
        </span>
        <textarea
          className="in"
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"mario@esempio.it, Mario, Pokémon One Piece\nanna@esempio.it, Anna"}
          style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}
        />
        <label className="check" style={{ fontSize: 13, alignItems: "flex-start" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Confermo che queste persone hanno acconsentito a ricevere email promozionali da FMF Cards (obbligatorio per legge).
        </label>
        <button
          type="button"
          className="btn btn-dark btn-sm"
          style={{ alignSelf: "flex-start" }}
          disabled={!!busy || !csv.trim() || !consent}
          onClick={async () => {
            setBusy("imp");
            setMsg(null);
            const r = await importContactsAction({ csv, consent });
            setBusy("");
            if (r.ok) {
              setMsg({
                ok: true,
                text: `${r.added ?? 0} aggiunti, ${r.updated ?? 0} aggiornati.${r.invalid?.length ? ` Non validi: ${r.invalid.join(", ")}` : ""}`,
              });
              setCsv("");
              setConsent(false);
              router.refresh();
            } else setMsg({ ok: false, text: r.error ?? "Importazione non riuscita." });
          }}
        >
          {busy === "imp" ? "Importazione…" : "Aggiungi contatti"}
        </button>
      </div>
    </div>
  );
}
