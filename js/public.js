import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.COSTARENT_CONFIG || {};
const FIXED_LOCATION = 'Sellia Marina';
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const IMAGE_BY_SLUG = {
  'panda-hybrid-1': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Fiat_Panda_%282011%29_front.jpg',
  'panda-hybrid-2': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Fiat_Panda_%282011%29_front_quarter.jpg',
  'lancia-ypsilon': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Lancia_Ypsilon_%282011%29_front_quarter.jpg'
};

const PUBLIC_BY_SLUG = {
  'panda-hybrid-1': { publicName: 'Fiat Panda o similare', group: 'Gruppo A', fuel: 'Hybrid', type: 'Piccola', people: 4 },
  'panda-hybrid-2': { publicName: 'Fiat Panda o similare', group: 'Gruppo A', fuel: 'Hybrid', type: 'Piccola', people: 4 },
  'lancia-ypsilon': { publicName: 'Lancia Ypsilon o similare', group: 'Gruppo B', fuel: 'Benzina', type: 'Compatta', people: 5 }
};

let cars = [];
let selectedCar = null;

const el = {
  menuBtn: document.getElementById('menuBtn'),
  navlinks: document.getElementById('navlinks'),
  carsGrid: document.getElementById('carsGrid'),
  bookingForm: document.getElementById('bookingForm'),
  bookingCar: document.getElementById('bookingCar'),
  pickupDate: document.getElementById('pickupDate'),
  returnDate: document.getElementById('returnDate'),
  customerName: document.getElementById('customerName'),
  customerPhone: document.getElementById('customerPhone'),
  customerEmail: document.getElementById('customerEmail'),
  bookingNotes: document.getElementById('bookingNotes'),
  quoteTotal: document.getElementById('quoteTotal'),
  quoteDays: document.getElementById('quoteDays'),
  quoteDeposit: document.getElementById('quoteDeposit'),
  bookingSubmit: document.getElementById('bookingSubmit'),
  bookingMessage: document.getElementById('bookingMessage'),
  waHeader: document.getElementById('waHeader'),
  footerPhone: document.getElementById('footerPhone'),
  footerEmail: document.getElementById('footerEmail')
};

init();

function init() {
  if (el.menuBtn) {
    el.menuBtn.addEventListener('click', () => el.navlinks.classList.toggle('open'));
  }

  el.pickupDate.min = todayISO();
  el.returnDate.min = todayISO();
  el.footerPhone.textContent = 'WhatsApp: ' + (cfg.BRAND_PHONE_LABEL || '');
  el.footerEmail.textContent = 'Email: ' + (cfg.BRAND_EMAIL || '');
  el.waHeader.href = whatsappLink('Ciao CostaRent, vorrei informazioni su un noleggio auto.');

  el.bookingCar.addEventListener('change', onCarChange);
  el.pickupDate.addEventListener('change', updateQuote);
  el.returnDate.addEventListener('change', updateQuote);
  el.bookingForm.addEventListener('submit', submitBooking);

  loadCars();
}

async function loadCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    el.carsGrid.innerHTML = `<div class="empty">Errore caricamento auto: ${escapeHTML(error.message)}</div>`;
    return;
  }

  cars = data || [];

  if (!cars.length) {
    el.carsGrid.innerHTML = '<div class="empty">Nessuna auto trovata. Esegui database/reseed_cars_final.sql su Supabase.</div>';
    return;
  }

  renderCars();
  renderOptions();
  onCarChange();
}

function renderCars() {
  el.carsGrid.innerHTML = '';

  cars.forEach((car) => {
    const info = publicInfo(car);
    const card = document.createElement('article');
    card.className = 'car-card';
    card.innerHTML = `
      <div class="car-photo"><img src="${escapeHTML(info.image)}" alt="${escapeHTML(info.publicName)}"></div>
      <div class="car-content">
        <div class="car-top"><span class="group">${escapeHTML(info.group)}</span><span class="fuel">${escapeHTML(info.fuel)}</span></div>
        <h3>${escapeHTML(info.publicName)}</h3>
        <p>${escapeHTML(car.description || 'Auto pratica e conveniente per muoversi in Calabria.')}</p>
        <div class="meta">
          <span>${escapeHTML(info.type)}</span>
          <span>${info.people} persone</span>
          <span>${escapeHTML(info.fuel)}</span>
        </div>
      </div>
      <div class="tariff">
        <small>Tariffa web</small>
        <strong>${startingPrice(car)}</strong>
        <span>Il totale preciso appare scegliendo le date.</span>
      </div>`;

    card.addEventListener('click', () => {
      el.bookingCar.value = car.id;
      onCarChange();
      document.getElementById('prenota').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => el.pickupDate.focus(), 350);
    });

    el.carsGrid.appendChild(card);
  });
}

function renderOptions() {
  el.bookingCar.innerHTML = cars.map((car) => {
    const info = publicInfo(car);
    return `<option value="${car.id}">${escapeHTML(info.group + ' · ' + info.publicName)}</option>`;
  }).join('');
}

function onCarChange() {
  selectedCar = cars.find((car) => String(car.id) === String(el.bookingCar.value)) || cars[0] || null;
  updateQuote();
}

function updateQuote() {
  selectedCar = cars.find((car) => String(car.id) === String(el.bookingCar.value)) || selectedCar;
  const quote = calculateTotal(selectedCar, el.pickupDate.value, el.returnDate.value);

  el.quoteDays.textContent = quote.days ? `${quote.days} giorni` : '—';
  el.quoteTotal.textContent = quote.total ? euro(quote.total) : '—';
  el.quoteDeposit.textContent = selectedCar?.deposit_amount ? euro(selectedCar.deposit_amount) : '—';

  if (el.pickupDate.value) {
    const min = new Date(el.pickupDate.value + 'T00:00:00');
    min.setDate(min.getDate() + 1);
    el.returnDate.min = min.toISOString().slice(0, 10);
  }
}

async function submitBooking(event) {
  event.preventDefault();
  showMessage('', '');

  if (!selectedCar) {
    showMessage('Seleziona un’auto.', 'error');
    return;
  }

  const quote = calculateTotal(selectedCar, el.pickupDate.value, el.returnDate.value);
  if (!quote.days) {
    showMessage('La data di riconsegna deve essere successiva al ritiro.', 'error');
    return;
  }

  lockSubmit('Controllo disponibilità...');

  const available = await supabase.rpc('is_car_available', {
    p_car_id: selectedCar.id,
    p_pickup_date: el.pickupDate.value,
    p_return_date: el.returnDate.value
  });

  if (available.error) {
    unlockSubmit();
    showMessage('Errore disponibilità: ' + available.error.message, 'error');
    return;
  }

  if (!available.data) {
    unlockSubmit();
    showMessage('Auto già occupata nelle date selezionate.', 'error');
    return;
  }

  lockSubmit('Invio richiesta...');

  const payload = {
    car_id: selectedCar.id,
    customer_name: el.customerName.value.trim(),
    customer_email: el.customerEmail.value.trim(),
    customer_phone: el.customerPhone.value.trim(),
    pickup_date: el.pickupDate.value,
    return_date: el.returnDate.value,
    pickup_location: FIXED_LOCATION,
    return_location: FIXED_LOCATION,
    notes: el.bookingNotes.value.trim() || null,
    days: quote.days,
    total_amount: quote.total,
    deposit_amount: Number(selectedCar.deposit_amount || 0),
    status: 'request',
    price_details: {
      highDays: quote.highDays,
      lowDays: quote.lowDays,
      highPrice: selectedCar.price_high,
      lowPrice: selectedCar.price_low
    }
  };

  const inserted = await supabase.from('bookings').insert(payload).select('id, booking_code').single();

  if (inserted.error) {
    unlockSubmit();
    showMessage('Errore prenotazione: ' + inserted.error.message, 'error');
    return;
  }

  await notifyBooking(inserted.data.id);
  showMessage(`Richiesta inviata! Codice ${inserted.data.booking_code}. Ti contatteremo per conferma.`, 'success');
  el.bookingForm.reset();
  renderOptions();
  onCarChange();
  unlockSubmit();
}

async function notifyBooking(bookingId) {
  const endpoint = cfg.SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/' + (cfg.BOOKING_FUNCTION_NAME || 'notify-booking');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ booking_id: bookingId })
    });
    await response.json().catch(() => ({}));
    return response.ok;
  } catch (err) {
    console.warn('notify-booking error', err);
    return false;
  }
}

function publicInfo(car) {
  const mapped = PUBLIC_BY_SLUG[car.slug] || {};
  return {
    publicName: mapped.publicName || car.name || 'Auto o similare',
    group: mapped.group || car.category || 'Gruppo',
    fuel: mapped.fuel || car.fuel || 'Benzina',
    type: mapped.type || car.category || 'Auto',
    people: mapped.people || car.seats || 5,
    image: IMAGE_BY_SLUG[car.slug] || car.image_url || 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Fiat_Panda_%282011%29_front.jpg'
  };
}

function calculateTotal(car, start, end) {
  const days = daysBetween(start, end);
  if (!car || !days) return { days, total: 0, highDays: 0, lowDays: 0 };

  let total = 0;
  let highDays = 0;
  let lowDays = 0;
  const current = new Date(start + 'T00:00:00');
  const stop = new Date(end + 'T00:00:00');
  const months = Array.isArray(car.high_season_months) ? car.high_season_months : [7, 8];

  while (current < stop) {
    const month = current.getMonth() + 1;
    const isHigh = months.includes(month);
    total += Number(isHigh ? car.price_high : car.price_low);
    if (isHigh) highDays++; else lowDays++;
    current.setDate(current.getDate() + 1);
  }

  return { days, total, highDays, lowDays };
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 0;
}

function startingPrice(car) {
  return 'da ' + euro(Number(car.price_low || 0)) + '/giorno';
}

function euro(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function showMessage(text, type) {
  el.bookingMessage.textContent = text;
  el.bookingMessage.className = 'message ' + (type || '');
}

function lockSubmit(label) {
  el.bookingSubmit.disabled = true;
  el.bookingSubmit.textContent = label;
}

function unlockSubmit() {
  el.bookingSubmit.disabled = false;
  el.bookingSubmit.textContent = 'Invia richiesta';
}

function whatsappLink(message) {
  return 'https://wa.me/' + String(cfg.WHATSAPP_NUMBER || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
}

function escapeHTML(value) {
  return String(value || '').replace(/[&<>'"]/g, (ch) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[ch]));
}
