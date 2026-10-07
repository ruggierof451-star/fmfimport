import Link from "next/link";

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap cols">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
          <Link href="/" className="logo" aria-label="FMF Import">
            <b>FMF</b>
            <span>IMPORT</span>
          </Link>
          <p style={{ margin: 0, fontSize: 14, maxWidth: 290 }}>
            Booster box, display e prodotti sigillati Pokémon e One Piece in edizione giapponese, cinese e coreana.
            Per collezionisti e negozianti.
          </p>
        </div>
        <div>
          <h3>Negozio</h3>
          <nav aria-label="Negozio">
            <Link href="/novita">Novità</Link>
            <Link href="/pokemon-jp">Pokémon JP</Link>
            <Link href="/pokemon-cn">Pokémon CN</Link>
            <Link href="/pokemon-kr">Pokémon KR</Link>
            <Link href="/one-piece-jp">One Piece JP</Link>
            <Link href="/one-piece-cn">One Piece CN</Link>
            <Link href="/bgrade">B-Grade</Link>
          </nav>
        </div>
        <div>
          <h3>Azienda</h3>
          <nav aria-label="Azienda">
            <Link href="/chi-siamo">Chi siamo</Link>
            <Link href="/come-funziona">Come funziona</Link>
            <Link href="/negozianti">Ingrosso</Link>
            <Link href="/assistenza">Centro assistenza</Link>
            <Link href="/contatti">Contatti</Link>
          </nav>
        </div>
        <div>
          <h3>Informazioni</h3>
          <nav aria-label="Informazioni legali">
            <Link href="/spedizioni">Spedizioni</Link>
            <Link href="/resi">Resi e recesso</Link>
            <Link href="/condizioni">Condizioni di vendita</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookie">Cookie</Link>
          </nav>
          <p style={{ fontSize: 13, margin: "14px 0 0" }}>Pagamenti: carta, PayPal, bonifico</p>
        </div>
      </div>
      <div className="legal">
        <div className="wrap">
          <span>
            © 2026 FMF Import · <span className="ph">[RAGIONE SOCIALE · P.IVA · SEDE]</span>
          </span>
          <span style={{ maxWidth: 640 }}>
            Pokémon e One Piece sono marchi dei rispettivi titolari. FMF Import è un rivenditore indipendente, non
            affiliato né approvato dai titolari dei marchi.
          </span>
        </div>
      </div>
    </footer>
  );
}
