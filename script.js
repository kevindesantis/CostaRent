// COSTARENT - CONFIGURAZIONE RAPIDA
// Inserisci il numero WhatsApp aziendale in formato internazionale, senza + e senza spazi.
// Esempio: const WHATSAPP_NUMBER = "393331234567";
const WHATSAPP_NUMBER = "390000000000";

const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");
const bookingForm = document.getElementById("bookingForm");
const estimateBox = document.getElementById("estimate");
const directWhatsapp = document.getElementById("directWhatsapp");

document.getElementById("year").textContent = new Date().getFullYear();

navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

document.querySelectorAll("[data-car]").forEach((link) => {
  link.addEventListener("click", () => {
    const car = link.getAttribute("data-car");
    const carSelect = document.getElementById("car");
    if (carSelect && car) carSelect.value = car;
  });
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

function calculateEstimate(car, start, end) {
  if (!start || !end || end <= start) return null;

  let total = 0;
  let days = 0;
  let current = new Date(start);

  while (current < end) {
    const summer = isSummer(current);
    if (car === "Lancia Ypsilon") {
      total += summer ? 45 : 35;
    } else if (car === "Fiat Panda Hybrid") {
      total += summer ? 40 : 30;
    } else {
      // Stima prudente se il cliente seleziona indifferente: media tra Panda e Ypsilon.
      total += summer ? 43 : 33;
    }
    days += 1;
    current = addDays(current, 1);
  }

  return { total, days };
}

function updateEstimate() {
  const car = document.getElementById("car")?.value;
  const start = dateFromInput(document.getElementById("startDate")?.value);
  const end = dateFromInput(document.getElementById("endDate")?.value);
  const estimate = calculateEstimate(car, start, end);

  if (!estimate) {
    estimateBox.textContent = "Seleziona date valide per vedere una stima.";
    return;
  }

  estimateBox.textContent = `Stima indicativa: ${estimate.days} giorni · circa ${estimate.total}€. La conferma dipende dalla disponibilità e dalle condizioni di noleggio.`;
}

["car", "startDate", "endDate"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", updateEstimate);
});

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const car = document.getElementById("car").value;
  const startValue = document.getElementById("startDate").value;
  const endValue = document.getElementById("endDate").value;
  const notes = document.getElementById("notes").value.trim();

  const start = dateFromInput(startValue);
  const end = dateFromInput(endValue);
  const estimate = calculateEstimate(car, start, end);

  if (!estimate) {
    estimateBox.textContent = "Controlla le date: la data finale deve essere successiva a quella iniziale.";
    return;
  }

  const message = [
    "Ciao CostaRent, vorrei verificare disponibilità per un noleggio.",
    `Nome: ${name}`,
    `Telefono: ${phone}`,
    `Auto preferita: ${car}`,
    `Dal: ${startValue}`,
    `Al: ${endValue}`,
    `Durata: ${estimate.days} giorni`,
    `Stima sito: circa ${estimate.total}€`,
    notes ? `Note: ${notes}` : "Note: nessuna",
  ].join("\n");

  if (WHATSAPP_NUMBER === "390000000000") {
    alert("Configura prima il numero WhatsApp nel file script.js, riga WHATSAPP_NUMBER.");
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
