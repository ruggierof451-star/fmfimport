# Checklist per il lancio — cosa configurare prima che il sito sia pronto al 100%

Il **codice** è pronto. Quello che resta sono **chiavi e account esterni** da impostare,
soprattutto le variabili d'ambiente su **Vercel** (Progetto → Settings → Environment
Variables). Nessuna di queste può essere messa nel codice: sono segreti.

## 🔴 Indispensabili (senza, il sito non vende o non manda email)

### Email — Resend
- [ ] Verificare il dominio `fmfcards.com` su resend.com → **Domains** (aggiungere i record DNS).
- [ ] Su Vercel: `EMAIL_FROM` = `FMF Cards <info@fmfcards.com>` (indirizzo del proprio dominio).
- [ ] Su Vercel: `RESEND_API_KEY` = la chiave API di Resend.
- Senza: niente email di conferma ordine, recupero password, conferma newsletter
  (è anche il motivo per cui gli iscritti restano "in attesa").

### Pagamenti — Stripe
- [ ] Su Vercel le chiavi **live** (non test): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`.
- [ ] Su Stripe → Developers → Webhooks: endpoint `https://www.fmfcards.com/api/webhooks/stripe`
      con gli eventi: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
      `checkout.session.expired`, `checkout.session.async_payment_failed`.
- [ ] Copiare il "Signing secret" del webhook in `STRIPE_WEBHOOK_SECRET` su Vercel.
- [ ] Fare un **ordine di prova reale** con carta e verificare pagamento + email.

### Bonifico
- [ ] Su Vercel: `BANK_IBAN` (e `BANK_ACCOUNT_HOLDER` se diverso da "FMF Cards S.R.L.S.").
- Senza: il cliente che sceglie bonifico non riceve l'IBAN.

### Sicurezza / base
- [ ] `AUTH_SECRET` su Vercel: stringa lunga e casuale (firma i cookie di login).
      Generarla con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `SITE_URL` = `https://www.fmfcards.com`.

## 🟡 Importanti (prima di spingere il sito)

- [ ] Controllare che i prodotti abbiano prezzo, disponibilità e **foto reali** corrette.
- [ ] Verificare i dati legali (P.IVA, indirizzo, ragione sociale) nelle pagine Privacy/Condizioni.
- [ ] Google Search Console: inviare `sitemap.xml` e richiedere l'indicizzazione della home.
- [ ] Google Merchant Center: creare l'account e aggiungere il feed
      `https://www.fmfcards.com/feed/google`.
- [ ] Profilo attività Google: completare la verifica (logo, nome "FMF Cards").

## 🟢 Facoltativi / più avanti

- [ ] `CRON_SECRET` su Vercel: protegge il giro giornaliero della coda email marketing.
- [ ] Integrazione BRT (software spedizioni): in attesa delle credenziali API.
- [ ] Rate limiting avanzato: la protezione anti brute force è **già attiva** (via database).
      Un archivio dedicato (Upstash/Vercel KV) servirebbe solo con traffico molto alto.

## Riepilogo variabili d'ambiente Vercel

| Variabile | Valore | Priorità |
|---|---|---|
| `RESEND_API_KEY` | chiave Resend | 🔴 |
| `EMAIL_FROM` | `FMF Cards <info@fmfcards.com>` | 🔴 |
| `STRIPE_SECRET_KEY` | chiave segreta live | 🔴 |
| `STRIPE_PUBLISHABLE_KEY` | chiave pubblicabile live | 🔴 |
| `STRIPE_WEBHOOK_SECRET` | signing secret del webhook | 🔴 |
| `BANK_IBAN` | IBAN per i bonifici | 🔴 |
| `AUTH_SECRET` | stringa casuale lunga | 🔴 |
| `SITE_URL` | `https://www.fmfcards.com` | 🔴 |
| `BANK_ACCOUNT_HOLDER` | intestatario conto | 🟡 |
| `EMAIL_MARKETING_FROM` | mittente campagne (opz.) | 🟡 |
| `CRON_SECRET` | segreto cron code | 🟢 |
