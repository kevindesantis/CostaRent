import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.COSTARENT_CONFIG || {};
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let currentUser = null;
let cars = [];
let bookings = [];

const el = {
  loginPanel: document.getElementById('loginPanel'),
  adminPanel: document.getElementById('adminPanel'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginMessage: document.getElementById('loginMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  statusFilter: document.getElementById('statusFilter'),
  bookingsTable: document.getElementById('bookingsTable'),
  adminCarsList: document.getElementById('adminCarsList'),
  statRequests: document.getElementById('statRequests'),
  statActive: document.getElementById('statActive'),
  statCars: document.getElementById('statCars'),
  statRevenue: document.getElementById('statRevenue')
};

init();

async function init() {
  el.loginForm.addEventListener('submit', login);
  el.logoutBtn.addEventListener('click', logout);
  el.refreshBtn.addEventListener('click', loadAll);
  el.statusFilter.addEventListener('change', renderBookings);

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('bookingsTab').classList.toggle('hidden', btn.dataset.tab !== 'bookingsTab');
      document.getElementById('carsTab').classList.toggle('hidden', btn.dataset.tab !== 'carsTab');
    });
  });

  const session = await supabase.auth.getSession();
  if (session.data.session) {
    currentUser = session.data.session.user;
    await checkAdminAndEnter();
  }
}

async function login(event) {
  event.preventDefault();
  el.loginMessage.textContent = 'Accesso...';
  const { data, error } = await supabase.auth.signInWithPassword({
    email: el.loginEmail.value.trim(),
    password: el.loginPassword.value
  });
  if (error) {
    el.loginMessage.textContent = error.message;
    el.loginMessage.className = 'message error';
    return;
  }
  currentUser = data.user;
  await checkAdminAndEnter();
}

async function checkAdminAndEnter() {
  const { data, error } = await supabase.from('admins').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (error || !data) {
    el.loginMessage.textContent = 'Utente non autorizzato. Inserisci l’utente nella tabella admins.';
    el.loginMessage.className = 'message error';
    await supabase.auth.signOut();
    return;
  }
  el.loginPanel.classList.add('hidden');
  el.adminPanel.classList.remove('hidden');
  await loadAll();
}

async function loadAll() {
  await Promise.all([loadCars(), loadBookings()]);
  renderCars();
  renderBookings();
  renderStats();
}

async function loadCars() {
  const { data } = await supabase.from('cars').select('*').order('display_order', { ascending: true });
  cars = data || [];
}

async function loadBookings() {
  const { data } = await supabase.from('bookings').select('*, cars(name, category)').order('created_at', { ascending: false });
  bookings = data || [];
}

function renderBookings() {
  const filter = el.statusFilter.value;
  const list = bookings.filter((b) => filter === 'all' || b.status === filter);
  el.bookingsTable.innerHTML = list.map((b) => `
    <tr>
      <td><strong>${escapeHTML(b.booking_code)}</strong><br><small>${formatDateTime(b.created_at)}</small></td>
      <td>${escapeHTML(b.customer_name)}<br><small>${escapeHTML(b.customer_phone)}<br>${escapeHTML(b.customer_email)}</small></td>
      <td>${escapeHTML(b.cars?.name || '-')}<br><small>${escapeHTML(b.cars?.category || '')}</small></td>
      <td>${formatDateOnly(b.pickup_date)} → ${formatDateOnly(b.return_date)}<br><small>${b.days} giorni</small></td>
      <td><strong>${euro(b.total_amount)}</strong><br><small>Cauzione ${euro(b.deposit_amount)}</small></td>
      <td><span class="badge ${b.status}">${statusLabel(b.status)}</span></td>
      <td><div class="row-actions">${statusButtons(b)}</div></td>
    </tr>`).join('') || '<tr><td colspan="7">Nessuna prenotazione.</td></tr>';

  document.querySelectorAll('[data-status-change]').forEach((btn) => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.id, btn.dataset.statusChange));
  });
}

function statusButtons(booking) {
  return [
    ['confirmed', 'Conferma'],
    ['active', 'In corso'],
    ['completed', 'Chiudi'],
    ['cancelled', 'Annulla']
  ].map(([status, label]) => `<button class="mini-btn" data-id="${booking.id}" data-status-change="${status}">${label}</button>`).join('');
}

async function updateStatus(id, status) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadAll();
}

function renderCars() {
  el.adminCarsList.innerHTML = cars.map((car) => `
    <div class="admin-car">
      <h3>${escapeHTML(car.name)}</h3>
      <p>${escapeHTML(car.category || '')} • ${escapeHTML(car.fuel || '')}</p>
      <p><strong>${euro(car.price_low)}</strong> bassa stagione • <strong>${euro(car.price_high)}</strong> alta stagione</p>
      <p>Cauzione: ${euro(car.deposit_amount)}</p>
    </div>`).join('');
}

function renderStats() {
  el.statRequests.textContent = bookings.filter((b) => b.status === 'request').length;
  el.statActive.textContent = bookings.filter((b) => ['confirmed','active'].includes(b.status)).length;
  el.statCars.textContent = cars.filter((c) => c.active).length;
  const revenue = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  el.statRevenue.textContent = euro(revenue);
}

async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

function statusLabel(status) {
  return { request:'Richiesta', confirmed:'Confermata', active:'In corso', completed:'Conclusa', cancelled:'Annullata' }[status] || status;
}
function euro(value) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function formatDateOnly(value) { return value ? new Intl.DateTimeFormat('it-IT').format(new Date(value + 'T00:00:00')) : ''; }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat('it-IT', { dateStyle:'short', timeStyle:'short' }).format(new Date(value)) : ''; }
function escapeHTML(value) { return String(value || '').replace(/[&<>'"]/g, (ch) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[ch])); }
