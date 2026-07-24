// Expense & Budget Visualizer — script.js

// ── Storage ──────────────────────────────────────────────────
const STORAGE_KEY = 'evb_transactions';
const CATEGORY_KEY = 'evb_categories';
const THEME_KEY = 'theme';

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
}

function saveTransactions(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
}

function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CATEGORY_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
}

function saveCustomCategories(list) {
  try { localStorage.setItem(CATEGORY_KEY, JSON.stringify(list)); } catch (e) {}
}

// ── State ─────────────────────────────────────────────────────
let transactions = loadTransactions();
let customCategories = loadCustomCategories();
const BASE_CATEGORIES = ['Food', 'Transport', 'Fun'];

function getCategories() {
  return BASE_CATEGORIES.concat(customCategories);
}

// ── Chart.js instance ─────────────────────────────────────────
let pieChart = null;

const CHART_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#00b894', '#6c5ce7',
  '#e17055', '#74b9ff'
];

// ── DOM refs ──────────────────────────────────────────────────
const balanceEl    = document.getElementById('balance-display');
const formEl       = document.getElementById('transaction-form');
const descEl       = document.getElementById('desc');
const amountEl     = document.getElementById('amount');
const categoryEl   = document.getElementById('category');
const dateEl       = document.getElementById('date');
const formErrorEl  = document.getElementById('form-error');
const listEl       = document.getElementById('transaction-list');
const newCatEl     = document.getElementById('new-category');
const addCatBtn    = document.getElementById('add-category-btn');
const themeBtn     = document.getElementById('theme-toggle');
const summaryEl    = document.getElementById('summary-container');
const chartEmptyEl = document.getElementById('chart-empty');
const chartCanvas  = document.getElementById('pie-chart');

// ── Helpers ───────────────────────────────────────────────────
function formatRp(amount) {
  return 'Rp ' + Math.round(Math.abs(amount)).toLocaleString('id-ID');
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Render: balance ───────────────────────────────────────────
function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  balanceEl.textContent = formatRp(total);
  balanceEl.className = '';
}

// ── Render: chart ─────────────────────────────────────────────
function renderChart() {
  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);

  if (labels.length === 0) {
    chartCanvas.style.display = 'none';
    chartEmptyEl.style.display = 'block';
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    return;
  }

  chartCanvas.style.display = 'block';
  chartEmptyEl.style.display = 'none';

  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (pieChart) {
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = data;
    pieChart.data.datasets[0].backgroundColor = colors;
    pieChart.update();
  } else {
    pieChart = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 13 }, padding: 12 }
          }
        }
      }
    });
  }
}

// ── Render: transaction list ──────────────────────────────────
function renderList() {
  if (transactions.length === 0) {
    listEl.innerHTML = '<li class="empty-state">No transactions yet.</li>';
    return;
  }

  const sorted = [...transactions].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.ts - a.ts;
  });

  listEl.innerHTML = '';
  sorted.forEach(t => {
    const li = document.createElement('li');
    li.className = 'tx-item';
    li.innerHTML = `
      <span class="tx-name">${escHtml(t.desc)}</span>
      <span class="tx-amount">${formatRp(t.amount)}</span>
      <span class="tx-badge">${escHtml(t.category)}</span>
      <span class="tx-date">${t.date}</span>
      <button class="tx-delete" data-id="${t.id}" title="Delete">✕</button>
    `;
    listEl.appendChild(li);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Render: monthly summary ───────────────────────────────────
function renderSummary() {
  if (transactions.length === 0) {
    summaryEl.innerHTML = '<p class="empty-state">No transactions yet.</p>';
    return;
  }

  const months = {};
  transactions.forEach(t => {
    const m = t.date.slice(0, 7);
    months[m] = (months[m] || 0) + t.amount;
  });

  const sorted = Object.keys(months).sort((a, b) => b.localeCompare(a));

  const rows = sorted.map(m => {
    const total = months[m];
    return `<tr>
      <td>${m}</td>
      <td class="col-expense">${formatRp(total)}</td>
    </tr>`;
  }).join('');

  summaryEl.innerHTML = `
    <table class="summary-table">
      <thead>
        <tr><th>Month</th><th>Expenses</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ── Render: category <select> ─────────────────────────────────
function renderCategorySelect(keepValue) {
  const prev = keepValue || categoryEl.value;
  categoryEl.innerHTML = '<option value="">-- Select category --</option>';
  getCategories().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    categoryEl.appendChild(opt);
  });
  if (prev) categoryEl.value = prev;
}

// ── Render: all ───────────────────────────────────────────────
function renderAll() {
  renderBalance();
  renderChart();
  renderList();
  renderSummary();
}

// ── Add transaction ───────────────────────────────────────────
formEl.addEventListener('submit', function (e) {
  e.preventDefault();
  formErrorEl.textContent = '';

  const desc     = descEl.value.trim();
  const amount   = parseFloat(amountEl.value);
  const category = categoryEl.value;
  const date     = dateEl.value;

  if (!desc)              return showError('Item name is required.');
  if (!amount || amount <= 0) return showError('Enter a valid amount greater than 0.');
  if (!category)          return showError('Please select a category.');
  if (!date)              return showError('Please select a date.');

  const t = { id: generateId(), desc, amount, category, date, ts: Date.now() };
  transactions.push(t);
  saveTransactions(transactions);

  formEl.reset();
  dateEl.value = today();
  renderCategorySelect();
  renderAll();
});

function showError(msg) {
  formErrorEl.textContent = msg;
}

// ── Delete transaction ────────────────────────────────────────
listEl.addEventListener('click', function (e) {
  const btn = e.target.closest('.tx-delete');
  if (!btn) return;
  if (!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t => t.id !== btn.dataset.id);
  saveTransactions(transactions);
  renderAll();
});

// ── Add custom category ───────────────────────────────────────
addCatBtn.addEventListener('click', function () {
  const name = newCatEl.value.trim();
  if (!name) return;
  if (name.length > 30) { alert('Category name must be 30 characters or fewer.'); return; }
  if (getCategories().some(c => c.toLowerCase() === name.toLowerCase())) {
    alert('That category already exists.');
    return;
  }
  customCategories.push(name);
  saveCustomCategories(customCategories);
  renderCategorySelect(name);
  newCatEl.value = '';
  newCatEl.focus();
});

// ── Dark/light theme toggle ───────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '🌙' : '🌞';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

themeBtn.addEventListener('click', function () {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Init ──────────────────────────────────────────────────────
(function init() {
  // Set date field to today
  dateEl.value = today();

  // Restore theme
  try {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved === 'dark' ? 'dark' : 'light');
  } catch (e) { applyTheme('light'); }

  // Populate categories
  renderCategorySelect();

  // Initial render
  renderAll();
}());
