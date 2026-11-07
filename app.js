const store = {
  transactions: JSON.parse(localStorage.getItem('sf_transactions') || '[]'),
  savingsGoals: JSON.parse(localStorage.getItem('sf_goals') || '[]'),
  budgetCategories: JSON.parse(localStorage.getItem('sf_budget_cats') || '[]'),
  incomeSources: JSON.parse(localStorage.getItem('sf_income_sources') || '[]'),
  currentPage: 'dashboard',
  txType: 'expense',
  monthOffset: 0,
};
const charts = {};
function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  // Also catch any chart Chart.js may have registered on the canvas itself
  const canvas = document.getElementById(id);
  if (canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  }
}
function makeChart(id, config) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const chart = new Chart(canvas, config);
  charts[id] = chart;
  return chart;
}

function saveStore() {
  localStorage.setItem('sf_transactions', JSON.stringify(store.transactions));
  localStorage.setItem('sf_goals', JSON.stringify(store.savingsGoals));
  localStorage.setItem('sf_budget_cats', JSON.stringify(store.budgetCategories));
  localStorage.setItem('sf_income_sources', JSON.stringify(store.incomeSources));
}

function seedData() {
  if (store.transactions.length > 0) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  store.transactions = [
    { id: uid(), type: 'expense', desc: 'Canteen Lunch', amount: 120, category: 'food', date: `${y}-${m}-01`, note: '' },
    { id: uid(), type: 'expense', desc: 'Metro Card Recharge', amount: 500, category: 'transport', date: `${y}-${m}-02`, note: '' },
    { id: uid(), type: 'expense', desc: 'Textbooks – Algorithm Design', amount: 890, category: 'education', date: `${y}-${m}-03`, note: '' },
    { id: uid(), type: 'expense', desc: 'Netflix Subscription', amount: 199, category: 'entertainment', date: `${y}-${m}-04`, note: '' },
    { id: uid(), type: 'expense', desc: 'Pharmacy – Cold Medicine', amount: 180, category: 'health', date: `${y}-${m}-05`, note: '' },
    { id: uid(), type: 'expense', desc: 'New Headphones', amount: 2100, category: 'shopping', date: `${y}-${m}-06`, note: '' },
    { id: uid(), type: 'expense', desc: 'Electricity Bill Share', amount: 650, category: 'utilities', date: `${y}-${m}-07`, note: '' },
    { id: uid(), type: 'expense', desc: 'Pizza Night', amount: 350, category: 'food', date: `${y}-${m}-09`, note: '' },
    { id: uid(), type: 'expense', desc: 'Bus Pass', amount: 400, category: 'transport', date: `${y}-${m}-10`, note: '' },
    { id: uid(), type: 'expense', desc: 'Printing & Stationery', amount: 290, category: 'education', date: `${y}-${m}-11`, note: '' },
    { id: uid(), type: 'expense', desc: 'Cinema Ticket', amount: 380, category: 'entertainment', date: `${y}-${m}-12`, note: '' },
    { id: uid(), type: 'expense', desc: 'Online Course – AWS', amount: 1499, category: 'education', date: `${y}-${m}-13`, note: '' },
    { id: uid(), type: 'expense', desc: 'Groceries', amount: 1122, category: 'food', date: `${y}-${m}-15`, note: '' },
    { id: uid(), type: 'income', desc: 'Scholarship Disbursement', amount: 8000, category: 'other', date: `${y}-${m}-01`, note: '' },
    { id: uid(), type: 'income', desc: 'Part-time Job Salary', amount: 6000, category: 'other', date: `${y}-${m}-05`, note: '' },
    { id: uid(), type: 'income', desc: 'Parental Transfer', amount: 3500, category: 'other', date: `${y}-${m}-03`, note: '' },
  ];

  store.savingsGoals = [
    { id: uid(), name: 'New Laptop', icon: '💻', desc: 'MacBook Air M3 for coding', target: 90000, saved: 42000, deadline: '2027-05-01', color: 'purple' },
    { id: uid(), name: 'Study Trip – Goa', icon: '🌴', desc: 'End-of-year trip with friends', target: 15000, saved: 8500, deadline: '2027-01-15', color: 'blue' },
    { id: uid(), name: 'Emergency Fund', icon: '🛡️', desc: '3 months of expenses', target: 25000, saved: 9900, deadline: '2027-06-01', color: 'green' },
    { id: uid(), name: 'Internship Prep', icon: '💼', desc: 'Interview clothes & prep courses', target: 12000, saved: 4200, deadline: '2026-12-31', color: 'amber' },
  ];

  store.budgetCategories = [
    { id: uid(), name: 'Food', icon: '🍕', category: 'food', budget: 3000, spent: 1592, color: '#fb923c' },
    { id: uid(), name: 'Transport', icon: '🚌', category: 'transport', budget: 1500, spent: 900, color: '#60a5fa' },
    { id: uid(), name: 'Education', icon: '📚', category: 'education', budget: 3500, spent: 2679, color: '#a78bfa' },
    { id: uid(), name: 'Entertainment', icon: '🎮', category: 'entertainment', budget: 1000, spent: 579, color: '#f472b6' },
    { id: uid(), name: 'Health', icon: '💊', category: 'health', budget: 800, spent: 180, color: '#34d399' },
    { id: uid(), name: 'Shopping', icon: '🛍️', category: 'shopping', budget: 2500, spent: 2100, color: '#fbbf24' },
    { id: uid(), name: 'Utilities', icon: '⚡', category: 'utilities', budget: 1200, spent: 650, color: '#818cf8' },
  ];

  store.incomeSources = [
    { id: uid(), name: 'Scholarship', icon: '🎓', amount: 8000, frequency: 'Monthly', color: '#34d399' },
    { id: uid(), name: 'Part-time Job', icon: '💼', amount: 6000, frequency: 'Monthly', color: '#a78bfa' },
    { id: uid(), name: 'Parental Support', icon: '🏠', amount: 3500, frequency: 'Monthly', color: '#60a5fa' },
    { id: uid(), name: 'Freelance Projects', icon: '🖥️', amount: 0, frequency: 'Occasional', color: '#fbbf24' },
  ];

  saveStore();
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

const catEmojis = {
  food: '🍕', transport: '🚌', education: '📚', entertainment: '🎮',
  health: '💊', shopping: '🛍️', utilities: '⚡', other: '📦'
};
const catColors = {
  food: '#fb923c', transport: '#60a5fa', education: '#a78bfa', entertainment: '#f472b6',
  health: '#34d399', shopping: '#fbbf24', utilities: '#818cf8', other: '#94a3b8'
};

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}
function navigateTo(page) {
  store.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  const nav = document.getElementById(`nav-${page}`);
  if (nav) nav.classList.add('active');

  const titles = {
    dashboard: ['Dashboard', 'Welcome back, Sarah! 👋'],
    budget: ['Budget Planner', 'Manage your monthly budget 💰'],
    expenses: ['Expenses', 'Track every rupee you spend 💳'],
    income: ['Income', 'All your money coming in 📥'],
    savings: ['Savings Goals', 'Dream it. Save for it. Achieve it 🎯'],
    reports: ['Reports & Analytics', 'Your financial story in numbers 📈'],
    profile: ['Profile & Settings', 'Customize your experience ⚙️'],
  };
  const [title, sub] = titles[page] || ['Page', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = sub;

  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard':  renderDashboard(); break;
    case 'budget':     renderBudget(); break;
    case 'expenses':   renderExpenses(); break;
    case 'income':     renderIncome(); break;
    case 'savings':    renderSavings(); break;
    case 'reports':    renderReports(); break;
    default: break;
  }
}

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function updateMonthDisplay() {
  const d = new Date();
  d.setMonth(d.getMonth() + store.monthOffset);
  document.getElementById('currentMonth').textContent = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function createSparkline(id, data, color) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  charts[id] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{ data, borderColor: color, borderWidth: 2, fill: true,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 50);
          g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00'); return g;
        }, pointRadius: 0, tension: 0.4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}
function renderDashboard() {
  createSparkline('sparkBalance',  [18000,19500,21000,20000,22000,23500,24580], '#a78bfa');
  createSparkline('sparkExpense',  [5000,6200,7100,6800,7900,8200,8680],  '#f87171');
  createSparkline('sparkSavings',  [6000,6800,7200,7900,8500,9200,9900],  '#34d399');

  renderSpendingTrend('weekly');
  renderExpenseDonut();
  renderRecentTransactions();
}

function renderSpendingTrend(mode) {
  let labels, data;
  if (mode === 'weekly') {
    labels = ['Week 1','Week 2','Week 3','Week 4'];
    data   = [2100, 2850, 2200, 1530];
  } else {
    labels = ['Jun','Jul','Aug','Sep','Oct','Nov'];
    data   = [7200, 8100, 6800, 9200, 7600, 8680];
  }

  const canvas = document.getElementById('spendingTrendChart');
  destroyChart('spendingTrendChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(124,58,237,0.4)');
  grad.addColorStop(1, 'rgba(124,58,237,0.0)');

  charts['spendingTrendChart'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Spending (₹)', data,
        borderColor: '#7c3aed', borderWidth: 2.5, fill: true,
        backgroundColor: grad, pointBackgroundColor: '#7c3aed',
        pointRadius: 5, pointHoverRadius: 8, tension: 0.4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.parsed.y) },
          backgroundColor: '#1a1e35', borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#a78bfa', padding: 10 } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099', callback: v => '₹' + (v/1000).toFixed(0) + 'k' } }
      }
    }
  });
}

function renderExpenseDonut() {
  const cats = ['food','transport','education','entertainment','health','shopping','utilities'];
  const labels = cats.map(c => catEmojis[c] + ' ' + c.charAt(0).toUpperCase() + c.slice(1));
  const colors = cats.map(c => catColors[c]);
  const expenses = store.transactions.filter(t => t.type === 'expense');
  const data = cats.map(c => expenses.filter(t => t.category === c).reduce((s, t) => s + t.amount, 0));

  makeChart('expenseDonutChart', {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 2, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.parsed) },
          backgroundColor: '#1a1e35', borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#e8eaf0', padding: 10 }
      }
    }
  });

  const legend = document.getElementById('donutLegend');
  if (!legend) return;
  legend.innerHTML = cats.map((c, i) =>
    `<div class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      ${labels[i]}
    </div>`
  ).join('');
}

function renderRecentTransactions() {
  const container = document.getElementById('recentTransactions');
  if (!container) return;
  const recent = [...store.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  container.innerHTML = recent.length ? recent.map(buildTxHTML).join('') : '<p style="color:var(--text-muted);padding:1rem;">No transactions yet.</p>';
}

function buildTxHTML(tx) {
  return `<div class="tx-item">
    <div class="tx-cat-icon cat-${tx.category}">${catEmojis[tx.category] || '📦'}</div>
    <div class="tx-info">
      <div class="tx-desc">${tx.desc}</div>
      <div class="tx-date">${fmtDate(tx.date)} · <span class="tx-cat-badge cat-${tx.category}">${tx.category}</span></div>
    </div>
    <div class="tx-amount ${tx.type}">${tx.type === 'expense' ? '−' : '+'}${fmt(tx.amount)}</div>
    <button class="tx-delete" onclick="deleteTransaction('${tx.id}')" title="Delete">✕</button>
  </div>`;
}

function deleteTransaction(id) {
  store.transactions = store.transactions.filter(t => t.id !== id);
  saveStore();
  renderPage(store.currentPage);
  showToast('Transaction deleted', 'info');
}

function renderBudget() {
  const total = store.budgetCategories.reduce((s, c) => s + c.budget, 0);
  const spent  = store.budgetCategories.reduce((s, c) => s + c.spent, 0);
  const pct    = total > 0 ? Math.round((spent / total) * 100) : 0;

  document.getElementById('bStatTotal').textContent = fmt(total);
  document.getElementById('bStatSpent').textContent = fmt(spent);
  document.getElementById('bStatRemaining').textContent = fmt(total - spent);
  document.getElementById('budgetPct').textContent = pct + '%';

  makeChart('budgetGaugeChart', {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : '#a78bfa', 'rgba(255,255,255,0.06)'],
        borderWidth: 0, hoverOffset: 0
      }]
    },
    options: { cutout: '75%', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 1000, easing: 'easeInOutQuart' } }
  });

  const grid = document.getElementById('budgetCatsGrid');
  if (!grid) return;
  grid.innerHTML = store.budgetCategories.map(cat => {
    const p = cat.budget > 0 ? Math.min(100, Math.round((cat.spent / cat.budget) * 100)) : 0;
    const barColor = p > 90 ? 'linear-gradient(90deg,#dc2626,#f43f5e)' : p > 70 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : `linear-gradient(90deg, ${cat.color}cc, ${cat.color})`;
    return `<div class="budget-cat-card">
      <div class="bcat-top">
        <div class="bcat-left">
          <span class="bcat-icon">${cat.icon}</span>
          <span class="bcat-name">${cat.name}</span>
        </div>
        <span class="bcat-pct">${p}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p}%;background:${barColor}"></div></div>
      <div class="bcat-amounts"><span>Spent: ${fmt(cat.spent)}</span><span>Budget: ${fmt(cat.budget)}</span></div>
    </div>`;
  }).join('');
}
function renderExpenses(filter = 'all', sort = 'date-desc', search = '') {
  const tbody = document.getElementById('expensesTableBody');
  if (!tbody) return;
  let data = store.transactions.filter(t => t.type === 'expense');
  if (filter !== 'all') data = data.filter(t => t.category === filter);
  if (search) data = data.filter(t => t.desc.toLowerCase().includes(search.toLowerCase()));
  data.sort((a, b) => {
    if (sort === 'date-desc') return b.date.localeCompare(a.date);
    if (sort === 'date-asc')  return a.date.localeCompare(b.date);
    if (sort === 'amt-desc')  return b.amount - a.amount;
    if (sort === 'amt-asc')   return a.amount - b.amount;
    return 0;
  });

  tbody.innerHTML = data.length ? data.map(tx =>
    `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td><strong>${tx.desc}</strong>${tx.note ? `<br><small style="color:var(--text-muted)">${tx.note}</small>` : ''}</td>
      <td><span class="tx-cat-badge cat-${tx.category}">${catEmojis[tx.category]} ${tx.category}</span></td>
      <td style="color:var(--red-light);font-weight:700">${fmt(tx.amount)}</td>
      <td><button class="tx-delete" onclick="deleteTransaction('${tx.id}')">✕ Delete</button></td>
    </tr>`
  ).join('') : `<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:2rem">No expenses found.</td></tr>`;
}
function renderIncome() {
  const list = document.getElementById('incomeSourcesList');
  if (!list) return;
  list.innerHTML = store.incomeSources.map(s =>
    `<div class="income-source-item">
      <span class="income-source-icon">${s.icon}</span>
      <div class="income-source-info">
        <div class="income-source-name">${s.name}</div>
        <div class="income-source-freq">${s.frequency}</div>
      </div>
      <span class="income-source-amount">${s.amount > 0 ? fmt(s.amount) : '–'}</span>
    </div>`
  ).join('');

  const labels = ['Jun','Jul','Aug','Sep','Oct','Nov'];
  makeChart('incomeExpenseChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: [15000,16000,15500,17000,16800,17500], backgroundColor: 'rgba(52,211,153,0.7)', borderColor: '#34d399', borderWidth: 1, borderRadius: 6 },
        { label: 'Expenses', data: [7200,8100,6800,9200,7600,8680], backgroundColor: 'rgba(248,113,113,0.7)', borderColor: '#f87171', borderWidth: 1, borderRadius: 6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#7a8099', font: { family: 'Outfit' } } },
        tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.parsed.y) },
          backgroundColor: '#1a1e35', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
          titleColor: '#e8eaf0', bodyColor: '#e8eaf0', padding: 10 } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099', callback: v => '₹' + (v/1000).toFixed(0) + 'k' } }
      }
    }
  });
}
function renderSavings() {
  const grid = document.getElementById('savingsGoalsGrid');
  if (!grid) return;
  grid.innerHTML = store.savingsGoals.map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
    const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 86400000));
    return `<div class="goal-card glow-${g.color}">
      <div class="goal-header">
        <span class="goal-icon">${g.icon}</span>
        <span class="goal-pct-badge">${pct}%</span>
      </div>
      <div class="goal-name">${g.name}</div>
      <div class="goal-desc">${g.desc}</div>
      <div class="goal-amounts">
        <span>Saved: <strong>${fmt(g.saved)}</strong></span>
        <span>Target: <strong>${fmt(g.target)}</strong></span>
      </div>
      <div class="progress-bar" style="height:10px">
        <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,#7c3aed,#4f46e5)"></div>
      </div>
      <div class="goal-deadline">📅 ${daysLeft} days left · Due ${fmtDate(g.deadline)}</div>
      <button class="goal-add-btn" onclick="addToGoal('${g.id}')">+ Add Savings</button>
    </div>`;
  }).join('');

  if (!store.savingsGoals.length) {
    grid.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:3rem;grid-column:span 3">
      No savings goals yet. Click <strong>+ Add Goal</strong> to get started!
    </div>`;
  }
}

function addToGoal(id) {
  const amt = parseFloat(prompt('Amount to add (₹):'));
  if (!amt || isNaN(amt) || amt <= 0) return;
  const g = store.savingsGoals.find(g => g.id === id);
  if (!g) return;
  g.saved = Math.min(g.target, g.saved + amt);
  saveStore();
  renderSavings();
  showToast(`₹${amt.toLocaleString('en-IN')} added to "${g.name}"! 🎉`, 'success');
}
function renderReports() {
  // Yearly Overview
  makeChart('yearlyChart', {
    type: 'line',
    data: {
      labels: monthNames.slice(0, 11),
      datasets: [
        { label: 'Income', data: [14000,14500,15200,16000,15800,16500,15000,17000,16800,16200,17500,0], borderColor: '#34d399', fill: false, tension: 0.4, pointRadius: 4 },
        { label: 'Expenses', data: [6800,7200,7900,8100,7500,8400,6900,9200,7600,8000,8680,0], borderColor: '#f87171', fill: false, tension: 0.4, pointRadius: 4 },
        { label: 'Savings', data: [7200,7300,7300,7900,8300,8100,8100,7800,9200,8200,8820,0], borderColor: '#a78bfa', fill: false, tension: 0.4, borderDash: [5,3], pointRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#7a8099', font: { family: 'Outfit' } } }, tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.parsed.y) }, backgroundColor: '#1a1e35', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#e8eaf0', padding: 10 } },
      scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099', callback: v => '₹' + (v/1000).toFixed(0) + 'k' } } }
    }
  });

  // Savings Progress
  makeChart('savingsProgressChart', {
    type: 'bar',
    data: {
      labels: store.savingsGoals.map(g => g.name),
      datasets: [
        { label: 'Saved', data: store.savingsGoals.map(g => g.saved), backgroundColor: 'rgba(167,139,250,0.7)', borderRadius: 6 },
        { label: 'Target', data: store.savingsGoals.map(g => g.target), backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#7a8099', font: { family: 'Outfit' } } }, tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.parsed.y) }, backgroundColor: '#1a1e35', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#e8eaf0', padding: 10 } },
      scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099', callback: v => '₹' + (v/1000).toFixed(0) + 'k' } } }
    }
  });

  // Top Categories
  const cats = ['food','transport','education','entertainment','health','shopping','utilities'];
  const expenses = store.transactions.filter(t => t.type === 'expense');
  const catData = cats.map(c => expenses.filter(t => t.category === c).reduce((s, t) => s + t.amount, 0));
  makeChart('topCatsChart', {
    type: 'bar', indexAxis: 'y',
    data: {
      labels: cats.map(c => catEmojis[c] + ' ' + c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [{ data: catData, backgroundColor: cats.map(c => catColors[c] + 'bb'), borderColor: cats.map(c => catColors[c]), borderWidth: 1, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.parsed.x) }, backgroundColor: '#1a1e35', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#e8eaf0', padding: 10 } },
      scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a8099', callback: v => '₹' + (v/1000).toFixed(0) + 'k' } }, y: { grid: { display: false }, ticks: { color: '#7a8099' } } }
    }
  });

  // Report Stats
  const totalIncome  = store.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = store.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSaved   = store.savingsGoals.reduce((s, g) => s + g.saved, 0);
  const avgDaily     = totalExpense > 0 ? Math.round(totalExpense / 30) : 0;
  const stats = [
    { label: 'Total Income', value: fmt(totalIncome), cls: 'green' },
    { label: 'Total Expenses', value: fmt(totalExpense), cls: 'red' },
    { label: 'Net Savings', value: fmt(totalIncome - totalExpense), cls: 'purple' },
    { label: 'Total in Goals', value: fmt(totalSaved), cls: 'blue' },
    { label: 'Avg Daily Spend', value: fmt(avgDaily), cls: 'red' },
    { label: 'Budget Efficiency', value: `${Math.round(((17500 - 8680) / 17500) * 100)}%`, cls: 'green' },
  ];
  const rs = document.getElementById('reportStats');
  if (rs) rs.innerHTML = stats.map(s => `<div class="report-stat"><span class="report-stat-label">${s.label}</span><span class="report-stat-value ${s.cls}">${s.value}</span></div>`).join('');
}

function openModal() {
  document.getElementById('transactionModal').classList.add('open');
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
}
function closeModal() {
  document.getElementById('transactionModal').classList.remove('open');
}
function saveTransaction() {
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const date   = document.getElementById('txDate').value;
  const cat    = document.getElementById('txCategory').value;
  const note   = document.getElementById('txNote').value.trim();

  if (!desc)         return showToast('Please enter a description', 'error');
  if (!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');
  if (!date)         return showToast('Please select a date', 'error');

  store.transactions.unshift({ id: uid(), type: store.txType, desc, amount, category: cat, date, note });
  saveStore();
  closeModal();
  document.getElementById('txDesc').value = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value = '';
  showToast(`${store.txType === 'expense' ? '💳 Expense' : '📥 Income'} added successfully!`, 'success');
  renderPage(store.currentPage);
}
function promptAddGoal() {
  const name   = prompt('Goal name (e.g. New Laptop):');
  if (!name) return;
  const target = parseFloat(prompt('Target amount (₹):'));
  if (!target || target <= 0) return;
  const icons = ['🎯','💻','📱','✈️','🚗','🏠','🎓','💍','🏖️','🎮'];
  const icon = icons[Math.floor(Math.random() * icons.length)];
  const colors = ['purple','blue','green','amber'];
  const color = colors[store.savingsGoals.length % colors.length];

  const deadline = prompt('Deadline (YYYY-MM-DD):', new Date(Date.now() + 180*86400000).toISOString().split('T')[0]);
  store.savingsGoals.push({ id: uid(), name, icon, desc: '', target, saved: 0, deadline: deadline || new Date(Date.now() + 180*86400000).toISOString().split('T')[0], color });
  saveStore();
  renderSavings();
  showToast(`Goal "${name}" created! 🎯`, 'success');
}
document.addEventListener('DOMContentLoaded', () => {
  seedData();
  updateMonthDisplay();
  navigateTo('dashboard');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
  });
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
  });

  document.getElementById('prevMonth').addEventListener('click', () => { store.monthOffset--; updateMonthDisplay(); });
  document.getElementById('nextMonth').addEventListener('click', () => { store.monthOffset++; updateMonthDisplay(); });
  document.getElementById('addTransactionBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('saveTxBtn').addEventListener('click', saveTransaction);
  document.getElementById('transactionModal').addEventListener('click', e => { if (e.target.id === 'transactionModal') closeModal(); });
  document.querySelectorAll('.form-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.form-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      store.txType = tab.dataset.type;
      document.getElementById('txCategory').innerHTML = store.txType === 'expense'
        ? `<option value="food">🍕 Food</option><option value="transport">🚌 Transport</option><option value="education">📚 Education</option><option value="entertainment">🎮 Entertainment</option><option value="health">💊 Health</option><option value="shopping">🛍️ Shopping</option><option value="utilities">⚡ Utilities</option><option value="other">📦 Other</option>`
        : `<option value="other">💰 Scholarship</option><option value="other">💼 Part-time Job</option><option value="other">🏠 Parental Support</option><option value="other">🖥️ Freelance</option><option value="other">📦 Other</option>`;
    });
  });
  document.querySelectorAll('.chart-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSpendingTrend(tab.dataset.chart);
    });
  });

  document.getElementById('expenseSearch')?.addEventListener('input', e => {
    renderExpenses(document.getElementById('expenseCatFilter').value, document.getElementById('expenseSortFilter').value, e.target.value);
  });
  document.getElementById('expenseCatFilter')?.addEventListener('change', e => {
    renderExpenses(e.target.value, document.getElementById('expenseSortFilter').value, document.getElementById('expenseSearch').value);
  });
  document.getElementById('expenseSortFilter')?.addEventListener('change', e => {
    renderExpenses(document.getElementById('expenseCatFilter').value, e.target.value, document.getElementById('expenseSearch').value);
  });

  // View all transactions button
  document.getElementById('viewAllTransactions')?.addEventListener('click', () => navigateTo('expenses'));

  // Add Goal button
  document.getElementById('addGoalBtn')?.addEventListener('click', promptAddGoal);

  // Save Profile button
  document.getElementById('saveProfileBtn')?.addEventListener('click', () => showToast('Profile saved successfully! ✅', 'success'));

  // Add Income button
  document.getElementById('addIncomeBtn')?.addEventListener('click', () => {
    const name = prompt('Income source name:');
    if (!name) return;
    const amount = parseFloat(prompt('Monthly amount (₹):') || '0');
    const freq = prompt('Frequency (e.g. Monthly, Weekly, Occasional):') || 'Monthly';
    const icons = ['💼','🎓','🏠','🖥️','📱','🎨'];
    store.incomeSources.push({ id: uid(), name, icon: icons[Math.floor(Math.random()*icons.length)], amount, frequency: freq, color: '#a78bfa' });
    saveStore();
    renderIncome();
    showToast(`Income source "${name}" added! 📥`, 'success');
  });

  // Add Category button (Budget)
  document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
    const name = prompt('Category name:');
    if (!name) return;
    const budget = parseFloat(prompt('Monthly budget (₹):'));
    if (!budget || budget <= 0) return;
    const icns = { food:'🍕', transport:'🚌', education:'📚', entertainment:'🎮', health:'💊', shopping:'🛍️', utilities:'⚡', other:'📦' };
    const cat = (prompt('Category key (food/transport/education/entertainment/health/shopping/utilities/other):') || 'other').trim();
    store.budgetCategories.push({ id: uid(), name, icon: icns[cat] || '📦', category: cat, budget, spent: 0, color: catColors[cat] || '#94a3b8' });
    saveStore();
    renderBudget();
    showToast(`Category "${name}" added! 💰`, 'success');
  });

  // Keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'n' && !e.target.matches('input,textarea,select')) openModal();
  });
});
