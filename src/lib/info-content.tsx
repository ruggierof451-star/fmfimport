export interface InfoPage {
  slug: string;
  title: string;
  body: React.ReactNode;
}

export function buildInfoPages(opts: {
  freeShip: string;
  shipFee: string;
  bulkThreshold: number;
  invoiceVatRate: string;
}): InfoPage[] {
  const { freeShip, shipFee, bulkThreshold, invoiceVatRate } = opts;
  return [
    {
      slug: "spedizioni",
      title: "Spedizioni",
      body: (
        <>
          <h3>Costi</h3>
          <p>
            Spedizione <b>gratuita</b> per ordini da {freeShip} in su. Sotto soglia: {shipFee}.
          </p>
          <h3>Tempi</h3>
          <p>
            I prodotti già in stock vengono preparati e affidati al corriere entro 1-3 giorni lavorativi dalla
            conferma del pagamento. I preordini vengono spediti all&apos;uscita del prodotto, con la data stimata
            indicata in ogni scheda e nel checkout.
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
          <h3>Diritto di recesso (acquisti come consumatore privato)</h3>
          <p>
            Se acquisti come privato hai diritto di recedere dal contratto <b>entro 14 giorni</b> dalla consegna,
            senza bisogno di motivazione, ai sensi degli artt. 52-59 del Codice del Consumo (D.Lgs. 206/2005). Per
            esercitare il recesso contattaci dalla pagina <a href="/assistenza">Centro assistenza</a> indicando il
            numero d&apos;ordine entro il termine indicato. Il prodotto va restituito integro, nella confezione
            originale e nelle stesse condizioni in cui è stato ricevuto, entro 14 giorni dalla comunicazione di
            recesso; le spese di spedizione del reso sono a carico del cliente. Il rimborso avviene entro 14 giorni
            dal ricevimento del reso, con lo stesso mezzo di pagamento usato per l&apos;acquisto.
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            Il diritto di recesso non si applica agli acquisti effettuati con partita IVA per l&apos;attività
            professionale (B2B).
          </p>
          <h3>Prodotti danneggiati o mancanti</h3>
          <p>
            Indipendentemente dal recesso, se un prodotto arriva <b>danneggiato o mancante</b> contattaci entro 7
            giorni dalla consegna dalla pagina <a href="/assistenza">Centro assistenza</a>, indicando il numero
            d&apos;ordine e allegando foto del danno o dell&apos;articolo mancante: valutiamo la richiesta e
            confermiamo sostituzione o rimborso, senza spese a tuo carico.
          </p>
        </>
      ),
    },
    {
      slug: "privacy",
      title: "Privacy",
      body: (
        <>
          <p>Informativa ai sensi degli artt. 13-14 del Regolamento UE 2016/679 (GDPR).</p>
          <h3>Titolare del trattamento</h3>
          <p>
            FMF Cards S.R.L.S. · Traversa Garibaldi 24, 80040 Striano (NA), Italia · P.IVA 11105221219
            <br />
            Email: fmfcardssrls@gmail.com · PEC: fmfcardssrls@legalmail.it
          </p>
          <h3>Dati trattati e finalità</h3>
          <ul>
            <li>Dati di contatto e spedizione (nome, indirizzo, email, telefono): per evadere gli ordini e comunicare lo stato di spedizione.</li>
            <li>Dati di fatturazione (ragione sociale, P.IVA, codice SDI): per adempiere agli obblighi fiscali.</li>
            <li>Email e cronologia ordini: per gestire l&apos;account cliente e l&apos;assistenza post-vendita.</li>
            <li>Email per comunicazioni promozionali: solo con consenso esplicito, revocabile in ogni momento.</li>
          </ul>
          <h3>Base giuridica e conservazione</h3>
          <p>
            Il trattamento si basa sull&apos;esecuzione del contratto di vendita e sugli obblighi di legge (fiscali e
            contabili); per le comunicazioni promozionali si basa sul consenso. I dati relativi agli ordini sono
            conservati per il periodo previsto dalla normativa fiscale (10 anni); i dati dell&apos;account restano
            fino alla richiesta di cancellazione.
          </p>
          <h3>Comunicazione a terzi</h3>
          <p>
            I dati necessari alla consegna sono condivisi con i corrieri incaricati della spedizione. I dati di
            pagamento sono gestiti direttamente dal provider di pagamento e non transitano né vengono conservati sui
            nostri server.
          </p>
          <h3>Diritti dell&apos;interessato</h3>
          <p>
            Puoi richiedere accesso, rettifica, cancellazione o limitazione del trattamento, nonché la portabilità
            dei dati e la revoca del consenso, scrivendo a fmfcardssrls@gmail.com. Hai inoltre diritto di proporre
            reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
          </p>
        </>
      ),
    },
    {
      slug: "condizioni",
      title: "Condizioni di vendita",
      body: (
        <>
          <p>
            Le presenti condizioni regolano la vendita a distanza dei prodotti offerti su questo sito da FMF Cards
            S.R.L.S. Effettuando un ordine accetti integralmente queste condizioni.
          </p>
          <h3>Venditore</h3>
          <p>
            FMF Cards S.R.L.S. · P.IVA 11105221219 · Sede legale: Traversa Garibaldi 24, 80040 Striano (NA), Italia
            <br />
            PEC: fmfcardssrls@legalmail.it · Email: fmfcardssrls@gmail.com
          </p>
          <h3>Prezzi</h3>
          <p>
            Tutti i prezzi esposti sul sito sono <b>IVA inclusa</b> (aliquota {invoiceVatRate}%). Per quantità
            superiori a {bulkThreshold} pezzi dello stesso articolo si applica il prezzo quantità indicato in
            scheda. Il prezzo valido è quello mostrato al momento della conferma dell&apos;ordine.
          </p>
          <h3>Fatturazione e IVA</h3>
          <p>
            Il cliente che richiede la fattura con partita IVA al checkout non paga alcun supplemento: la fattura
            riporta semplicemente l&apos;IVA al {invoiceVatRate}% già compresa nel totale dell&apos;ordine.
          </p>
          <h3>Disponibilità</h3>
          <p>Le scorte sono aggiornate di continuo. Se un prodotto si esaurisce dopo l&apos;ordine ti avvisiamo e rimborsiamo l&apos;importo.</p>
          <h3>Preordini</h3>
          <p>I prodotti in preordine vengono spediti all&apos;uscita; la data stimata è indicata in scheda.</p>
          <h3>Diritto di recesso</h3>
          <p>
            Se acquisti come consumatore privato hai diritto di recesso entro 14 giorni dalla consegna: vedi i
            dettagli nella pagina <a href="/resi">Resi e diritto di recesso</a>.
          </p>
          <h3>Legge applicabile e foro competente</h3>
          <p>
            Il contratto è regolato dalla legge italiana. Per i consumatori resta ferma la competenza del foro del
            luogo di residenza o domicilio, se in Italia. Per le controversie online puoi inoltre utilizzare la
            piattaforma europea ODR all&apos;indirizzo ec.europa.eu/consumers/odr.
          </p>
        </>
      ),
    },
    {
      slug: "cookie",
      title: "Cookie",
      body: (
        <>
          <p>
            Questa pagina descrive i cookie utilizzati dal sito fmfimport.it e come gestirli.
          </p>
          <h3>Cookie tecnici</h3>
          <p>
            Necessari al funzionamento del sito: mantengono il contenuto del carrello e la sessione di accesso
            all&apos;account. Non richiedono consenso e non possono essere disattivati senza compromettere l&apos;uso
            del sito.
          </p>
          <h3>Cookie di analisi e marketing</h3>
          <p>
            Vengono attivati solo con il tuo consenso esplicito, dato tramite il banner mostrato alla prima visita.
            Puoi modificare la scelta in qualsiasi momento cancellando i cookie dal browser e ricaricando la pagina.
          </p>
          <h3>Gestione da browser</h3>
          <p>
            Puoi inoltre bloccare o eliminare i cookie dalle impostazioni del tuo browser; questo potrebbe limitare
            alcune funzionalità del sito (es. carrello).
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
            FMF Cards S.R.L.S. · P.IVA 11105221219 · Sede legale: Traversa Garibaldi 24, 80040 Striano (NA), Italia
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
          <p>
            Trovi stato dell&apos;ordine e tracking nella tua area account. Hai 7 giorni di tempo per segnalare un
            reso in caso di prodotto danneggiato o mancante.
          </p>
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
            Email: fmfcardssrls@gmail.com
            <br />
            Rispondiamo dal martedì al venerdì, dalle 8:00 alle 19:00.
          </p>
          <h3>Ordini all&apos;ingrosso</h3>
          <p>
            Per volumi continuativi scrivi a fmfcardssrls@gmail.com oppure usa il modulo nella pagina Ingrosso.
          </p>
          <h3>Sede legale</h3>
          <p>FMF Cards S.R.L.S. · Traversa Garibaldi 24, 80040 Striano (NA), Italia</p>
        </>
      ),
    },
  ];
}
