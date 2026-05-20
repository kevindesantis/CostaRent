// COSTARENT - CONFIGURAZIONE RAPIDA
// Inserisci il numero WhatsApp aziendale in formato internazionale, senza + e senza spazi.
// Esempio: const WHATSAPP_NUMBER = "393331234567";
const WHATSAPP_NUMBER = "390000000000";

const cars = [
  {
    id: "panda-1",
    name: "Fiat Panda Hybrid 1",
    shortName: "Panda 1",
    type: "Hybrid",
    seats: 4,
    fuel: "Mild Hybrid",
    summerPrice: 40,
    lowPrice: 30,
    description: "Compatta, economica e ideale per città, mare e spostamenti locali.",
    colorClass: "panda"
  },
  {
    id: "panda-2",
    name: "Fiat Panda Hybrid 2",
    shortName: "Panda 2",
    type: "Hybrid",
    seats: 4,
    fuel: "Mild Hybrid",
    summerPrice: 40,
    lowPrice: 30,
    description: "Seconda Panda per aumentare disponibilità nei periodi turistici.",
    colorClass: "panda-2"
  },
  {
    id: "ypsilon-1",
    name: "Lancia Ypsilon",
    shortName: "Ypsilon",
    type: "Comfort",
    seats: 4,
    fuel: "Benzina/Hybrid da definire",
    summerPrice: 45,
    lowPrice: 35,
    description: "Più elegante e confortevole, adatta a weekend e clienti che cercano qualcosa in più.",
    colorClass: "ypsilon"
  }
];

const STORAGE_KEY = "costarent_demo_bookings";
let selectedCarId = cars[0].id;
let currentStep = 1;

const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");
const bookingForm = document.getElementById("bookingForm");
const estimateBox = document.getElementById("estimate");
const summaryCard = document.getElementById("summaryCard");
const availabilityBox = document.getElementById("availabilityBox");
const directWhatsapp = document.getElementById("directWhatsapp");
const nextStep = document.getElementById("nextStep");
const prevStep = document.getElementById("prevStep");
const saveDemoBooking = document.getElementById("saveDemoBooking");
const clearBookings = document.getElementById("clearBookings");

document.getElementById("year").textContent = new Date().getFullYear();

navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

function isSummer(date) {
  const month = date.getMonth() + 1;
  return month === 7 || month === 8;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateFromInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateIT(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? dateFromInput(value) : value;
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getCar(carId) {
  return cars.find((car) => car.id === carId) || cars[0];
}

function calculateEstimate(carId, start, end) {
  if (!start || !end || end <= start) return null;
  const car = getCar(carId);
  let total = 0;
  let days = 0;
  let summerDays = 0;
  let lowDays = 0;
  let current = new Date(start);

  while (current < end) {
    if (isSummer(current)) {
      total += car.summerPrice;
      summerDays += 1;
    } else {
      total += car.lowPrice;
      lowDays += 1;
    }
    days += 1;
    current = addDays(current, 1);
  }

  return { total, days, summerDays, lowDays, car };
}

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function isCarAvailable(carId, startValue, endValue) {
  const start = dateFromInput(startValue);
  const end = dateFromInput(endValue);
  if (!start || !end || end <= start) return { ok: false, reason: "Date non valide" };
  const bookings = getBookings();
  const conflict = bookings.find((booking) => {
    if (booking.carId !== carId) return false;
    return rangesOverlap(start, end, dateFromInput(booking.startDate), dateFromInput(booking.endDate));
  });
  if (conflict) {
    return { ok: false, reason: `Auto già impegnata dal ${formatDateIT(conflict.startDate)} al ${formatDateIT(conflict.endDate)}.` };
  }
  return { ok: true, reason: "Auto disponibile nelle date selezionate." };
}

function renderFleet() {
  const fleetGrid = document.getElementById("fleetGrid");
  const carChoiceGrid = document.getElementById("carChoiceGrid");
  if (!fleetGrid || !carChoiceGrid) return;

  fleetGrid.innerHTML = cars.map((car, index) => `
    <article class="fleet-card ${index === 2 ? "featured" : ""}">
      <div class="fleet-top">
        <span class="badge">${car.type}</span>
        <span class="price-tag">${car.lowPrice}€ / ${car.summerPrice}€</span>
      </div>
      <div class="fleet-car ${car.colorClass}" aria-hidden="true"></div>
      <h3>${car.name}</h3>
      <p>${car.description}</p>
      <ul class="features">
        <li>${car.seats} posti</li>
        <li>${car.fuel}</li>
        <li>Alta stagione ${car.summerPrice}€</li>
      </ul>
      <button class="text-link" type="button" data-select-car="${car.id}">Prenota questa auto →</button>
    </article>
  `).join("");

  carChoiceGrid.innerHTML = cars.map((car) => `
    <button class="car-choice ${car.id === selectedCarId ? "selected" : ""}" type="button" data-select-car="${car.id}">
      <span class="car-icon ${car.colorClass}" aria-hidden="true"></span>
      <span>
        <h4>${car.name}</h4>
        <p>${car.description}</p>
      </span>
      <span class="price-tag">${car.lowPrice}€ / ${car.summerPrice}€</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-select-car]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCarId = button.getAttribute("data-select-car");
      document.querySelectorAll(".car-choice").forEach((choice) => choice.classList.remove("selected"));
      document.querySelectorAll(`.car-choice[data-select-car="${selectedCarId}"]`).forEach((choice) => choice.classList.add("selected"));
      updateEstimate();
      document.getElementById("prenota")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setStep(step) {
  currentStep = Math.min(4, Math.max(1, step));
  document.querySelectorAll(".form-screen").forEach((screen) => {
    screen.classList.toggle("active", Number(screen.dataset.step) === currentStep);
  });
  document.querySelectorAll(".booking-step").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.stepTarget) === currentStep);
  });
  prevStep.style.visibility = currentStep === 1 ? "hidden" : "visible";
  nextStep.style.display = currentStep === 4 ? "none" : "inline-flex";
  updateEstimate();
}

function getFormValues() {
  return {
    carId: selectedCarId,
    startDate: document.getElementById("startDate")?.value || "",
    endDate: document.getElementById("endDate")?.value || "",
    name: document.getElementById("name")?.value.trim() || "",
    phone: document.getElementById("phone")?.value.trim() || "",
    pickup: document.getElementById("pickup")?.value.trim() || "",
    notes: document.getElementById("notes")?.value.trim() || ""
  };
}

function updateEstimate() {
  const values = getFormValues();
  const start = dateFromInput(values.startDate);
  const end = dateFromInput(values.endDate);
  const estimate = calculateEstimate(values.carId, start, end);

  if (!estimate) {
    availabilityBox.className = "availability-box";
    availabilityBox.textContent = "Seleziona date valide per controllare la disponibilità.";
    estimateBox.textContent = "Completa i passaggi per vedere il riepilogo.";
    summaryCard.innerHTML = "";
    return;
  }

  const availability = isCarAvailable(values.carId, values.startDate, values.endDate);
  availabilityBox.className = `availability-box ${availability.ok ? "ok" : "no"}`;
  availabilityBox.textContent = availability.reason;

  estimateBox.textContent = `${estimate.car.name}: ${estimate.days} giorni · stima ${estimate.total}€.`;
  summaryCard.innerHTML = `
    <div class="summary-row"><span>Auto</span><strong>${estimate.car.name}</strong></div>
    <div class="summary-row"><span>Periodo</span><strong>${formatDateIT(values.startDate)} → ${formatDateIT(values.endDate)}</strong></div>
    <div class="summary-row"><span>Giorni</span><strong>${estimate.days}</strong></div>
    <div class="summary-row"><span>Alta stagione</span><strong>${estimate.summerDays} giorni</strong></div>
    <div class="summary-row"><span>Bassa stagione</span><strong>${estimate.lowDays} giorni</strong></div>
    <div class="summary-row"><span>Totale indicativo</span><strong>${estimate.total}€</strong></div>
    <div class="summary-row"><span>Disponibilità demo</span><strong>${availability.ok ? "Disponibile" : "Non disponibile"}</strong></div>
  `;
}

function validateBeforeStep(step) {
  const values = getFormValues();
  if (step >= 2 && !selectedCarId) {
    alert("Seleziona prima un'auto.");
    return false;
  }
  if (step >= 3) {
    const availability = isCarAvailable(values.carId, values.startDate, values.endDate);
    if (!availability.ok) {
      alert(availability.reason);
      return false;
    }
  }
  if (step >= 4) {
    if (!values.name || !values.phone) {
      alert("Inserisci nome e telefono.");
      return false;
    }
  }
  return true;
}

function makeBookingPayload() {
  const values = getFormValues();
  const estimate = calculateEstimate(values.carId, dateFromInput(values.startDate), dateFromInput(values.endDate));
  if (!estimate) return null;
  return {
    id: `CR-${Date.now()}`,
    status: "Richiesta demo",
    createdAt: new Date().toISOString(),
    ...values,
    carName: estimate.car.name,
    days: estimate.days,
    total: estimate.total,
    summerDays: estimate.summerDays,
    lowDays: estimate.lowDays
  };
}

function saveDemoRequest() {
  const values = getFormValues();
  const availability = isCarAvailable(values.carId, values.startDate, values.endDate);
  if (!availability.ok) {
    alert(availability.reason);
    return;
  }
  if (!values.name || !values.phone) {
    alert("Inserisci nome e telefono prima di salvare la richiesta demo.");
    return;
  }
  const payload = makeBookingPayload();
  if (!payload) return;
  const bookings = getBookings();
  bookings.push(payload);
  saveBookings(bookings);
  renderBookings();
  updateEstimate();
  alert("Prenotazione demo salvata. La trovi nella sezione 'Demo prenotazioni'.");
}

function renderBookings() {
  const body = document.getElementById("bookingsBody");
  if (!body) return;
  const bookings = getBookings().sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (bookings.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-row">Nessuna prenotazione demo salvata.</td></tr>`;
    return;
  }
  body.innerHTML = bookings.map((booking) => `
    <tr>
      <td><strong>${booking.name}</strong><br><small>${booking.phone}</small></td>
      <td>${booking.carName}</td>
      <td>${formatDateIT(booking.startDate)} → ${formatDateIT(booking.endDate)}</td>
      <td>${booking.days}</td>
      <td><strong>${booking.total}€</strong></td>
      <td><span class="status-pill pending">${booking.status}</span></td>
    </tr>
  `).join("");
}

function buildWhatsappMessage() {
  const payload = makeBookingPayload();
  if (!payload) return null;
  return [
    "Ciao CostaRent, vorrei verificare disponibilità per un noleggio.",
    `Nome: ${payload.name}`,
    `Telefono: ${payload.phone}`,
    `Auto: ${payload.carName}`,
    `Dal: ${payload.startDate}`,
    `Al: ${payload.endDate}`,
    `Durata: ${payload.days} giorni`,
    `Stima sito: ${payload.total}€`,
    `Ritiro/consegna: ${payload.pickup || "da concordare"}`,
    payload.notes ? `Note: ${payload.notes}` : "Note: nessuna"
  ].join("\n");
}

nextStep?.addEventListener("click", () => {
  const targetStep = currentStep + 1;
  if (validateBeforeStep(targetStep)) setStep(targetStep);
});

prevStep?.addEventListener("click", () => setStep(currentStep - 1));

document.querySelectorAll(".booking-step").forEach((button) => {
  button.addEventListener("click", () => {
    const step = Number(button.dataset.stepTarget);
    if (validateBeforeStep(step)) setStep(step);
  });
});

["startDate", "endDate", "name", "phone", "pickup", "notes"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", updateEstimate);
  document.getElementById(id)?.addEventListener("change", updateEstimate);
});

saveDemoBooking?.addEventListener("click", saveDemoRequest);

clearBookings?.addEventListener("click", () => {
  if (confirm("Vuoi cancellare tutte le prenotazioni demo salvate in questo browser?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderBookings();
    updateEstimate();
  }
});

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = getFormValues();
  const availability = isCarAvailable(values.carId, values.startDate, values.endDate);
  if (!availability.ok) {
    alert(availability.reason);
    return;
  }
  if (!values.name || !values.phone) {
    alert("Inserisci nome e telefono.");
    return;
  }
  const message = buildWhatsappMessage();
  if (!message) return;
  if (WHATSAPP_NUMBER === "390000000000") {
    alert("Modalità demo: configura prima il numero WhatsApp nel file script.js alla voce WHATSAPP_NUMBER. Intanto puoi salvare la prenotazione demo.");
    return;
  }
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

directWhatsapp?.addEventListener("click", (event) => {
  event.preventDefault();
  if (WHATSAPP_NUMBER === "390000000000") {
    alert("Configura prima il numero WhatsApp nel file script.js, riga WHATSAPP_NUMBER.");
    return;
  }
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Ciao CostaRent, vorrei informazioni sul noleggio auto.")}`, "_blank", "noopener,noreferrer");
});

renderFleet();
renderBookings();
setStep(1);
updateEstimate();
