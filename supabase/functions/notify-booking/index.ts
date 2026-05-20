import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function euro(value: unknown) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT").format(new Date(String(value) + "T00:00:00"));
}

async function sendEmail(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY non configurata");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((result as any).message || (result as any).error || `Errore Resend ${response.status}`);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo non consentito" }, 405);

  try {
    const { booking_id } = await req.json();
    if (!booking_id) return jsonResponse({ error: "booking_id mancante" }, 400);

    const supabaseUrl = Deno.env.get("COSTARENT_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("COSTARENT_SERVICE_ROLE_KEY") || Deno.env.get("COSTARENT_SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Variabili Supabase mancanti" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*, cars(name, category, fuel)")
      .eq("id", booking_id)
      .single();

    if (error || !booking) return jsonResponse({ error: error?.message || "Prenotazione non trovata" }, 404);

    const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "CostaRent <onboarding@resend.dev>";
    const brandName = Deno.env.get("BRAND_NAME") || "CostaRent";
    if (!notificationEmail) return jsonResponse({ error: "NOTIFICATION_EMAIL non configurata" }, 500);

    const recipients = notificationEmail.split(",").map((x) => x.trim()).filter(Boolean);
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#0E2430;background:#ffffff">
        <div style="background:#062B3F;color:#fff;padding:22px;border-radius:18px 18px 0 0">
          <h1 style="margin:0;font-size:24px">Nuova richiesta di prenotazione</h1>
          <p style="margin:6px 0 0;color:#DDFBFD">${brandName} • Codice ${booking.booking_code}</p>
        </div>
        <div style="border:1px solid #D9E8EE;border-top:0;padding:22px;border-radius:0 0 18px 18px;background:#fff">
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Auto</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.cars?.name || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Categoria</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.cars?.category || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Alimentazione</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.cars?.fuel || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Date</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${formatDate(booking.pickup_date)} → ${formatDate(booking.return_date)} (${booking.days} giorni)</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Totale stimato</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${euro(booking.total_amount)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Cauzione</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${euro(booking.deposit_amount)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Cliente</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.customer_name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Telefono</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.customer_phone}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Email</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.customer_email}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Ritiro</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.pickup_location || 'Sellia Marina'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Riconsegna</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.return_location || 'Sellia Marina'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #EEF3F5"><strong>Note</strong></td><td style="padding:8px;border-bottom:1px solid #EEF3F5">${booking.notes || '-'}</td></tr>
          </table>
        </div>
      </div>`;

    const sent = await sendEmail({ from: fromEmail, to: recipients, subject: `Nuova richiesta ${brandName}: ${booking.booking_code}`, html });
    return jsonResponse({ ok: true, sent, booking_code: booking.booking_code });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
