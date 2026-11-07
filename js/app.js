// ===================================================
// SmartFinance – Student Money Manager | app.js
// ===================================================

// ─── DATA STORE ───────────────────────────────────
const store = {
  transactions: [],
  savingsGoals: [],
  budgetCategories: [],
  incomeSources: [],
  currentPage: 'dashboard',
  txType: 'expense',
  monthOffset: 0,
};

const API_URL = '/api';
let backendConnected = false;
let backendSaveQueue = Promise.resolve();
let currentUser = null;

// ─── CHART REGISTRY (prevents grow-on-re-render bug) ──
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

function cacheStore() {
  if (!currentUser) return;
  localStorage.setItem(`sf_${currentUser.id}_transactions`, JSON.stringify(store.transactions));
  localStorage.setItem(`sf_${currentUser.id}_goals`, JSON.stringify(store.savingsGoals));
  localStorage.setItem(`sf_${currentUser.id}_budget_cats`, JSON.stringify(store.budgetCategories));
  localStorage.setItem(`sf_${currentUser.id}_income_sources`, JSON.stringify(store.incomeSources));
}

function restoreLocalStore() {
  const load = (key) => {
    try {
      const value = localStorage.getItem(`sf_${currentUser.id}_${key}`);
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error(`Could not restore ${key} from browser storage:`, error);
      showToast('Some locally saved data could not be read.', 'error');
      return [];
    }
  };
  store.transactions = load('transactions');
  store.savingsGoals = load('goals');
  store.budgetCategories = load('budget_cats');
  store.incomeSources = load('income_sources');
}

function saveStore() {
  cacheStore();
  if (!backendConnected) return Promise.resolve();

  const snapshot = {
    transactions: store.transactions,
    savingsGoals: store.savingsGoals,
    budgetCategories: store.budgetCategories,
    incomeSources: store.incomeSources,
  };

  backendSaveQueue = backendSaveQueue.then(async () => {
    const response = await fetch(`${API_URL}/store`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Could not save data to the database');
    }
  }).catch(error => {
    backendConnected = false;
    console.error('Backend save failed:', error);
    showToast('Could not save to the server. Your changes remain in this browser.', 'error');
  });

  return backendSaveQueue;
}

function recordSignature(item) {
  return JSON.stringify(
    Object.keys(item)
      .filter(key => key !== 'id')
      .sort()
      .map(key => [key, item[key]])
  );
}

function mergeLocalRecords(serverRecords, localRecords) {
  const merged = new Map(serverRecords.map(item => [item.id, item]));
  const serverSignatures = new Set(serverRecords.map(recordSignature));

  localRecords.forEach(item => {
    if (merged.has(item.id)) {
      merged.set(item.id, item);
    } else if (!serverSignatures.has(recordSignature(item))) {
      merged.set(item.id, item);
    }
  });

  return [...merged.values()];
}

async function initializeStore() {
  try {
    const response = await fetch(`${API_URL}/store`);
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const remote = await response.json();
    const remoteHasData = [
      remote.transactions,
      remote.savingsGoals,
      remote.budgetCategories,
      remote.incomeSources,
    ].some(items => Array.isArray(items) && items.length > 0);

    backendConnected = true;
    if (remoteHasData) {
      const local = {
        transactions: store.transactions,
        savingsGoals: store.savingsGoals,
        budgetCategories: store.budgetCategories,
        incomeSources: store.incomeSources,
      };
      const localHasData = Object.values(local).some(items => items.length > 0);
      store.transactions = mergeLocalRecords(remote.transactions || [], local.transactions);
      store.savingsGoals = mergeLocalRecords(remote.savingsGoals || [], local.savingsGoals).map(goal => ({
        ...goal,
        desc: goal.desc ?? goal.description ?? '',
      }));
      store.budgetCategories = mergeLocalRecords(remote.budgetCategories || [], local.budgetCategories);
      store.incomeSources = mergeLocalRecords(remote.incomeSources || [], local.incomeSources);
      cacheStore();
      if (localHasData) await saveStore();
      return;
    }

    const localHasData = [
      store.transactions,
      store.savingsGoals,
      store.budgetCategories,
      store.incomeSources,
    ].some(items => items.length > 0);

    if (localHasData) {
      await saveStore();
      return;
    }

  } catch (error) {
    backendConnected = false;
    console.error('Backend connection failed:', error);
    showToast('Backend unavailable. Using browser storage; start the server to sync.', 'error');
  }
}

// ─── UTILITIES ─────────────────────────────────────
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

function updateProfileDisplay(user) {
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  document.getElementById('profileName').value = user.name;
  document.getElementById('profileEmail').value = user.email;
  document.getElementById('profileDegree').value = user.degree || '';
  document.getElementById('profileCollege').value = user.college || '';
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarStudentName').textContent = user.name;
  document.getElementById('sidebarStudentEmail').textContent = user.email;
}

function setAuthMode(mode) {
  const registering = mode === 'signup';
  document.getElementById('authNameField').hidden = !registering;
  document.getElementById('authName').required = registering;
  document.getElementById('authPassword').autocomplete = registering ? 'new-password' : 'current-password';
  document.getElementById('authTitle').textContent = registering ? 'Create your account' : 'Welcome back';
  document.getElementById('authDescription').textContent = registering
    ? 'Create an account to start managing your finances.'
    : 'Sign in to manage your finances.';
  document.getElementById('authSubmit').textContent = registering ? 'Create account' : 'Log in';
  document.getElementById('authSwitchText').textContent = registering ? 'Already have an account?' : 'New to SmartFinance?';
  document.getElementById('authSwitch').textContent = registering ? 'Log in' : 'Create an account';
  document.getElementById('authMessage').textContent = '';
  document.getElementById('authMessage').classList.remove('error');
  document.getElementById('authForm').dataset.mode = mode;
}

async function activateAccount(user) {
  currentUser = user;
  document.body.classList.add('authenticated');
  restoreLocalStore();
  updateProfileDisplay(user);
  await initializeStore();
  updateMonthDisplay();
  navigateTo('dashboard');
}

async function logout() {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    if (!response.ok) throw new Error(`Logout failed with status ${response.status}`);
    currentUser = null;
    backendConnected = false;
    store.transactions = [];
    store.savingsGoals = [];
    store.budgetCategories = [];
    store.incomeSources = [];
    document.body.classList.remove('authenticated');
    document.getElementById('authForm').reset();
    setAuthMode('login');
    document.getElementById('authEmail').focus();
  } catch (error) {
    console.error('Logout failed:', error);
    showToast('Could not log out. Please try again.', 'error');
  }
}

async function saveProfile() {
  const profile = {
    name: document.getElementById('profileName').value.trim(),
    degree: document.getElementById('profileDegree').value.trim(),
    college: document.getElementById('profileCollege').value.trim(),
  };
  if (!profile.name) return showToast('Please enter your name.', 'error');

  try {
    const response = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save your profile');
    currentUser = result.user;
    updateProfileDisplay(currentUser);
    showToast('Profile saved successfully!', 'success');
  } catch (error) {
    console.error('Profile save failed:', error);
    showToast(error.message || 'Could not save your profile.', 'error');
  }
}

// ─── NAVIGATION ────────────────────────────────────
function navigateTo(page) {
  store.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  const nav = document.getElementById(`nav-${page}`);
  if (nav) nav.classList.add('active');

  const titles = {
    dashboard: ['Dashboard', `Welcome back, ${currentUser?.name || 'there'}! 👋`],
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

// ─── MONTH SELECTOR ────────────────────────────────
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function getMonthlyTransactionTotals(count = 6) {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
  const labels = [];
  const income = Array(count).fill(0);
  const expenses = Array(count).fill(0);

  for (let index = 0; index < count; index++) {
    const month = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    labels.push(month.toLocaleDateString('en-IN', { month: 'short' }));
  }

  store.transactions.forEach(item => {
    const date = new Date(`${item.date}T00:00:00`);
    const monthIndex = (date.getFullYear() - firstMonth.getFullYear()) * 12 + date.getMonth() - firstMonth.getMonth();
    if (Number.isNaN(date.getTime()) || monthIndex < 0 || monthIndex >= count) return;
    const totals = item.type === 'income' ? income : expenses;
    totals[monthIndex] += Number(item.amount);
  });

  return { labels, income, expenses };
}

function updateMonthDisplay() {
  const d = new Date();
  d.setMonth(d.getMonth() + store.monthOffset);
  document.getElementById('currentMonth').textContent = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── SPARKLINE CHART ────────────────────────────────
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

// ─── DASHBOARD ─────────────────────────────────────
function renderDashboard() {
  const expenses = store.transactions.filter(item => item.type === 'expense');
  const income = store.transactions.filter(item => item.type === 'income');
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalSavings = store.savingsGoals.reduce((sum, goal) => sum + Number(goal.saved), 0);
  const totalBudget = store.budgetCategories.reduce((sum, category) => sum + Number(category.budget), 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  document.getElementById('balanceValue').textContent = fmt(totalIncome - totalSpent);
  document.getElementById('balanceSummary').textContent = `${fmt(totalIncome)} income · ${fmt(totalSpent)} spent`;
  document.getElementById('budgetValue').textContent = fmt(totalBudget);
  document.getElementById('budgetRemaining').textContent = `${fmt(remainingBudget)} remaining`;
  document.getElementById('spentValue').textContent = fmt(totalSpent);
  document.getElementById('spentSummary').textContent = totalBudget > 0
    ? `${budgetUsed}% of budget used`
    : 'Set a budget to track spending';
  document.getElementById('budgetProgress').style.width = `${Math.min(100, Math.max(0, budgetUsed))}%`;
  document.getElementById('savingsValue').textContent = fmt(totalSavings);
  document.getElementById('savingsSummary').textContent = `${store.savingsGoals.length} savings goals`;

  const sortedTransactions = [...store.transactions].sort((a, b) => a.date.localeCompare(b.date));
  const balanceHistory = [0];
  sortedTransactions.forEach(item => {
    const change = Number(item.amount) * (item.type === 'income' ? 1 : -1);
    balanceHistory.push(balanceHistory[balanceHistory.length - 1] + change);
  });
  createSparkline('sparkBalance', balanceHistory.slice(-7), '#a78bfa');
  createSparkline('sparkExpense', expenses.slice(-7).map(item => Number(item.amount)), '#f87171');
  createSparkline('sparkSavings', store.savingsGoals.map(goal => Number(goal.saved)), '#34d399');

  renderSpendingTrend('weekly');
  renderExpenseDonut();
  renderRecentTransactions();
}

function renderSpendingTrend(mode) {
  let labels;
  let data;
  if (mode === 'weekly') {
    labels = ['Week 1','Week 2','Week 3','Week 4'];
    data = [0, 0, 0, 0];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 27);
    store.transactions.filter(item => item.type === 'expense').forEach(item => {
      const date = new Date(`${item.date}T00:00:00`);
      const dayOffset = Math.floor((date - start) / 86400000);
      if (!Number.isNaN(date.getTime()) && dayOffset >= 0 && dayOffset < 28) {
        data[Math.min(3, Math.floor(dayOffset / 7))] += Number(item.amount);
      }
    });
  } else {
    const monthly = getMonthlyTransactionTotals();
    labels = monthly.labels;
    data = monthly.expenses;
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

// ─── BUDGET ────────────────────────────────────────
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

// ─── EXPENSES ──────────────────────────────────────
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

// ─── INCOME ────────────────────────────────────────
function renderIncome() {
  const recordedIncome = store.transactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const recordedExpenses = store.transactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const monthlyExpected = store.incomeSources
    .filter(source => String(source.frequency || '').toLowerCase() === 'monthly')
    .reduce((sum, source) => sum + Number(source.amount), 0);
  document.getElementById('incomeTotalValue').textContent = fmt(recordedIncome);
  document.getElementById('incomeSourceCount').textContent = String(store.incomeSources.length);
  document.getElementById('monthlyIncomeValue').textContent = fmt(monthlyExpected);
  document.getElementById('incomePageExpenseValue').textContent = fmt(recordedExpenses);

  const list = document.getElementById('incomeSourcesList');
  if (!list) return;
  list.innerHTML = store.incomeSources.length ? store.incomeSources.map(s =>
    `<div class="income-source-item">
      <span class="income-source-icon">${s.icon}</span>
      <div class="income-source-info">
        <div class="income-source-name">${s.name}</div>
        <div class="income-source-freq">${s.frequency}</div>
      </div>
      <span class="income-source-amount">${s.amount > 0 ? fmt(s.amount) : '–'}</span>
    </div>`
  ).join('') : '<p class="empty-state">No income sources yet. Add one to get started.</p>';

  const monthly = getMonthlyTransactionTotals();
  makeChart('incomeExpenseChart', {
    type: 'bar',
    data: {
      labels: monthly.labels,
      datasets: [
        { label: 'Income', data: monthly.income, backgroundColor: 'rgba(52,211,153,0.7)', borderColor: '#34d399', borderWidth: 1, borderRadius: 6 },
        { label: 'Expenses', data: monthly.expenses, backgroundColor: 'rgba(248,113,113,0.7)', borderColor: '#f87171', borderWidth: 1, borderRadius: 6 },
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

// ─── SAVINGS GOALS ─────────────────────────────────
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

// ─── REPORTS ───────────────────────────────────────
function renderReports() {
  const yearly = getMonthlyTransactionTotals(12);
  const totalExpenses = yearly.expenses.reduce((sum, amount) => sum + amount, 0);
  const totalBudget = store.budgetCategories.reduce((sum, category) => sum + Number(category.budget), 0);

  makeChart('yearlyChart', {
    type: 'line',
    data: {
      labels: yearly.labels,
      datasets: [
        { label: 'Income', data: yearly.income, borderColor: '#34d399', fill: false, tension: 0.4, pointRadius: 4 },
        { label: 'Expenses', data: yearly.expenses, borderColor: '#f87171', fill: false, tension: 0.4, pointRadius: 4 },
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
    { label: 'Budget Efficiency', value: totalBudget > 0 ? `${Math.round(((totalBudget - totalExpenses) / totalBudget) * 100)}%` : 'Not set', cls: 'green' },
  ];
  const rs = document.getElementById('reportStats');
  if (rs) rs.innerHTML = stats.map(s => `<div class="report-stat"><span class="report-stat-label">${s.label}</span><span class="report-stat-value ${s.cls}">${s.value}</span></div>`).join('');
}

// ─── MODAL ─────────────────────────────────────────
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

// ─── ADD SAVINGS GOAL ──────────────────────────────
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

// ─── EVENT LISTENERS ───────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setAuthMode('login');
  document.getElementById('authSwitch').addEventListener('click', () => {
    const nextMode = document.getElementById('authForm').dataset.mode === 'login' ? 'signup' : 'login';
    setAuthMode(nextMode);
  });
  document.getElementById('authForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const registering = form.dataset.mode === 'signup';
    const message = document.getElementById('authMessage');
    const submit = document.getElementById('authSubmit');
    const payload = {
      email: document.getElementById('authEmail').value.trim(),
      password: document.getElementById('authPassword').value,
    };
    if (registering) payload.name = document.getElementById('authName').value.trim();
    message.textContent = '';
    message.classList.remove('error');
    submit.disabled = true;

    try {
      const response = await fetch(`${API_URL}/auth/${registering ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Authentication failed');
      form.reset();
      await activateAccount(result.user);
    } catch (error) {
      console.error('Authentication failed:', error);
      message.textContent = error.message || 'Could not connect to the server.';
      message.classList.add('error');
    } finally {
      submit.disabled = false;
    }
  });

  try {
    const response = await fetch(`${API_URL}/auth/me`);
    if (response.ok) {
      const result = await response.json();
      await activateAccount(result.user);
    } else if (response.status !== 401) {
      throw new Error(`Authentication check failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Could not check the current session:', error);
    const message = document.getElementById('authMessage');
    message.textContent = 'Could not connect to the server. Please start the backend and try again.';
    message.classList.add('error');
  }

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
  });

  // Month navigation
  document.getElementById('prevMonth').addEventListener('click', () => { store.monthOffset--; updateMonthDisplay(); });
  document.getElementById('nextMonth').addEventListener('click', () => { store.monthOffset++; updateMonthDisplay(); });

  // Add Transaction button
  document.getElementById('addTransactionBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('saveTxBtn').addEventListener('click', saveTransaction);
  document.getElementById('transactionModal').addEventListener('click', e => { if (e.target.id === 'transactionModal') closeModal(); });

  // Transaction type tabs
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

  // Spending trend tabs
  document.querySelectorAll('.chart-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSpendingTrend(tab.dataset.chart);
    });
  });

  // Expense filters
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

  // Profile actions
  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('profileLogoutBtn').addEventListener('click', logout);

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
