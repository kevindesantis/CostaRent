import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const config = window.COSTARENT_CONFIG || {};

export function getConfig() {
  return config;
}

export function isConfigured() {
  return Boolean(
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    !config.SUPABASE_URL.includes('TUO-PROGETTO') &&
    !config.SUPABASE_ANON_KEY.includes('INSERISCI')
  );
}

export const supabase = isConfigured()
  ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

export function euro(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('it-IT').format(new Date(dateString + 'T00:00:00'));
}

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function calculateTotal(car, pickupDate, returnDate) {
  const days = daysBetween(pickupDate, returnDate);
  if (!car || !days) return { days, total: 0, highDays: 0, lowDays: 0 };

  let total = 0;
  let highDays = 0;
  let lowDays = 0;
  const current = new Date(pickupDate + 'T00:00:00');
  const end = new Date(returnDate + 'T00:00:00');

  while (current < end) {
    const month = current.getMonth() + 1;
    const isHigh = Array.isArray(car.high_season_months)
      ? car.high_season_months.includes(month)
      : [7, 8].includes(month);
    total += Number(isHigh ? car.price_high : car.price_low);
    if (isHigh) highDays += 1; else lowDays += 1;
    current.setDate(current.getDate() + 1);
  }
  return { days, total, highDays, lowDays };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function makeWhatsAppLink(message) {
  const number = (config.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
