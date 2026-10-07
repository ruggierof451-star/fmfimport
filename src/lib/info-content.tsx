export interface InfoPage {
  slug: string;
  title: string;
  body: React.ReactNode;
}

export function buildInfoPages(opts: { freeShip: string; shipFee: string; bulkThreshold: number }): InfoPage[] {
  const { freeShip, shipFee, bulkThreshold } = opts;
  return [
    {
      slug: "spedizioni",
      title: "Spedizioni",
      body: (
        <>
          <h3>Costi</h3>
          <p>
            Spedizione <b>gratuita</b> per ordini da {freeShip} in su. Sotto soglia: {shipFee}{" "}
            <span className="ph">[DA DEFINIRE]</span>.
          </p>
          <h3>Tempi</h3>
          <p>
            Preparazione e consegna: <span className="ph">[DA CONFERMARE IN BASE AL MODELLO LOGISTICO CON IL FORNITORE]</span>. Il
            tempo stimato è indicato in ogni scheda e nel checkout.
          </p>
          <h3>Tracking</h3>
          <p>Ricevi il numero di tracking via email appena il pacco viene affidato al corriere; lo trovi anche nell&apos;area ordini.</p>
          <h3>Imballaggio</h3>
          <p>I prodotti sigillati viaggiano in scatola rigida con protezioni sugli angoli.</p>
        </>
      ),
    },
    {
      slug: "resi",
      title: "Resi e diritto di recesso",
      body: (
        <>
          <p>
            Se acquisti come consumatore hai <b>14 giorni dalla consegna</b> per recedere dal contratto senza
            indicarne il motivo (artt. 52 e seguenti del Codice del Consumo).
          </p>
          <h3>Come fare</h3>
          <ul>
            <li>
              Scrivi a <span className="ph">[EMAIL]</span> o usa il modulo nella pagina Assistenza indicando il numero
              d&apos;ordine.
            </li>
            <li>Rispedisci il prodotto entro 14 giorni dalla comunicazione.</li>
            <li>Rimborsiamo entro 14 giorni dalla ricezione del recesso, con lo stesso metodo di pagamento.</li>
          </ul>
          <h3>Condizioni del prodotto</h3>
          <p>
            <span className="ph">[DA DEFINIRE CON IL LEGALE: costi di restituzione, gestione di prodotti aperti o con sigillo rimosso]</span>
          </p>
          <h3>Prodotti difettosi</h3>
          <p>Si applica la garanzia legale di conformità di 24 mesi.</p>
        </>
      ),
    },
    {
      slug: "privacy",
      title: "Privacy",
      body: (
        <>
          <p>
            <span className="ph">[INFORMATIVA DA REDIGERE CON IL CONSULENTE — Reg. UE 2016/679]</span>
          </p>
          <h3>Titolare</h3>
          <p>
            <span className="ph">[RAGIONE SOCIALE, SEDE, CONTATTI]</span>
          </p>
          <h3>Dati trattati</h3>
          <p>
            Dati di contatto e spedizione per evadere gli ordini; dati di fatturazione per obblighi fiscali; email
            per la newsletter solo con consenso.
          </p>
          <h3>Pagamenti</h3>
          <p>I dati delle carte sono gestiti dal provider di pagamento e non transitano sui nostri server.</p>
        </>
      ),
    },
    {
      slug: "condizioni",
      title: "Condizioni di vendita",
      body: (
        <>
          <p>
            <span className="ph">[TESTO COMPLETO DA REDIGERE CON IL LEGALE]</span>
          </p>
          <h3>Venditore</h3>
          <p>
            <span className="ph">[RAGIONE SOCIALE · P.IVA · SEDE · PEC]</span>
          </p>
          <h3>Prezzi</h3>
          <p>
            Prezzi in euro. Per quantità superiori a {bulkThreshold} pezzi dello stesso articolo si
            applica il prezzo quantità indicato in scheda. Il prezzo valido è quello mostrato al momento della
            conferma dell&apos;ordine.
          </p>
          <h3>Disponibilità</h3>
          <p>Le scorte sono aggiornate di continuo. Se un prodotto si esaurisce dopo l&apos;ordine ti avvisiamo e rimborsiamo l&apos;importo.</p>
          <h3>Preordini</h3>
          <p>I prodotti in preordine vengono spediti all&apos;uscita; la data stimata è indicata in scheda.</p>
        </>
      ),
    },
    {
      slug: "cookie",
      title: "Cookie",
      body: (
        <>
          <p>
            <span className="ph">[COOKIE POLICY DA REDIGERE]</span>
          </p>
          <p>
            Il sito usa cookie tecnici necessari al carrello e all&apos;accesso. Eventuali cookie di analisi o
            marketing vengono attivati solo con il tuo consenso.
          </p>
        </>
      ),
    },
    {
      slug: "chi-siamo",
      title: "Chi siamo",
      body: (
        <>
          <p>
            FMF Import nasce da <b>FMF Cards</b>, attività di vendita di carte collezionabili avviata online e
            cresciuta sulle live. Dopo anni passati a comprare, aprire e spedire migliaia di prodotti, abbiamo aperto
            il canale di importazione diretta.
          </p>
          <h3>Cosa facciamo</h3>
          <p>
            Importiamo prodotti sigillati Pokémon e One Piece dalle edizioni giapponese, cinese e coreana, e li
            rivendiamo a collezionisti e negozianti con prezzi uguali per tutti.
          </p>
          <h3>Perché senza registrazione</h3>
          <p>
            Nel nostro settore quasi tutti nascondono i prezzi dietro un login. Noi li mostriamo: puoi confrontare
            prima di decidere, e se compri in quantità lo sconto si applica da solo.
          </p>
          <h3>Dati societari</h3>
          <p>
            <span className="ph">[RAGIONE SOCIALE · P.IVA · SEDE · REA]</span>
          </p>
        </>
      ),
    },
    {
      slug: "come-funziona",
      title: "Come funziona",
      body: (
        <>
          <h3>1. Scegli</h3>
          <p>Il catalogo mostra solo prodotti effettivamente disponibili. Lingua, espansione e tipologia sono indicate in ogni scheda.</p>
          <h3>2. Il prezzo si adatta alla quantità</h3>
          <p>
            Fino a {bulkThreshold} pezzi dello stesso articolo paghi il prezzo pieno. Oltre {bulkThreshold}, il prezzo
            unitario scende in automatico nel carrello: nessun codice, nessuna richiesta da inviare.
          </p>
          <h3>3. Ordina come preferisci</h3>
          <p>
            Puoi comprare come ospite o con un account. Se hai partita IVA, inserisci i dati al checkout e ricevi la
            fattura elettronica.
          </p>
          <h3>4. Spedizione</h3>
          <p>Gratuita sopra {freeShip}. Imballaggio rinforzato e tracking via email.</p>
          <h3>5. Dopo l&apos;acquisto</h3>
          <p>Trovi stato dell&apos;ordine e tracking nella tua area account. Hai 14 giorni di tempo per il recesso.</p>
        </>
      ),
    },
    {
      slug: "contatti",
      title: "Contatti",
      body: (
        <>
          <h3>Assistenza clienti</h3>
          <p>
            Email: <span className="ph">[EMAIL]</span>
            <br />
            WhatsApp: <span className="ph">[NUMERO]</span>
            <br />
            Orari: <span className="ph">[ORARI]</span>
          </p>
          <h3>Ordini all&apos;ingrosso</h3>
          <p>
            Per volumi continuativi scrivi a <span className="ph">[EMAIL INGROSSO]</span> oppure usa il modulo nella
            pagina Ingrosso.
          </p>
          <h3>Sede</h3>
          <p>
            <span className="ph">[INDIRIZZO]</span>
          </p>
        </>
      ),
    },
  ];
}
