import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function euro(value: number | string | null | undefined) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT').format(new Date(`${value}T00:00:00`));
}

async function sendEmail(payload: { from: string; to: string[]; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY non configurata');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || `Errore Resend ${response.status}`);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Metodo non consentito' }, 405);

  try {
    const { booking_id } = await req.json();
    if (!booking_id) return jsonResponse({ error: 'booking_id mancante' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Variabili Supabase mancanti' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, cars(name, slug, category)')
      .eq('id', booking_id)
      .single();

    if (error || !booking) return jsonResponse({ error: error?.message || 'Prenotazione non trovata' }, 404);

    const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL');
    if (!notificationEmail) return jsonResponse({ error: 'NOTIFICATION_EMAIL non configurata' }, 500);

    const fromEmail = Deno.env.get('FROM_EMAIL') || 'CostaRent <onboarding@resend.dev>';
    const brandName = Deno.env.get('BRAND_NAME') || 'CostaRent';
    const to = notificationEmail.split(',').map((email) => email.trim()).filter(Boolean);

    const subject = `Nuova richiesta ${brandName}: ${booking.booking_code}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#0E2430">
        <div style="background:#062B3F;color:#fff;padding:22px;border-radius:18px 18px 0 0">
          <h1 style="margin:0;font-size:24px">Nuova richiesta di prenotazione</h1>
          <p style="margin:6px 0 0;color:#DDFBFD">${brandName} • Codice ${booking.booking_code}</p>
        </div>
        <div style="border:1px solid #D9E8EE;border-top:0;padding:22px;border-radius:0 0 18px 18px;background:#fff">
          <h2 style="margin:0 0 14px;color:#062B3F">Riepilogo</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Auto</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.cars?.name || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Date</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${formatDate(booking.pickup_date)} → ${formatDate(booking.return_date)} (${booking.days} giorni)</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Totale stimato</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${euro(booking.total_amount)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Cauzione indicativa</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${euro(booking.deposit_amount)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Cliente</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.customer_name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Telefono</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.customer_phone}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Email</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.customer_email}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Ritiro</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.pickup_location || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Riconsegna</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.return_location || '-'}</td></tr>
            <tr><td style="padding:8px"><strong>Note</strong></td><td style="padding:8px">${booking.notes || '-'}</td></tr>
          </table>
          <p style="margin-top:18px;color:#607484">Apri il gestionale CostaRent per confermare, annullare o modificare lo stato della richiesta.</p>
        </div>
      </div>
    `;

    const sentAdmin = await sendEmail({ from: fromEmail, to, subject, html });

    const sendCustomerConfirmation = (Deno.env.get('SEND_CUSTOMER_CONFIRMATION') || '').toLowerCase() === 'true';
    let sentCustomer = null;
    if (sendCustomerConfirmation && booking.customer_email) {
      sentCustomer = await sendEmail({
        from: fromEmail,
        to: [booking.customer_email],
        subject: `Richiesta ricevuta - ${booking.booking_code}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0E2430">
            <h1 style="color:#062B3F">Richiesta ricevuta</h1>
            <p>Ciao ${booking.customer_name}, abbiamo ricevuto la tua richiesta di prenotazione <strong>${booking.booking_code}</strong>.</p>
            <p><strong>Auto:</strong> ${booking.cars?.name || '-'}<br>
            <strong>Date:</strong> ${formatDate(booking.pickup_date)} → ${formatDate(booking.return_date)}<br>
            <strong>Totale stimato:</strong> ${euro(booking.total_amount)}</p>
            <p>La richiesta non è ancora confermata: ti contatteremo per conferma disponibilità, cauzione e documenti.</p>
            <p>${brandName}</p>
          </div>
        `,
      });
    }

    return jsonResponse({ ok: true, sentAdmin, sentCustomer });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
