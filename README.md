# CostaRent - sito con prenotazione online demo

Questa versione include:

- 3 auto configurate: 2 Fiat Panda Hybrid + 1 Lancia/Ypsilon
- listino automatico: luglio/agosto alta stagione, altri mesi bassa stagione
- wizard di prenotazione in 4 passaggi
- controllo disponibilità demo con salvataggio nel browser tramite localStorage
- riepilogo prezzo automatico
- invio richiesta su WhatsApp
- sezione "Demo prenotazioni" per vedere le richieste salvate

## Come configurare WhatsApp

Apri `script.js` e cambia:

```js
const WHATSAPP_NUMBER = "390000000000";
```

con il numero aziendale in formato internazionale senza + e senza spazi.

Esempio:

```js
const WHATSAPP_NUMBER = "393331234567";
```

## Come modificare auto e prezzi

Nel file `script.js` trovi l'array:

```js
const cars = [...]
```

Per ogni auto puoi modificare:

- `name`
- `summerPrice`
- `lowPrice`
- `description`
- `fuel`

## Importante

Questa è una simulazione statica. Le prenotazioni salvate restano nel browser del dispositivo. Per avere prenotazioni vere online, accessibili da telefono e computer, serve collegare un database come Supabase.

## Pubblicazione su Vercel

Puoi caricare tutta la cartella su GitHub e importarla in Vercel. Il sito è statico e non richiede build.
