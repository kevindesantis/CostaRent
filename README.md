# CostaRent - Sito web statico

Sito pronto per il brand **CostaRent**, pensato per autonoleggio smart in Calabria.

## File principali

- `index.html` = pagina principale
- `styles.css` = grafica e responsive
- `script.js` = menu, calcolo preventivo e WhatsApp
- `assets/logo.svg` = logo
- `assets/favicon.svg` = icona browser
- `assets/og-image.svg` = anteprima social/WhatsApp
- `vercel.json` = configurazione opzionale per Vercel

## Prima di pubblicare

1. Apri `script.js`.
2. Sostituisci questa riga:

```js
const WHATSAPP_NUMBER = "390000000000";
```

con il tuo numero WhatsApp aziendale in formato internazionale, senza + e senza spazi.

Esempio:

```js
const WHATSAPP_NUMBER = "393331234567";
```

3. In `index.html`, modifica email, sede e testi legali nel footer.
4. Completa le condizioni di noleggio, privacy, cauzione e assicurazioni prima di pubblicare ufficialmente.

## Prezzi impostati

- Panda Hybrid: 40€/giorno a luglio-agosto, 30€/giorno negli altri mesi.
- Lancia Ypsilon: 45€/giorno a luglio-agosto, 35€/giorno negli altri mesi.

Il calcolo è indicativo e non conferma automaticamente la prenotazione.

## Come pubblicarlo su Vercel

1. Crea una repository GitHub.
2. Carica tutti i file della cartella.
3. Vai su Vercel e importa la repository.
4. Non serve build command: è un sito statico.
5. Collega il dominio `costarent.it` dalla dashboard Vercel.

## Note legali

Il sito non salva dati: il modulo crea solo un messaggio WhatsApp. Prima della pubblicazione ufficiale bisogna completare:

- Privacy policy
- Cookie policy, se aggiungi analytics/pixel
- Condizioni di noleggio
- Informativa GPS/localizzazione se usi tracker
- Clausole cauzione/franchigia/danni
