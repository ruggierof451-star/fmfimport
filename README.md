# FMF Import

E-commerce Pokémon / One Piece (box, display, prodotti sigillati JP/CN/KR), costruito su Next.js 16 + Prisma +
SQLite, a partire dal prototipo grafico (`reference-prototype.html`, conservato come riferimento visivo).

## Avvio rapido

Requisiti: Node.js 20+ (il progetto è stato creato e testato con Node 24) e npm.

```bash
npm install
cp .env.example .env     # poi genera AUTH_SECRET e imposta ADMIN_SEED_EMAIL/PASSWORD, vedi sotto
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Apri http://localhost:3000. L'account admin creato dal seed accede da `/account` con le credenziali che hai messo in
`ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`, poi trova il pannello su `/admin`.

### Test e type-check

```bash
npm test          # vitest — motore prezzi + abbinamento fornitore (23 test)
npx tsc --noEmit   # type-check
npm run build      # build di produzione (verifica tutte le 28 rotte)
```

## Variabili d'ambiente (`.env`)

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | sì | Connessione DB. In sviluppo è un file SQLite (`file:./dev.db`); vedi sotto per passare a Postgres. |
| `AUTH_SECRET` | sì | Chiave per firmare i cookie di sessione. Generala con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Diversa tra sviluppo e produzione. |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | solo per il seed | Credenziali del primo account amministratore. Cambia la password subito dopo il primo accesso. |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | no | Lasciale vuote: il checkout resta in **modalità test** (nessun addebito reale) finché non le imposti. Vedi "Cosa manca prima di pubblicare". |
| `SITE_URL` | no | Dominio pubblico, usato da `sitemap.xml`. |

Non committare mai `.env` con valori reali: è già escluso da `.gitignore` (resta tracciato solo `.env.example`).

## Architettura

- **Next.js 16 (App Router, TypeScript)** — frontend e backend nello stesso progetto.
- **Prisma + SQLite** (`prisma/schema.prisma`) — passare a Postgres in produzione richiede solo cambiare
  `provider` in `postgresql` e `DATABASE_URL`; lo schema stesso non usa feature specifiche di SQLite.
- **Sessioni**: cookie HttpOnly firmato (JWT via `jose`), password con `bcryptjs`. Nessuna libreria di auth esterna.
- **Motore prezzi** (`src/lib/pricing.ts`): tutti gli importi in centesimi interi (mai `Float`) per evitare
  arrotondamenti a sorpresa. Coperto da test unitari (`src/lib/pricing.test.ts`).
- **I prezzi non sono mai calcolati o fidati lato client.** Il carrello tiene solo `{productId, quantity}` in
  `localStorage`; ogni volta che cambia, il browser chiama `POST /api/cart/quote`, che rilegge i prodotti dal
  database e ricalcola tutto da zero (prezzo, sconto quantità, spedizione, disponibilità). Il checkout
  (`POST /api/checkout`) rifà lo stesso calcolo prima di creare l'ordine: un prezzo manomesso nel browser non ha
  alcun effetto.
- **Catalogo fornitore**: `src/lib/supplier-match.ts` implementa l'abbinamento "codice esatto → nome normalizzato
  esatto → tutto il resto è ambiguo e va rivisto a mano", testato in `supplier-match.test.ts`.

## Struttura del catalogo

Il seed (`prisma/seed.ts`) carica gli stessi ~220 titoli pubblici Toreca Import già presenti nel prototipo
grafico, con la stessa classificazione automatica (gioco/lingua/tipologia dal nome). **I costi caricati dal seed
sono stime** (`costIsEstimated: true`), non prezzi reali del fornitore — esattamente come nel prototipo. Ogni
prodotto con costo stimato mostra "indicativo" accanto al prezzo pubblico finché un'importazione reale non lo
sostituisce.

## Aggiornare prezzi e disponibilità

Non esiste (e non è stata inventata) un'integrazione API con Toreca. L'aggiornamento è manuale via `/admin/import`:

1. Esporta dal tuo account Toreca un file CSV o XLSX con almeno le colonne: nome prodotto, e idealmente codice
   prodotto, costo e scorta. Nomi di colonna riconosciuti (anche in italiano): `name`/`nome`, `code`/`codice`,
   `cost_net`/`costo_netto` (o `cost`/`costo`, assunto IVA inclusa se non specifichi "netto"), `stock`/`scorta`.
2. Carica il file in `/admin/import`. Il sistema abbina automaticamente solo quando è **certo** (codice prodotto
   identico, o nome normalizzato identico): in quel caso aggiorna costo/scorta del prodotto e lo segna come non più
   stimato.
3. Tutto il resto (nessuna corrispondenza, o più di una possibile) finisce nella lista "Da abbinare manualmente"
   nella stessa pagina: scegli tu il prodotto giusto dal catalogo, o ignora la riga.
4. Ogni importazione lascia una riga in "Storico sincronizzazioni" con esito, conteggi e la lista di cosa non è
   stato abbinato.

Le regole di ricarico/IVA/soglia spedizione gratuita si cambiano in `/admin/impostazioni` e si applicano
immediatamente a tutto il catalogo.

### Perché non c'è lettura automatica del sito Toreca

Il browser di questa sessione non aveva un accesso già autenticato al tuo account Toreca, quindi non è stato letto
né "scrapato" nulla dal sito: i prezzi di costo attuali sono stime, chiaramente marcate come tali. Se vuoi
un'importazione semi-automatica dal tuo account (es. leggendo una pagina export già autenticata), va fatta con te
presente al browser — non sono state salvate né richieste credenziali.

## Cosa è completo

- Catalogo, ricerca, filtri combinabili (gioco/lingua/tipologia/prezzo/condizione), ordinamento, paginazione
  progressiva — tutto server-side e con URL leggibili/condivisibili.
- Scheda prodotto con fasce di prezzo, prodotti correlati, edizioni gemelle (stessa espansione in altra lingua).
- Carrello persistente, drawer laterale, barra spedizione gratuita, prezzo quantità (oltre la soglia configurata).
- Checkout con validazione, fatturazione (P.IVA/SDI), tre metodi di pagamento **in modalità test** (nessun addebito
  reale: serve collegare un gateway reale, vedi sotto), ricalcolo totale server-side, verifica scorte.
- Numero ordine univoco, pagina di conferma, storico ordini nell'area cliente.
- Autenticazione reale (registrazione/login/logout, password con hash), ruoli CUSTOMER/RESELLER/ADMIN.
- Pannello admin: prodotti (costo, IVA, scorta, pubblicazione, abbinamento fornitore, registro modifiche), ordini
  (ricerca, cambio stato con cronologia, corriere/tracking), regole di prezzo, importazione CSV/XLSX con revisione
  manuale degli abbinamenti ambigui.
- Pagina rivenditori con prezzi IVA esclusa.
- Pagine informative (spedizioni, resi, privacy, condizioni, cookie, chi siamo, come funziona, contatti, FAQ) con i
  campi da completare col legale/commercialista chiaramente segnati `[DA DEFINIRE]`.
- SEO: metadati per pagina, `sitemap.xml`, `robots.txt`, URL leggibili, pagina 404 personalizzata.
- Test automatici: motore prezzi (16 test) e abbinamento fornitore (7 test), tutti verdi; build di produzione
  pulita; verificato manualmente nel browser su desktop e mobile (catalogo, carrello, checkout completo con ordine
  creato, login, pannello admin, cambio stato ordine, importazione CSV con riga abbinata manualmente).

## Cosa dipende da accessi/servizi che non hai ancora collegato

- **Prezzi reali del fornitore**: finché non importi un listino reale (vedi sopra), i costi sono stime.
- **Pagamenti reali**: il checkout è completo ma resta in modalità test finché non imposti le chiavi Stripe (o un
  altro gateway) — per scelta, per non simulare un pagamento che non esiste.
- **Email transazionali**: nessun servizio email è collegato. Conferma ordine, notifiche di stato, modulo "Scrivici"
  (che oggi apre un semplice `mailto:`) e newsletter restano da collegare a un provider (es. Resend, Postmark).
- **Dati legali reali**: ragione sociale, P.IVA, indirizzo, contenuti di Privacy/Condizioni/Cookie sono segnaposto
  da far scrivere/validare da un legale.
- **Spedizione**: tempi di consegna e costo sotto soglia (attualmente 7,90 € come nel prototipo) sono da
  confermare col corriere/modello logistico scelto.

## File principali

```
prisma/schema.prisma       modello dati (prodotti, ordini, utenti, regole prezzo, log sincronizzazione)
prisma/seed.ts              catalogo iniziale (220 prodotti, stesso dataset del prototipo)
src/lib/pricing.ts          motore prezzi (ricarico, IVA, arrotondamento ,90, spedizione) + pricing.test.ts
src/lib/supplier-match.ts   abbinamento fornitore (codice/nome esatto, resto = revisione manuale)
src/lib/auth.ts             sessioni (cookie firmato) e hashing password
src/lib/catalog.ts          query di listing/filtri del catalogo
src/app/api/cart/quote      ricalcolo server-side autoritativo del carrello
src/app/api/checkout        creazione ordine (ricalcola tutto, non fida mai il client)
src/app/admin/**            pannello amministrativo
src/app/globals.css         design del prototipo portato 1:1 (stessa identità visiva)
```

## Note tecniche

- Il generatore Prisma usato è `prisma-client-js` (classico): il generatore ESM-only più recente non espone un
  entry point compatibile con `tsx`/script di seed, quindi non è stato usato.
- `next.config.ts` non abilita `cacheComponents`/PPR: essendo un sito interamente guidato dal database (prezzi,
  scorte, carrello), il prerendering statico sperimentale non si applica.
- Al build compaiono warning Turbopack su "dynamic filesystem access" dal client Prisma generato: sono noti
  (tracciamento dei file in output standalone) e non impediscono build o funzionamento; da tenere d'occhio solo se
  distribuisci su una piattaforma serverless con limiti di dimensione del bundle.
- `npm audit` segnala vulnerabilità nella libreria `xlsx` (SheetJS) usata solo per l'import admin di file caricati
  da un operatore autenticato (non input pubblico): rischio contenuto, ma da rivalutare prima di esporre
  l'importazione a utenti meno fidati.
