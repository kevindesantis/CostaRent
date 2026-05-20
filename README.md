# CostaRent - sito + gestionale Supabase

Versione completa con:

- sito pubblico responsive;
- prenotazione online con controllo disponibilità;
- database Supabase;
- gestionale admin con login;
- gestione auto, prezzi e disponibilità;
- gestione prenotazioni e stati;
- email di notifica quando arriva una nuova richiesta;
- Edge Function Supabase con Resend.

## Struttura file

```text
index.html                      sito pubblico
admin.html                      gestionale
styles.css                      grafica
config.example.js               esempio configurazione
config.js                       configurazione reale da modificare
js/public.js                    logica sito pubblico
js/admin.js                     logica gestionale
js/supabaseClient.js            client Supabase e funzioni comuni
database/schema.sql             schema database completo
database/setup_admin.sql        query per abilitare utente admin
supabase/functions/notify-booking/index.ts  funzione email
supabase/config.toml            configurazione Edge Function
```

## 1. Crea progetto Supabase

1. Vai su Supabase e crea un nuovo progetto.
2. Apri **SQL Editor**.
3. Copia tutto il contenuto di `database/schema.sql`.
4. Esegui lo script.

Questo crea:

- tabella `cars`;
- tabella `bookings`;
- tabella `admins`;
- funzioni di controllo disponibilità;
- policy RLS;
- auto iniziali: 2 Panda Hybrid + 1 Lancia/Ypsilon.

## 2. Crea utente admin

1. Vai su **Authentication > Users**.
2. Crea un utente, ad esempio `admin@costarent.it`.
3. Copia il suo **User UID**.
4. Apri `database/setup_admin.sql`.
5. Sostituisci `INCOLLA-QUI-USER-UID` con il vero UID.
6. Esegui la query in SQL Editor.

Solo gli utenti dentro `admins` possono entrare in `admin.html`.

## 3. Configura il sito

Apri `config.js` e sostituisci:

```js
SUPABASE_URL: "https://TUO-PROGETTO.supabase.co",
SUPABASE_ANON_KEY: "INSERISCI_LA_TUA_ANON_PUBLIC_KEY",
WHATSAPP_NUMBER: "393331234567"
```

Trovi URL e anon key in Supabase:

**Project Settings > API**.

Non inserire mai la `service_role_key` nel file `config.js`.

## 4. Configura email con Resend

Per ricevere una mail quando un cliente prenota devi usare la Edge Function `notify-booking`.

### Crea account Resend

1. Crea account su Resend.
2. Crea una API key.
3. Per inviare da `prenotazioni@costarent.it`, verifica il dominio `costarent.it` su Resend.

Se non hai ancora il dominio verificato, puoi fare test limitati usando `onboarding@resend.dev`.

### Installa Supabase CLI

Nel terminale:

```bash
npm install -g supabase
supabase login
supabase link --project-ref TUO_PROJECT_REF
```

Il `project-ref` è la parte iniziale dell’URL Supabase:

`https://PROJECT_REF.supabase.co`

### Imposta secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
supabase secrets set NOTIFICATION_EMAIL=tuamail@gmail.com
supabase secrets set FROM_EMAIL="CostaRent <prenotazioni@costarent.it>"
supabase secrets set BRAND_NAME="CostaRent"
supabase secrets set SEND_CUSTOMER_CONFIRMATION=false
```

### Deploy funzione

```bash
supabase functions deploy notify-booking --no-verify-jwt
```

Nel file `supabase/config.toml` la funzione è già impostata con `verify_jwt = false`, perché viene chiamata dal sito pubblico dopo una richiesta.

## 5. Pubblica su Vercel

1. Crea repository GitHub.
2. Carica tutti i file.
3. Importa repository su Vercel.
4. Collega il dominio `costarent.it`.

Essendo un sito statico, non serve build command.

## 6. Come funziona una prenotazione

1. Il cliente apre il sito.
2. Sceglie auto e date.
3. Il sito chiama `is_car_available` su Supabase.
4. Se l’auto è libera, inserisce una riga in `bookings` con stato `request`.
5. Il sito chiama la Edge Function `notify-booking`.
6. La funzione invia una mail all’indirizzo impostato in `NOTIFICATION_EMAIL`.
7. Tu entri in `admin.html` e cambi lo stato in `confirmed`, `active`, `completed` o `cancelled`.

## 7. Stati prenotazione

- `request`: richiesta ricevuta, non ancora confermata.
- `confirmed`: confermata da te.
- `active`: auto consegnata/in corso.
- `completed`: noleggio concluso.
- `cancelled`: richiesta annullata.

Il sistema considera occupata l’auto solo per questi stati:

- `request`
- `confirmed`
- `active`

Se annulli o concludi una prenotazione, le date tornano libere.

## 8. Personalizzazioni importanti

Da `admin.html` puoi modificare:

- nome auto;
- prezzi alta stagione;
- prezzi bassa stagione;
- cauzione;
- descrizione;
- immagine;
- visibilità.

## 9. Cose da fare prima di andare online davvero

- Inserire numero WhatsApp aziendale reale.
- Verificare dominio email su Resend.
- Caricare foto vere delle auto.
- Far rivedere condizioni, privacy e contratto da consulente/avvocato.
- Aggiungere pagina privacy/cookie prima di usare tracking o analytics.
- Testare almeno 3 prenotazioni reali prima della pubblicazione.

## 10. Nota sicurezza

Questo progetto usa RLS Supabase:

- i clienti possono leggere solo auto attive;
- i clienti possono solo inserire nuove richieste;
- solo gli admin possono leggere e modificare prenotazioni;
- la service role key resta nella Edge Function e non nel browser.
