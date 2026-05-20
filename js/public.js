import { supabase, isConfigured, getConfig, euro, formatDate, calculateTotal, todayISO, makeWhatsAppLink } from './supabaseClient.js';

let cars = [];
let selectedCar = null;
const FIXED_LOCATION = 'Sellia Marina';

const PUBLIC_CAR_PRESETS = [
  { publicName: 'Fiat Panda o similare', groupLabel: 'Gruppo A', fuelLabel: 'Hybrid', shortType: 'Piccola', image: 'assets/cars/panda-hybrid-blue.svg', fallbackDescription: 'City car economica, agile e perfetta per vacanze, mare e spostamenti locali.' },
  { publicName: 'Fiat Panda o similare', groupLabel: 'Gruppo A', fuelLabel: 'Hybrid', shortType: 'Piccola', image: 'assets/cars/panda-hybrid-sand.svg', fallbackDescription: 'Seconda city car di Gruppo A, pratica e versatile per muoversi in Calabria con semplicità.' },
  { publicName: 'Lancia Ypsilon o similare', groupLabel: 'Gruppo B', fuelLabel: 'Benzina', shortType: 'Compatta', image: 'assets/cars/lancia-ypsilon.svg', fallbackDescription: 'Auto di categoria superiore, più comoda per coppie, lavoro e turismo.' }
];

function getCarImage(car) {
  if (car?.image_url) return car.image_url;
  const slug = String(car?.slug || car?.name || '').toLowerCase();
  if (slug.includes('panda') && slug.includes('2')) return 'assets/cars/panda-hybrid-sand.svg';
  if (slug.includes('panda')) return 'assets/cars/panda-hybrid-blue.svg';
  if (slug.includes('ypsilon') || slug.includes('lancia')) return 'assets/cars/lancia-ypsilon.svg';
  return '';
}

function startingText(car) {
  const low = Number(car?.price_low || 0);
  return low ? `Da ${euro(low)}/giorno` : 'Seleziona le date';
}

function getPublicCarData(car) {
  const index = Math.max(0, cars.findIndex(c => c.id === car?.id));
  const preset = PUBLIC_CAR_PRESETS[index] || {};
  return {
    publicName: preset.publicName || car?.name || 'Auto o similare',
    groupLabel: preset.groupLabel || 'Gruppo',
    fuelLabel: preset.fuelLabel || car?.fuel || 'Benzina',
    shortType: preset.shortType || car?.category || 'Piccola',
    image: car?.image_url || preset.image || getCarImage(car),
    fallbackDescription: preset.fallbackDescription || car?.description || 'Auto comoda e pratica per i tuoi spostamenti.'
  };
}

const els = {
  carsGrid: document.getElementById('carsGrid'),
  carsEmpty: document.getElementById('carsEmpty'),
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
  bookingMessage: document.getElementById('bookingMessage'),
  bookingSubmit: document.getElementById('bookingSubmit'),
  whatsappTop: document.getElementById('whatsappTop'),
  footerPhone: document.getElementById('footerPhone'),
  footerEmail: document.getElementById('footerEmail'),
  navToggle: document.getElementById('navToggle'),
  navLinks: document.getElementById('navLinks')
};

init();

function init() {
  const cfg = getConfig();
  els.pickupDate.min = todayISO();
  els.returnDate.min = todayISO();
  els.footerPhone.textContent = `WhatsApp: ${cfg.BRAND_PHONE_LABEL || 'configura numero'}`;
  els.footerEmail.textContent = `Email: ${cfg.BRAND_EMAIL || 'configura email'}`;
  els.whatsappTop.href = makeWhatsAppLink('Ciao CostaRent, vorrei informazioni su un noleggio auto.');
  els.navToggle?.addEventListener('click', () => els.navLinks.classList.toggle('open'));
  els.bookingCar.addEventListener('change', onCarChange);
  els.pickupDate.addEventListener('change', updateQuote);
  els.returnDate.addEventListener('change', updateQuote);
  els.bookingForm.addEventListener('submit', submitBooking);

  if (!isConfigured()) {
    showMessage('Configura Supabase in config.js per usare prenotazioni e database.', 'error');
    renderEmptyDemo();
    return;
  }
  loadCars();
}

async function loadCars() {
  setLoading(true);
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });

  setLoading(false);
  if (error) {
    showMessage(`Errore caricamento auto: ${error.message}`, 'error');
    return;
  }
  cars = data || [];
  renderCars();
  renderCarOptions();
  updateQuote();
}

function renderCars() {
  els.carsGrid.innerHTML = '';
  els.carsEmpty.classList.toggle('hidden', cars.length > 0);
  cars.forEach(car => {
    const card = document.createElement('article');
    const view = getPublicCarData(car);
    card.className = 'car-card';
    card.innerHTML = `
      <div class="car-group-label">${escapeHTML(view.groupLabel)}</div>
      <div class="car-title-wrap">
        <h3>${escapeHTML(view.publicName)}</h3>
        <p>${escapeHTML(car.description || view.fallbackDescription)}</p>
      </div>
      <div class="car-img"><img src="${escapeHTML(view.image)}" alt="${escapeHTML(view.publicName)}"></div>
      <div class="car-meta">
        <span>${escapeHTML(view.shortType)}</span>
        <span>${Number(car.seats || 5)} posti</span>
        <span>${escapeHTML(view.fuelLabel)}</span>
      </div>
      <div class="car-price single-price">
        <div><small>Prezzo per il tuo periodo</small><br><strong>${startingText(car)}</strong><span>Seleziona le date per vedere il totale esatto.</span></div>
      </div>
      <button class="btn btn-full" data-car-id="${car.id}">Paga al ritiro</button>
    `;
    const goToBooking = () => {
      els.bookingCar.value = car.id;
      onCarChange();
      document.getElementById('prenota').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => els.pickupDate.focus(), 450);
    };
    card.querySelector('button').addEventListener('click', goToBooking);
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      goToBooking();
    });
    els.carsGrid.appendChild(card);
  });
}

function renderCarOptions() {
  els.bookingCar.innerHTML = cars.map(car => {
    const view = getPublicCarData(car);
    return `<option value="${car.id}">${escapeHTML(view.groupLabel)} · ${escapeHTML(view.publicName)}</option>`;
  }).join('');
  selectedCar = cars[0] || null;
}

function onCarChange() {
  selectedCar = cars.find(car => car.id === els.bookingCar.value) || cars[0] || null;
  updateQuote();
}

function updateQuote() {
  selectedCar = cars.find(car => car.id === els.bookingCar.value) || selectedCar;
  const quote = calculateTotal(selectedCar, els.pickupDate.value, els.returnDate.value);
  els.quoteDays.textContent = quote.days ? `${quote.days} giorni` : '—';
  els.quoteTotal.textContent = quote.total ? euro(quote.total) : '—';
  els.quoteDeposit.textContent = selectedCar?.deposit_amount ? euro(selectedCar.deposit_amount) : '—';
  if (els.pickupDate.value) {
    const minReturn = new Date(els.pickupDate.value + 'T00:00:00');
    minReturn.setDate(minReturn.getDate() + 1);
    els.returnDate.min = minReturn.toISOString().slice(0, 10);
  }
}

async function submitBooking(event) {
  event.preventDefault();
  clearMessage();
  if (!selectedCar) return showMessage('Seleziona un’auto.', 'error');

  const quote = calculateTotal(selectedCar, els.pickupDate.value, els.returnDate.value);
  if (!quote.days) return showMessage('La data di riconsegna deve essere successiva al ritiro.', 'error');

  els.bookingSubmit.disabled = true;
  els.bookingSubmit.textContent = 'Controllo disponibilità...';

  const available = await checkAvailability(selectedCar.id, els.pickupDate.value, els.returnDate.value);
  if (!available.ok) {
    els.bookingSubmit.disabled = false;
    els.bookingSubmit.textContent = 'Invia richiesta';
    return showMessage(available.message, 'error');
  }

  els.bookingSubmit.textContent = 'Invio richiesta...';
  const payload = {
    car_id: selectedCar.id,
    customer_name: els.customerName.value.trim(),
    customer_email: els.customerEmail.value.trim(),
    customer_phone: els.customerPhone.value.trim(),
    pickup_date: els.pickupDate.value,
    return_date: els.returnDate.value,
    pickup_location: FIXED_LOCATION,
    return_location: FIXED_LOCATION,
    notes: els.bookingNotes.value.trim() || null,
    days: quote.days,
    total_amount: quote.total,
    deposit_amount: selectedCar.deposit_amount || 0,
    status: 'request',
    price_details: { highDays: quote.highDays, lowDays: quote.lowDays, highPrice: selectedCar.price_high, lowPrice: selectedCar.price_low }
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select('id, booking_code')
    .single();

  if (error) {
    els.bookingSubmit.disabled = false;
    els.bookingSubmit.textContent = 'Invia richiesta';
    if (String(error.message).toLowerCase().includes('overlap')) {
      return showMessage('Questa auto non è disponibile nelle date selezionate.', 'error');
    }
    return showMessage(`Errore invio prenotazione: ${error.message}`, 'error');
  }

  await notifyBooking(data.id);
  const msg = `Richiesta inviata! Codice prenotazione ${data.booking_code}. Ti contatteremo per confermare.`;
  showMessage(msg, 'success');
  els.bookingForm.reset();
  renderCarOptions();
  updateQuote();
  els.bookingSubmit.disabled = false;
  els.bookingSubmit.textContent = 'Invia richiesta';
}

async function checkAvailability(carId, pickupDate, returnDate) {
  const { data, error } = await supabase.rpc('is_car_available', {
    p_car_id: carId,
    p_pickup_date: pickupDate,
    p_return_date: returnDate
  });
  if (error) return { ok: false, message: `Errore controllo disponibilità: ${error.message}` };
  return data ? { ok: true } : { ok: false, message: 'Auto già occupata nelle date selezionate.' };
}

async function notifyBooking(bookingId) {
  const cfg = getConfig();
  const functionName = cfg.BOOKING_FUNCTION_NAME || 'notify-booking';

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn('Notifica email non inviata: config Supabase mancante.');
    return false;
  }

  const endpoint = cfg.SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/' + functionName;

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

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.error) {
      console.warn('Notifica email non inviata:', result.error || response.status);
      return false;
    }

    console.log('Notifica email inviata:', result);
    return true;
  } catch (err) {
    console.warn('Notifica email non configurata:', err);
    return false;
  }
}

function setLoading(loading) {
  els.carsGrid.innerHTML = loading ? '<div class="empty">Caricamento auto...</div>' : '';
}

function showMessage(message, type = '') {
  els.bookingMessage.textContent = message;
  els.bookingMessage.className = `form-msg ${type}`;
}
function clearMessage() { showMessage('', ''); }

function renderEmptyDemo() {
  els.carsGrid.innerHTML = `
    <article class="car-card"><div class="car-group-label">Gruppo A</div><div class="car-img"><img src="assets/cars/panda-hybrid-blue.svg" alt="Fiat Panda o similare"></div><h3>Fiat Panda o similare</h3><p>Demo visiva. Collega Supabase per usare dati reali.</p></article>
    <article class="car-card"><div class="car-group-label">Gruppo A</div><div class="car-img"><img src="assets/cars/panda-hybrid-sand.svg" alt="Fiat Panda o similare"></div><h3>Fiat Panda o similare</h3><p>Demo visiva. Collega Supabase per usare dati reali.</p></article>
    <article class="car-card"><div class="car-group-label">Gruppo B</div><div class="car-img"><img src="assets/cars/lancia-ypsilon.svg" alt="Lancia Ypsilon o similare"></div><h3>Lancia Ypsilon o similare</h3><p>Demo visiva. Collega Supabase per usare dati reali.</p></article>
  `;
}

function escapeHTML(str = '') {
  return String(str).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
