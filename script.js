let receipts = [];
let mealsState = {};

document.addEventListener('DOMContentLoaded', () => {
  setupDefaultDates();
  setupListeners();
  updateDaysGrid();
});

function setupDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0);

  document.getElementById('startDateInput').value = formatDateForInput(start);
  document.getElementById('endDateInput').value = formatDateForInput(end);
}

function formatDateForInput(date) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setupListeners() {
  document.getElementById('startDateInput').addEventListener('change', updateDaysGrid);
  document.getElementById('endDateInput').addEventListener('change', updateDaysGrid);
  document.getElementById('kmInput').addEventListener('input', calculateAll);
  document.getElementById('addReceiptBtn').addEventListener('click', addReceiptRow);
}

function updateDaysGrid() {
  const startVal = document.getElementById('startDateInput').value;
  const endVal = document.getElementById('endDateInput').value;
  const container = document.getElementById('daysContainer');

  if (!startVal || !endVal) return;

  const start = new Date(startVal);
  const end = new Date(endVal);

  if (end <= start) {
    container.innerHTML = '<p class="text-xs text-rose-400">Reiseende muss nach dem Reisebeginn liegen.</p>';
    calculateAll();
    return;
  }

  const days = [];
  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current <= lastDay) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  container.innerHTML = '';

  days.forEach((day, index) => {
    const dateStr = day.toISOString().split('T')[0];
    const formattedDate = day.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

    if (!mealsState[dateStr]) {
      mealsState[dateStr] = { b: false, l: false, d: false };
    }

    const row = document.createElement('div');
    row.className = 'bg-slate-900 p-3 rounded-lg border border-slate-700/70 space-y-2';
    row.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <span class="font-semibold text-slate-200">${formattedDate}</span>
        <span class="text-slate-400">${index === 0 ? 'Anreisetag' : (index === days.length - 1 ? 'Abreisetag' : 'Zwischentag')}</span>
      </div>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
          <input type="checkbox" ${mealsState[dateStr].b ? 'checked' : ''} onchange="toggleMeal('${dateStr}', 'b', this.checked)" class="rounded text-blue-600 bg-slate-800">
          <span>Frühstück (-5,60€)</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
          <input type="checkbox" ${mealsState[dateStr].l ? 'checked' : ''} onchange="toggleMeal('${dateStr}', 'l', this.checked)" class="rounded text-blue-600 bg-slate-800">
          <span>Mittag (-11,20€)</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
          <input type="checkbox" ${mealsState[dateStr].d ? 'checked' : ''} onchange="toggleMeal('${dateStr}', 'd', this.checked)" class="rounded text-blue-600 bg-slate-800">
          <span>Abend (-11,20€)</span>
        </label>
      </div>
    `;
    container.appendChild(row);
  });

  calculateAll();
}

function toggleMeal(dateStr, mealType, checked) {
  if (mealsState[dateStr]) {
    mealsState[dateStr][mealType] = checked;
    calculateAll();
  }
}

function addReceiptRow() {
  const id = Date.now().toString();
  receipts.push({ id, title: 'Hotel / Parken', amount: 0 });
  renderReceipts();
  calculateAll();
}

function removeReceipt(id) {
  receipts = receipts.filter(r => r.id !== id);
  renderReceipts();
  calculateAll();
}

function renderReceipts() {
  const container = document.getElementById('receiptsContainer');
  container.innerHTML = '';

  if (receipts.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic">Keine Belege hinzugefügt.</p>';
    return;
  }

  receipts.forEach(r => {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    row.innerHTML = `
      <input type="text" value="${r.title}" placeholder="Bezeichnung" oninput="updateReceipt('${r.id}', 'title', this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100">
      <input type="text" inputmode="decimal" value="${r.displayAmount !== undefined ? r.displayAmount : ''}" placeholder="0,00" oninput="updateReceipt('${r.id}', 'amount', this.value)" class="w-24 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 text-right">
      <button onclick="removeReceipt('${r.id}')" class="text-rose-400 hover:text-rose-300 text-xs p-1">🗑️</button>
    `;
    container.appendChild(row);
  });
}

function updateReceipt(id, field, value) {
  const r = receipts.find(item => item.id === id);
  if (r) {
    if (field === 'amount') {
      r.displayAmount = value;
      const parsed = parseFloat(value.replace(',', '.')) || 0;
      r.amount = parsed;
    } else {
      r[field] = value;
    }
    calculateAll();
  }
}

function calculateAll() {
  const startVal = document.getElementById('startDateInput').value;
  const endVal = document.getElementById('endDateInput').value;

  if (!startVal || !endVal) return;

  const start = new Date(startVal);
  const end = new Date(endVal);
  const diffMs = end - start;

  if (diffMs <= 0) {
    document.getElementById('summaryDuration').textContent = 'Ungültig';
    document.getElementById('summaryTotal').textContent = '0,00 €';
    return;
  }

  const totalHours = diffMs / (1000 * 60 * 60);
  document.getElementById('summaryDuration').textContent = `${totalHours.toFixed(1)} Std.`;

  let perDiemTotal = 0;
  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current <= lastDay) {
    const dateStr = current.toISOString().split('T')[0];
    const isFirstDay = current.getTime() === (new Date(start.getFullYear(), start.getMonth(), start.getDate())).getTime();
    const isLastDay = current.getTime() === lastDay.getTime();

    let dayBaseRate = 0;

    if (isFirstDay && isLastDay) {
      if (totalHours > 8) dayBaseRate = 14.00;
    } else if (isFirstDay || isLastDay) {
      dayBaseRate = 14.00;
    } else {
      dayBaseRate = 28.00;
    }

    if (dayBaseRate > 0 && mealsState[dateStr]) {
      if (mealsState[dateStr].b) dayBaseRate = Math.max(0, dayBaseRate - 5.60);
      if (mealsState[dateStr].l) dayBaseRate = Math.max(0, dayBaseRate - 11.20);
      if (mealsState[dateStr].d) dayBaseRate = Math.max(0, dayBaseRate - 11.20);
    }

    perDiemTotal += dayBaseRate;
    current.setDate(current.getDate() + 1);
  }

  const km = parseFloat(document.getElementById('kmInput').value) || 0;
  const kmTotal = km * 0.30;
  const receiptsTotal = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const grandTotal = perDiemTotal + kmTotal + receiptsTotal;

  document.getElementById('summaryPerDiem').textContent = formatCurrency(perDiemTotal);
  document.getElementById('summaryKm').textContent = formatCurrency(kmTotal);
  document.getElementById('summaryReceipts').textContent = formatCurrency(receiptsTotal);
  document.getElementById('summaryTotal').textContent = formatCurrency(grandTotal);
}

function formatCurrency(amount) {
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

window.toggleMeal = toggleMeal;
window.updateReceipt = updateReceipt;
window.removeReceipt = removeReceipt;
