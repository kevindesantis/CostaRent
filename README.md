# CostaRent sito + gestionale demo

Questa versione contiene:

- `index.html`: sito pubblico con flusso prenotazione.
- `admin.html`: gestionale demo per auto e prenotazioni.
- `app.js`: logica sito pubblico.
- `admin.js`: logica gestionale.
- `styles.css`: grafica unica per sito e admin.

## Come provarlo

Apri `index.html` nel browser e prova una prenotazione.
Poi apri `admin.html`, usa PIN demo `1234`, e vedrai la richiesta salvata.

## Cosa puoi fare nel gestionale

- Aggiungere, modificare o disattivare auto.
- Cambiare prezzi alta/bassa stagione.
- Vedere tutte le richieste.
- Cambiare stato: Richiesta, Confermata, In corso, Conclusa, Annullata.
- Inserire prenotazioni manuali arrivate da WhatsApp/telefono.
- Esportare CSV delle prenotazioni.
- Esportare/importare backup JSON.

## Limite importante

Questa è una demo locale: i dati sono salvati in `localStorage`, cioè nel browser.
Se un cliente apre il sito dal suo telefono, la prenotazione non comparirà nel tuo browser.

Per renderlo reale bisogna collegarlo a Supabase:

### Tabelle consigliate Supabase

```sql
create table cars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  plate text,
  seats int default 4,
  fuel text,
  summer_price numeric not null default 0,
  low_price numeric not null default 0,
  status text not null default 'active',
  description text,
  color_class text,
  created_at timestamptz default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id),
  car_name text,
  name text not null,
  phone text not null,
  start_date date not null,
  end_date date not null,
  days int not null,
  total numeric not null,
  status text not null default 'Richiesta',
  pickup text,
  notes text,
  source text default 'Sito',
  created_at timestamptz default now()
);
```

### Protezione admin

Il PIN `1234` è solo una simulazione. Online non è sicuro.
Per il sito reale serve login vero, per esempio Supabase Auth.

## Pubblicazione su Vercel

Carica la cartella su GitHub e collega la repository a Vercel. Essendo sito statico, non serve build command.
