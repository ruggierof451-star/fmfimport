import Link from "next/link";

export interface InfoPage {
  slug: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Testi delle pagine informative. Vanno tenuti allineati a quello che il sito fa
 * davvero: niente promesse che il sistema non mantiene (es. date di uscita dei
 * preordini, che non esistono come dato) e niente riferimenti a funzioni rimosse.
 */
export function buildInfoPages(opts: {
  freeShip: string;
  shipFee: string;
  invoiceVatRate: string;
}): InfoPage[] {
  const { freeShip, shipFee, invoiceVatRate } = opts;
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
            I prodotti disponibili vengono preparati e affidati al corriere entro 1-3 giorni lavorativi dalla
            conferma del pagamento. Se paghi con carta la conferma è immediata; con bonifico i tempi partono da
            quando il bonifico risulta accreditato.
          </p>
          <h3>Preordini</h3>
          <p>
            I prodotti in preordine, segnalati come tali nella scheda, vengono spediti alla loro uscita: ti
            avvisiamo via email quando partono. Se un ordine contiene sia prodotti disponibili sia preordini,
            aspettiamo di averli tutti e spediamo una volta sola, salvo diverso accordo.
          </p>
          <h3>Tracking</h3>
          <p>
            Ricevi il numero di tracking via email appena il pacco viene affidato al corriere; lo trovi anche
            nell&apos;area ordini del tuo account.
          </p>
          <h3>Imballaggio</h3>
          <p>I prodotti sigillati viaggiano in scatola rigida con protezioni sugli angoli.</p>
          <h3>Dove spediamo</h3>
          <p>Spediamo in Italia. Per spedizioni all&apos;estero scrivici prima di ordinare.</p>
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
            esercitare il recesso contattaci dalla pagina <Link href="/assistenza">Centro assistenza</Link> indicando
            il numero d&apos;ordine entro il termine indicato. Il prodotto va restituito integro, nella confezione
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
            giorni dalla consegna dalla pagina <Link href="/assistenza">Centro assistenza</Link>, indicando il numero
            d&apos;ordine e allegando foto del danno o dell&apos;articolo mancante: valutiamo la richiesta e
            confermiamo sostituzione o rimborso, senza spese a tuo carico.
          </p>
          <h3>Prodotti con difetti estetici dichiarati</h3>
          <p>
            Alcuni prodotti possono essere venduti con la confezione esterna danneggiata, e in questo caso è
            indicato chiaramente nella scheda insieme al prezzo ridotto. Il difetto già dichiarato al momento
            dell&apos;acquisto non dà diritto a sostituzione o rimborso, ma resta valido il diritto di recesso.
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
            <li>Dati di contatto e spedizione (nome, indirizzo, email, telefono): per evadere gli ordini e comunicare lo stato della spedizione.</li>
            <li>Dati aziendali (ragione sociale, P.IVA, codice SDI): solo per i rivenditori approvati, per emettere fattura e adempiere agli obblighi fiscali.</li>
            <li>Email e cronologia ordini: per gestire l&apos;account cliente e l&apos;assistenza post-vendita.</li>
            <li>Email per offerte e novità: solo con consenso esplicito, dato in registrazione, al checkout o dal modulo newsletter, e revocabile in ogni momento dal link presente in fondo a ogni email promozionale.</li>
            <li>Messaggi inviati dal Centro assistenza: per rispondere alle richieste.</li>
          </ul>
          <h3>Base giuridica e conservazione</h3>
          <p>
            Il trattamento si basa sull&apos;esecuzione del contratto di vendita e sugli obblighi di legge (fiscali e
            contabili); per le comunicazioni promozionali si basa sul consenso. I dati relativi agli ordini sono
            conservati per il periodo previsto dalla normativa fiscale (10 anni); i dati dell&apos;account restano
            fino alla richiesta di cancellazione; il consenso promozionale resta fino alla revoca.
          </p>
          <h3>Fornitori che trattano dati per nostro conto</h3>
          <p>
            Per far funzionare il sito ci appoggiamo a fornitori che agiscono come responsabili del trattamento, nei
            limiti strettamente necessari al servizio:
          </p>
          <ul>
            <li>Vercel: pubblicazione del sito e misurazione anonima delle visite (senza cookie).</li>
            <li>Neon: database in cui sono conservati account, ordini e contenuti del sito.</li>
            <li>Stripe: pagamenti con carta. I dati della carta vengono inseriti sulle pagine di Stripe e non transitano né vengono conservati da noi.</li>
            <li>Resend: invio delle email (conferme d&apos;ordine, aggiornamenti, recupero password, newsletter).</li>
            <li>Corrieri incaricati della spedizione: i soli dati necessari alla consegna.</li>
          </ul>
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
            Tutti i prezzi esposti sul sito sono <b>IVA inclusa</b> (aliquota {invoiceVatRate}%), visibili senza
            registrazione e uguali per tutti i clienti. Il prezzo valido è quello mostrato al momento della conferma
            dell&apos;ordine. I rivenditori approvati con partita IVA accedono a un listino dedicato, che può
            prevedere prezzi diversi in base alla quantità acquistata: vedi la pagina{" "}
            <Link href="/lavora-con-noi">Lavora con noi</Link>.
          </p>
          <h3>Pagamenti</h3>
          <p>
            Puoi pagare con <b>carta di credito o debito</b>, tramite Stripe: al momento del pagamento vieni portato
            su una pagina sicura di Stripe e, appena il pagamento risulta riuscito, l&apos;ordine viene confermato in
            automatico. In alternativa puoi pagare con <b>bonifico bancario</b>: le coordinate arrivano via email
            subito dopo l&apos;ordine, che resta in attesa finché il bonifico non risulta accreditato. Indica sempre
            il numero d&apos;ordine come causale.
          </p>
          <h3>Codici sconto</h3>
          <p>
            Gli eventuali codici sconto si applicano al totale dei prodotti, prima delle spese di spedizione. Ogni
            codice può avere una scadenza, un numero massimo di utilizzi complessivi e un limite di utilizzi per
            cliente; si applica un solo codice per ordine.
          </p>
          <h3>Fatturazione e IVA</h3>
          <p>
            La fattura è riservata ai rivenditori registrati e approvati tramite la pagina{" "}
            <Link href="/lavora-con-noi">Lavora con noi</Link>: per loro non comporta alcun supplemento, riporta
            semplicemente l&apos;IVA al {invoiceVatRate}% già compresa nel totale dell&apos;ordine. Per tutti gli
            altri clienti il documento d&apos;acquisto è la conferma d&apos;ordine ricevuta via email.
          </p>
          <h3>Disponibilità</h3>
          <p>
            Le quantità disponibili sono aggiornate a mano man mano che arrivano e partono i prodotti. Se un
            prodotto risulta esaurito dopo che hai ordinato, ti avvisiamo e rimborsiamo l&apos;importo
            corrispondente.
          </p>
          <h3>Preordini</h3>
          <p>
            I prodotti in preordine sono segnalati nella scheda e vengono spediti alla loro uscita. Se la data di
            uscita viene spostata dal produttore, te lo comunichiamo e puoi scegliere di annullare l&apos;ordine
            ottenendo il rimborso.
          </p>
          <h3>Diritto di recesso</h3>
          <p>
            Se acquisti come consumatore privato hai diritto di recesso entro 14 giorni dalla consegna: vedi i
            dettagli nella pagina <Link href="/resi">Resi e diritto di recesso</Link>.
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
          <p>Questa pagina descrive i cookie e gli strumenti di misurazione usati da questo sito.</p>
          <h3>Cookie tecnici</h3>
          <p>
            Sono gli unici cookie che il sito installa e servono a farlo funzionare: mantengono il contenuto del
            carrello, la sessione di accesso all&apos;account e la scelta fatta sull&apos;avviso dei cookie. Non
            richiedono consenso e non possono essere disattivati senza compromettere l&apos;uso del sito.
          </p>
          <h3>Misurazione delle visite</h3>
          <p>
            Contiamo visite e pagine viste con uno strumento di Vercel che <b>non usa cookie</b> e non crea profili:
            non raccoglie dati che permettano di risalire a una persona e non viene usato per pubblicità. Per questo
            non è richiesto un consenso.
          </p>
          <h3>Cookie di profilazione e pubblicità</h3>
          <p>
            Al momento <b>non ne usiamo</b>. Se in futuro dovessimo introdurli, verranno attivati solo dopo un tuo
            consenso esplicito e questa pagina sarà aggiornata.
          </p>
          <h3>Gestione da browser</h3>
          <p>
            Puoi bloccare o eliminare i cookie dalle impostazioni del tuo browser; questo potrebbe limitare alcune
            funzionalità del sito, come il carrello e l&apos;accesso all&apos;account.
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
            <b>FMF Cards</b> nasce da un&apos;attività di vendita di carte collezionabili avviata online e cresciuta
            sulle live. Dopo anni passati a comprare, aprire e spedire migliaia di prodotti, abbiamo aperto il canale
            di importazione diretta.
          </p>
          <h3>Cosa facciamo</h3>
          <p>
            Vendiamo prodotti sigillati <b>Pokémon</b>, <b>One Piece</b>, <b>Yu-Gi-Oh!</b> e <b>Dragon Ball</b>: dalle
            edizioni italiane a quelle di importazione giapponese, cinese e coreana. Ci rivolgiamo sia ai
            collezionisti sia ai negozianti.
          </p>
          <h3>Perché senza registrazione</h3>
          <p>
            Nel nostro settore quasi tutti nascondono i prezzi dietro un login. Noi li mostriamo: puoi confrontare
            prima di decidere, senza dover creare un account.
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
          <p>
            Nel catalogo trovi gioco, lingua, espansione e tipologia di ogni prodotto. Quelli non più disponibili
            restano visibili ma sono segnalati come esauriti e non si possono aggiungere al carrello.
          </p>
          <h3>2. Prezzo unico, per tutti</h3>
          <p>
            Il prezzo che vedi in scheda è quello che paghi, senza bisogno di un account. Ogni tanto pubblichiamo
            codici sconto validi per tutti. Se hai una partita IVA e acquisti per rivendere, puoi richiedere
            l&apos;accesso a un listino dedicato, con prezzi che scendono in base alla quantità, dalla pagina{" "}
            <Link href="/lavora-con-noi">Lavora con noi</Link>.
          </p>
          <h3>3. Ordina come preferisci</h3>
          <p>
            Puoi comprare come ospite o con un account. Si paga con carta, tramite Stripe, oppure con bonifico
            bancario: in quel caso ricevi le coordinate via email e l&apos;ordine parte quando il pagamento risulta
            accreditato. I rivenditori approvati possono richiedere la fattura al momento dell&apos;ordine.
          </p>
          <h3>4. Spedizione</h3>
          <p>Gratuita sopra {freeShip}. Imballaggio rinforzato e tracking via email.</p>
          <h3>5. Dopo l&apos;acquisto</h3>
          <p>
            Trovi stato dell&apos;ordine e tracking nella tua area account. Se acquisti come privato hai 14 giorni
            dalla consegna per il diritto di recesso; se un prodotto arriva danneggiato o manca dalla confezione,
            segnalacelo entro 7 giorni. Tutti i dettagli nella pagina{" "}
            <Link href="/resi">Resi e diritto di recesso</Link>.
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
          <h3>Rivenditori e distribuzione</h3>
          <p>
            Hai una partita IVA e vuoi rivendere i nostri prodotti? Scrivi a fmfcardssrls@gmail.com oppure compila
            il modulo nella pagina <Link href="/lavora-con-noi">Lavora con noi</Link>.
          </p>
          <h3>Sede legale</h3>
          <p>FMF Cards S.R.L.S. · Traversa Garibaldi 24, 80040 Striano (NA), Italia</p>
        </>
      ),
    },
  ];
}
