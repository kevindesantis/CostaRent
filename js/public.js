import { supabase, isConfigured, getConfig, euro, formatDate, calculateTotal, todayISO, makeWhatsAppLink } from './supabaseClient.js';

let cars = [];
let selectedCar = null;

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
  pickupLocation: document.getElementById('pickupLocation'),
  returnLocation: document.getElementById('returnLocation'),
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
    card.className = 'car-card';
    card.innerHTML = `
      <div class="car-img">${car.image_url ? `<img src="${escapeHTML(car.image_url)}" alt="${escapeHTML(car.name)}">` : '🚗'}</div>
      <div>
        <h3>${escapeHTML(car.name)}</h3>
        <p>${escapeHTML(car.description || 'Auto comoda, economica e perfetta per muoversi in Calabria.')}</p>
      </div>
      <div class="car-meta">
        <span>${escapeHTML(car.fuel || 'Hybrid')}</span>
        <span>${Number(car.seats || 5)} posti</span>
        <span>${Number(car.doors || 5)} porte</span>
      </div>
      <div class="car-price">
        <div><small>Luglio/agosto</small><br><strong>${euro(car.price_high)}</strong></div>
        <div><small>Altri mesi</small><br><strong>${euro(car.price_low)}</strong></div>
      </div>
      <button class="btn btn-full" data-car-id="${car.id}">Prenota questa auto</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      els.bookingCar.value = car.id;
      onCarChange();
      document.getElementById('prenota').scrollIntoView({ behavior: 'smooth' });
    });
    els.carsGrid.appendChild(card);
  });
}

function renderCarOptions() {
  els.bookingCar.innerHTML = cars.map(car => `<option value="${car.id}">${escapeHTML(car.name)}</option>`).join('');
  selectedCar = cars[0] || null;
}

function onCarChange() {
  selectedCar = cars.find(car => car.id === els.bookingCar.value) || cars[0] || null;
  updateQuote();
}

function updateQuote() {
  selectedCar = cars.find(car => car.id === els.bookingCar.value) || selectedCar;
  const quote = calculateTotal(selectedCar, els.pickupDate.value, els.returnDate.value);
  els.quoteDays.textContent = quote.days ? `${quote.days}` : '—';
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
    pickup_location: els.pickupLocation.value.trim() || null,
    return_location: els.returnLocation.value.trim() || els.pickupLocation.value.trim() || null,
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
  try {
    const { error } = await supabase.functions.invoke(cfg.BOOKING_FUNCTION_NAME || 'notify-booking', {
      body: { booking_id: bookingId }
    });
    if (error) console.warn('Notifica email non inviata:', error.message);
  } catch (err) {
    console.warn('Notifica email non configurata:', err);
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
    <article class="car-card"><div class="car-img">🚗</div><h3>Fiat Panda Hybrid</h3><p>Demo visiva. Collega Supabase per usare dati reali.</p></article>
    <article class="car-card"><div class="car-img">🚙</div><h3>Lancia/Ypsilon</h3><p>Demo visiva. Collega Supabase per usare dati reali.</p></article>
  `;
}

function escapeHTML(str = '') {
  return String(str).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
