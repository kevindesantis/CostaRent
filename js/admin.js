import { supabase, isConfigured, euro, formatDate, calculateTotal } from './supabaseClient.js';

let cars = [];
let bookings = [];
let session = null;

const el = id => document.getElementById(id);

const els = {
  loginPanel: el('loginPanel'), adminPanel: el('adminPanel'), loginForm: el('loginForm'), loginEmail: el('loginEmail'), loginPassword: el('loginPassword'), loginMessage: el('loginMessage'), logoutBtn: el('logoutBtn'), refreshBtn: el('refreshBtn'),
  statRequests: el('statRequests'), statActive: el('statActive'), statCars: el('statCars'), statRevenue: el('statRevenue'),
  bookingsTable: el('bookingsTable'), statusFilter: el('statusFilter'), exportCsvBtn: el('exportCsvBtn'),
  adminCarsList: el('adminCarsList'), carForm: el('carForm'), carFormTitle: el('carFormTitle'), carFormMessage: el('carFormMessage'), resetCarForm: el('resetCarForm'),
  manualBookingForm: el('manualBookingForm'), manualCar: el('manualCar'), manualMessage: el('manualMessage')
};

init();

async function init() {
  if (!isConfigured()) {
    showLogin('Configura Supabase in config.js prima di usare il gestionale.', 'error');
    return;
  }

  els.loginForm.addEventListener('submit', login);
  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', loadAll);
  els.statusFilter.addEventListener('change', renderBookings);
  els.exportCsvBtn.addEventListener('click', exportBookingsCsv);
  els.carForm.addEventListener('submit', saveCar);
  els.resetCarForm.addEventListener('click', resetCarForm);
  els.manualBookingForm.addEventListener('submit', saveManualBooking);
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (session) await verifyAdminAndLoad();
  else showLogin();

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    session = newSession;
    if (session) await verifyAdminAndLoad();
    else showLogin();
  });
}

async function login(event) {
  event.preventDefault();
  showLogin('Accesso in corso...');
  const { error } = await supabase.auth.signInWithPassword({
    email: els.loginEmail.value.trim(),
    password: els.loginPassword.value
  });
  if (error) showLogin(`Errore accesso: ${error.message}`, 'error');
}

async function logout() {
  await supabase.auth.signOut();
}

async function verifyAdminAndLoad() {
  const { data, error } = await supabase.rpc('current_user_is_admin');
  if (error || !data) {
    await supabase.auth.signOut();
    showLogin('Utente non autorizzato. Inserisci questo utente nella tabella admins.', 'error');
    return;
  }
  els.loginPanel.classList.add('hidden');
  els.adminPanel.classList.remove('hidden');
  await loadAll();
}

function showLogin(message = '', type = '') {
  els.adminPanel.classList.add('hidden');
  els.loginPanel.classList.remove('hidden');
  els.loginMessage.textContent = message;
  els.loginMessage.className = `form-msg ${type}`;
}

async function loadAll() {
  await Promise.all([loadCars(), loadBookings()]);
  renderStats();
}

async function loadCars() {
  const { data, error } = await supabase.from('cars').select('*').order('display_order', { ascending: true });
  if (error) return alert(`Errore auto: ${error.message}`);
  cars = data || [];
  renderAdminCars();
  renderManualCarOptions();
}

async function loadBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, cars(name, slug)')
    .order('created_at', { ascending: false });
  if (error) return alert(`Errore prenotazioni: ${error.message}`);
  bookings = data || [];
  renderBookings();
}

function renderStats() {
  els.statRequests.textContent = bookings.filter(b => b.status === 'request').length;
  els.statActive.textContent = bookings.filter(b => ['confirmed','active'].includes(b.status)).length;
  els.statCars.textContent = cars.filter(c => c.active).length;
  els.statRevenue.textContent = euro(bookings.filter(b => !['cancelled'].includes(b.status)).reduce((sum, b) => sum + Number(b.total_amount || 0), 0));
}

function renderBookings() {
  const filter = els.statusFilter.value;
  const rows = bookings.filter(b => filter === 'all' || b.status === filter);
  els.bookingsTable.innerHTML = rows.map(b => `
    <tr>
      <td><strong>${escapeHTML(b.booking_code)}</strong><br><small>${new Date(b.created_at).toLocaleString('it-IT')}</small></td>
      <td>${escapeHTML(b.customer_name)}<br><small>${escapeHTML(b.customer_phone)}<br>${escapeHTML(b.customer_email)}</small></td>
      <td>${escapeHTML(b.cars?.name || 'Auto eliminata')}</td>
      <td>${formatDate(b.pickup_date)} → ${formatDate(b.return_date)}<br><small>${b.days || ''} giorni</small></td>
      <td><strong>${euro(b.total_amount)}</strong><br><small>Cauzione ${euro(b.deposit_amount)}</small></td>
      <td><span class="status ${b.status}">${statusLabel(b.status)}</span></td>
      <td>
        <div class="row-actions">
          ${statusButton(b, 'confirmed', 'Conferma')}
          ${statusButton(b, 'active', 'In corso')}
          ${statusButton(b, 'completed', 'Chiudi')}
          ${statusButton(b, 'cancelled', 'Annulla')}
          <button class="mini-btn" data-detail="${b.id}">Dettagli</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Nessuna prenotazione.</td></tr>';

  els.bookingsTable.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => updateBookingStatus(btn.dataset.id, btn.dataset.status)));
  els.bookingsTable.querySelectorAll('[data-detail]').forEach(btn => btn.addEventListener('click', () => showBookingDetail(btn.dataset.detail)));
}

function statusButton(b, status, label) {
  if (b.status === status) return '';
  return `<button class="mini-btn" data-id="${b.id}" data-status="${status}">${label}</button>`;
}

async function updateBookingStatus(id, status) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) return alert(`Errore aggiornamento: ${error.message}`);
  await loadBookings();
  renderStats();
}

function showBookingDetail(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  alert(`Prenotazione ${b.booking_code}\n\nCliente: ${b.customer_name}\nTelefono: ${b.customer_phone}\nEmail: ${b.customer_email}\nAuto: ${b.cars?.name || ''}\nDate: ${formatDate(b.pickup_date)} - ${formatDate(b.return_date)}\nTotale: ${euro(b.total_amount)}\nRitiro: ${b.pickup_location || '-'}\nRiconsegna: ${b.return_location || '-'}\nNote: ${b.notes || '-'}`);
}

function renderAdminCars() {
  els.adminCarsList.innerHTML = cars.map(car => `
    <div class="admin-car-item">
      <div>
        <strong>${escapeHTML(car.name)}</strong> ${car.active ? '<span class="badge">attiva</span>' : '<span class="badge">non visibile</span>'}<br>
        <small>${escapeHTML(car.category || '')} • Estate ${euro(car.price_high)} • Altri mesi ${euro(car.price_low)}</small>
      </div>
      <div class="row-actions">
        <button class="mini-btn" data-edit-car="${car.id}">Modifica</button>
        <button class="mini-btn" data-toggle-car="${car.id}">${car.active ? 'Nascondi' : 'Mostra'}</button>
      </div>
    </div>
  `).join('') || '<p>Nessuna auto.</p>';
  els.adminCarsList.querySelectorAll('[data-edit-car]').forEach(btn => btn.addEventListener('click', () => editCar(btn.dataset.editCar)));
  els.adminCarsList.querySelectorAll('[data-toggle-car]').forEach(btn => btn.addEventListener('click', () => toggleCar(btn.dataset.toggleCar)));
}

function editCar(id) {
  const c = cars.find(car => car.id === id);
  if (!c) return;
  el('carId').value = c.id;
  el('carName').value = c.name || '';
  el('carSlug').value = c.slug || '';
  el('carCategory').value = c.category || '';
  el('carFuel').value = c.fuel || '';
  el('carSeats').value = c.seats || 5;
  el('carDoors').value = c.doors || 5;
  el('carOrder').value = c.display_order || 1;
  el('carHighPrice').value = c.price_high || 0;
  el('carLowPrice').value = c.price_low || 0;
  el('carDeposit').value = c.deposit_amount || 0;
  el('carDescription').value = c.description || '';
  el('carImage').value = c.image_url || '';
  el('carActive').checked = Boolean(c.active);
  els.carFormTitle.textContent = 'Modifica auto';
}

async function toggleCar(id) {
  const c = cars.find(car => car.id === id);
  if (!c) return;
  const { error } = await supabase.from('cars').update({ active: !c.active }).eq('id', id);
  if (error) return alert(error.message);
  await loadCars(); renderStats();
}

async function saveCar(event) {
  event.preventDefault();
  const id = el('carId').value;
  const payload = {
    name: el('carName').value.trim(),
    slug: el('carSlug').value.trim().toLowerCase(),
    category: el('carCategory').value.trim(),
    fuel: el('carFuel').value.trim(),
    seats: Number(el('carSeats').value || 5),
    doors: Number(el('carDoors').value || 5),
    display_order: Number(el('carOrder').value || 1),
    price_high: Number(el('carHighPrice').value || 0),
    price_low: Number(el('carLowPrice').value || 0),
    deposit_amount: Number(el('carDeposit').value || 0),
    description: el('carDescription').value.trim(),
    image_url: el('carImage').value.trim() || null,
    active: el('carActive').checked,
    high_season_months: [7, 8]
  };
  const query = id ? supabase.from('cars').update(payload).eq('id', id) : supabase.from('cars').insert(payload);
  const { error } = await query;
  els.carFormMessage.textContent = error ? `Errore: ${error.message}` : 'Auto salvata.';
  els.carFormMessage.className = `form-msg ${error ? 'error' : 'success'}`;
  if (!error) { resetCarForm(); await loadCars(); renderStats(); }
}

function resetCarForm() {
  els.carForm.reset();
  el('carId').value = '';
  el('carActive').checked = true;
  els.carFormTitle.textContent = 'Aggiungi auto';
  els.carFormMessage.textContent = '';
}

function renderManualCarOptions() {
  els.manualCar.innerHTML = cars.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
}

async function saveManualBooking(event) {
  event.preventDefault();
  const car = cars.find(c => c.id === els.manualCar.value);
  const pickup = el('manualPickup').value;
  const ret = el('manualReturn').value;
  const quote = calculateTotal(car, pickup, ret);
  if (!quote.days) return setManualMessage('Date non valide.', 'error');

  const { data: available, error: availabilityError } = await supabase.rpc('is_car_available', { p_car_id: car.id, p_pickup_date: pickup, p_return_date: ret });
  if (availabilityError) return setManualMessage(availabilityError.message, 'error');
  if (!available) return setManualMessage('Auto non disponibile in queste date.', 'error');

  const payload = {
    car_id: car.id,
    customer_name: el('manualName').value.trim(),
    customer_phone: el('manualPhone').value.trim(),
    customer_email: el('manualEmail').value.trim(),
    pickup_date: pickup,
    return_date: ret,
    days: quote.days,
    total_amount: quote.total,
    deposit_amount: car.deposit_amount || 0,
    notes: el('manualNotes').value.trim() || null,
    status: 'confirmed',
    price_details: { manual: true, highDays: quote.highDays, lowDays: quote.lowDays }
  };
  const { error } = await supabase.from('bookings').insert(payload);
  if (error) return setManualMessage(error.message, 'error');
  setManualMessage('Prenotazione manuale creata e confermata.', 'success');
  els.manualBookingForm.reset();
  await loadBookings(); renderStats();
}

function setManualMessage(text, type) { els.manualMessage.textContent = text; els.manualMessage.className = `form-msg ${type}`; }

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== tabId));
}

function exportBookingsCsv() {
  const rows = [['codice','cliente','telefono','email','auto','ritiro','riconsegna','giorni','totale','stato']];
  bookings.forEach(b => rows.push([b.booking_code, b.customer_name, b.customer_phone, b.customer_email, b.cars?.name || '', b.pickup_date, b.return_date, b.days, b.total_amount, b.status]));
  const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `costarent-prenotazioni-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function statusLabel(status) {
  return ({ request: 'Richiesta', confirmed: 'Confermata', active: 'In corso', completed: 'Conclusa', cancelled: 'Annullata' })[status] || status;
}

function escapeHTML(str = '') {
  return String(str).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
