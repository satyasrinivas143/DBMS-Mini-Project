const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 5000;
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'smartfinance.db');
const sessions = new Map();
const SESSION_COOKIE = 'smartfinance_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function createSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'legacy',
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'legacy',
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🎯',
      description TEXT NOT NULL DEFAULT '',
      target REAL NOT NULL DEFAULT 0,
      saved REAL NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'purple'
    );
    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'legacy',
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📦',
      category TEXT NOT NULL,
      budget REAL NOT NULL DEFAULT 0,
      spent REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#94a3b8'
    );
    CREATE TABLE IF NOT EXISTS income_sources (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'legacy',
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '💰',
      amount REAL NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'Monthly',
      color TEXT NOT NULL DEFAULT '#34d399'
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      degree TEXT NOT NULL DEFAULT '',
      college TEXT NOT NULL DEFAULT ''
    );
  `);

  for (const table of ['transactions', 'savings_goals', 'budget_categories', 'income_sources']) {
    const columns = rows(db, `PRAGMA table_info(${table})`);
    if (!columns.some(column => column.name === 'user_id')) {
      db.run(`ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy'`);
    }
  }
}

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  if (params.length) statement.bind(params);
  const result = [];
  while (statement.step()) result.push(statement.getAsObject());
  statement.free();
  return result;
}

function readDatabase(db, userId) {
  return {
    transactions: rows(db, 'SELECT id, type, description AS "desc", amount, category, date, note FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId]),
    savingsGoals: rows(db, 'SELECT id, name, icon, description AS "desc", target, saved, deadline, color FROM savings_goals WHERE user_id = ? ORDER BY deadline', [userId]),
    budgetCategories: rows(db, 'SELECT id, name, icon, category, budget, spent, color FROM budget_categories WHERE user_id = ? ORDER BY name', [userId]),
    incomeSources: rows(db, 'SELECT id, name, icon, amount, frequency, color FROM income_sources WHERE user_id = ? ORDER BY name', [userId])
  };
}

function writeDatabaseFile(db) {
  const temporaryPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, Buffer.from(db.export()));
  fs.renameSync(temporaryPath, DB_PATH);
}

function replaceStore(db, data, userId) {
  const collections = [
    ['transactions', 'transactions'],
    ['savingsGoals', 'savings_goals'],
    ['budgetCategories', 'budget_categories'],
    ['incomeSources', 'income_sources']
  ];

  db.run('BEGIN TRANSACTION');
  try {
    for (const [, table] of collections) db.run(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);

    for (const item of data.transactions || []) {
      db.run(
        'INSERT INTO transactions (id, user_id, type, description, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item.id, userId, item.type, item.desc, Number(item.amount), item.category, item.date, item.note || '']
      );
    }

    for (const item of data.savingsGoals || []) {
      db.run(
        'INSERT INTO savings_goals (id, user_id, name, icon, description, target, saved, deadline, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item.id, userId, item.name, item.icon || '🎯', item.desc || item.description || '', Number(item.target), Number(item.saved || 0), item.deadline || '', item.color || 'purple']
      );
    }

    for (const item of data.budgetCategories || []) {
      db.run(
        'INSERT INTO budget_categories (id, user_id, name, icon, category, budget, spent, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item.id, userId, item.name, item.icon || '📦', item.category, Number(item.budget), Number(item.spent || 0), item.color || '#94a3b8']
      );
    }

    for (const item of data.incomeSources || []) {
      db.run(
        'INSERT INTO income_sources (id, user_id, name, icon, amount, frequency, color) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.id, userId, item.name, item.icon || '💰', Number(item.amount), item.frequency || 'Monthly', item.color || '#34d399']
      );
    }

    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  writeDatabaseFile(db);
}

function isValidStore(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const collectionKeys = ['transactions', 'savingsGoals', 'budgetCategories', 'incomeSources'];
  return collectionKeys.every(key => data[key] === undefined || Array.isArray(data[key]));
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function getSessionToken(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const sessionCookie = cookies.find(cookie => cookie.trim().startsWith(`${SESSION_COOKIE}=`));
  return sessionCookie ? sessionCookie.trim().slice(SESSION_COOKIE.length + 1) : '';
}

function setSessionCookie(req, res, token) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_TTL_MS / 1000}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearSessionCookie(req, res) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function publicUser(db, userId) {
  return rows(db, 'SELECT id, name, email, degree, college FROM users WHERE id = ?', [userId])[0] || null;
}

function requireAuth(db) {
  return (req, res, next) => {
    const token = getSessionToken(req);
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      if (session) sessions.delete(token);
      return res.status(401).json({ error: 'Please log in to continue' });
    }

    const user = publicUser(db, session.userId);
    if (!user) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Please log in to continue' });
    }

    req.user = user;
    next();
  };
}

async function start() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const SQL = await initSqlJs({
    locateFile: file => require.resolve(`sql.js/dist/${file}`)
  });
  const db = fs.existsSync(DB_PATH)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)))
    : new SQL.Database();

  createSchema(db);
  writeDatabaseFile(db);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'SmartFinance API', database: 'SQLite', timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/me', requireAuth(db), (req, res) => res.json({ user: req.user }));

  app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254 ||
        typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Provide a name, valid email, and a password between 8 and 128 characters' });
    }
    if (rows(db, 'SELECT id FROM users WHERE email = ? COLLATE NOCASE', [normalizedEmail]).length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = crypto.randomBytes(16);
    const passwordHash = crypto.scryptSync(password, salt, 64);
    const userId = createId();
    try {
      db.run(
        'INSERT INTO users (id, name, email, password_salt, password_hash) VALUES (?, ?, ?, ?, ?)',
        [userId, name.trim(), normalizedEmail, salt.toString('hex'), passwordHash.toString('hex')]
      );
      writeDatabaseFile(db);
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
      setSessionCookie(req, res, token);
      res.status(201).json({ user: publicUser(db, userId) });
    } catch (error) {
      res.status(500).json({ error: `Could not create account: ${error.message}` });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ error: 'Provide your email and password' });
    }
    const account = rows(
      db,
      'SELECT id, password_salt, password_hash FROM users WHERE email = ? COLLATE NOCASE',
      [normalizedEmail]
    )[0];
    if (!account) return res.status(401).json({ error: 'Email or password is incorrect' });

    const actualHash = crypto.scryptSync(password, Buffer.from(account.password_salt, 'hex'), 64);
    const expectedHash = Buffer.from(account.password_hash, 'hex');
    if (actualHash.length !== expectedHash.length || !crypto.timingSafeEqual(actualHash, expectedHash)) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId: account.id, expiresAt: Date.now() + SESSION_TTL_MS });
    setSessionCookie(req, res, token);
    res.json({ user: publicUser(db, account.id) });
  });

  app.post('/api/auth/logout', (req, res) => {
    sessions.delete(getSessionToken(req));
    clearSessionCookie(req, res);
    res.json({ message: 'Logged out' });
  });

  app.use('/api', requireAuth(db));

  app.get('/api/profile', (req, res) => res.json({ user: req.user }));

  app.put('/api/profile', (req, res) => {
    const { name, degree = '', college = '' } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 ||
        typeof degree !== 'string' || degree.length > 120 ||
        typeof college !== 'string' || college.length > 120) {
      return res.status(400).json({ error: 'Provide a name (up to 80 characters), course, and college (up to 120 characters each)' });
    }

    try {
      db.run('UPDATE users SET name = ?, degree = ?, college = ? WHERE id = ?', [
        name.trim(), degree.trim(), college.trim(), req.user.id
      ]);
      writeDatabaseFile(db);
      res.json({ user: publicUser(db, req.user.id) });
    } catch (error) {
      res.status(500).json({ error: `Could not save profile: ${error.message}` });
    }
  });

  app.get('/api/store', (req, res) => {
    res.json(readDatabase(db, req.user.id));
  });

  app.put('/api/store', (req, res) => {
    if (!isValidStore(req.body)) {
      return res.status(400).json({ error: 'Expected arrays for transactions, savingsGoals, budgetCategories, and incomeSources' });
    }
    try {
      replaceStore(db, req.body, req.user.id);
      res.json({ message: 'Data saved to SQLite', data: readDatabase(db, req.user.id) });
    } catch (error) {
      res.status(400).json({ error: `Could not save data: ${error.message}` });
    }
  });

  app.get('/api/transactions', (req, res) => {
    res.json(readDatabase(db, req.user.id).transactions);
  });

  app.post('/api/transactions', (req, res) => {
    const { type, desc, amount, category, date, note = '' } = req.body;
    if (!['income', 'expense'].includes(type) || typeof desc !== 'string' || !desc.trim() ||
        !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
        typeof category !== 'string' || !category || typeof date !== 'string' || !date) {
      return res.status(400).json({ error: 'Provide a valid type, description, positive amount, category, and date' });
    }
    const item = { id: createId(), type, desc: desc.trim(), amount: Number(amount), category, date, note: String(note) };
    try {
      const data = readDatabase(db, req.user.id);
      data.transactions.unshift(item);
      replaceStore(db, data, req.user.id);
      res.status(201).json({ message: 'Transaction added', data: item });
    } catch (error) {
      res.status(500).json({ error: `Could not add transaction: ${error.message}` });
    }
  });

  app.delete('/api/transactions/:id', (req, res) => {
    const data = readDatabase(db, req.user.id);
    const transactions = data.transactions.filter(item => item.id !== req.params.id);
    if (transactions.length === data.transactions.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    data.transactions = transactions;
    replaceStore(db, data, req.user.id);
    res.json({ message: 'Transaction deleted' });
  });

  app.get('/api/goals', (req, res) => {
    const goals = readDatabase(db, req.user.id).savingsGoals.map(({ desc, ...goal }) => ({
      ...goal,
      description: desc
    }));
    res.json(goals);
  });

  app.post('/api/goals', (req, res) => {
    const { name, icon = '🎯', description = '', target, saved = 0, deadline = '', color = 'purple' } = req.body;
    if (typeof name !== 'string' || !name.trim() ||
        !Number.isFinite(Number(target)) || Number(target) <= 0 ||
        !Number.isFinite(Number(saved)) || Number(saved) < 0) {
      return res.status(400).json({ error: 'Provide a name, positive target, and valid saved amount' });
    }

    const item = { id: createId(), name: name.trim(), icon, desc: description, target: Number(target), saved: Number(saved), deadline, color };
    const data = readDatabase(db, req.user.id);
    data.savingsGoals.push(item);
    try {
      replaceStore(db, data, req.user.id);
      res.status(201).json({ message: 'Goal added', data: { ...item, description: item.desc } });
    } catch (error) {
      res.status(500).json({ error: `Could not add goal: ${error.message}` });
    }
  });

  app.get('/api/budget-categories', (req, res) => res.json(readDatabase(db, req.user.id).budgetCategories));
  app.post('/api/budget-categories', (req, res) => {
    const { name, icon = '📦', category, budget, spent = 0, color = '#94a3b8' } = req.body;
    if (typeof name !== 'string' || !name.trim() ||
        typeof category !== 'string' || !category ||
        !Number.isFinite(Number(budget)) || Number(budget) <= 0 ||
        !Number.isFinite(Number(spent)) || Number(spent) < 0) {
      return res.status(400).json({ error: 'Provide a name, category, positive budget, and valid spent amount' });
    }

    const item = { id: createId(), name: name.trim(), icon, category, budget: Number(budget), spent: Number(spent), color };
    const data = readDatabase(db, req.user.id);
    data.budgetCategories.push(item);
    try {
      replaceStore(db, data, req.user.id);
      res.status(201).json({ message: 'Budget category added', data: item });
    } catch (error) {
      res.status(500).json({ error: `Could not add budget category: ${error.message}` });
    }
  });

  app.get('/api/income-sources', (req, res) => res.json(readDatabase(db, req.user.id).incomeSources));
  app.post('/api/income-sources', (req, res) => {
    const { name, icon = '💰', amount, frequency = 'Monthly', color = '#34d399' } = req.body;
    if (typeof name !== 'string' || !name.trim() ||
        !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ error: 'Provide a name and a valid non-negative amount' });
    }

    const item = { id: createId(), name: name.trim(), icon, amount: Number(amount), frequency, color };
    const data = readDatabase(db, req.user.id);
    data.incomeSources.push(item);
    try {
      replaceStore(db, data, req.user.id);
      res.status(201).json({ message: 'Income source added', data: item });
    } catch (error) {
      res.status(500).json({ error: `Could not add income source: ${error.message}` });
    }
  });

  app.get('/api/dashboard', (req, res) => {
    const data = readDatabase(db, req.user.id);
    const totalIncome = data.transactions
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = data.transactions
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalSavings = data.savingsGoals.reduce((sum, item) => sum + Number(item.saved), 0);
    const savingsGoalTarget = data.savingsGoals.reduce((sum, item) => sum + Number(item.target), 0);
    const totalBudget = data.budgetCategories.reduce((sum, item) => sum + Number(item.budget), 0);
    const totalBudgetSpent = data.budgetCategories.reduce((sum, item) => sum + Number(item.spent), 0);

    res.json({
      totalBalance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      totalSavings,
      savingsGoalTarget,
      totalBudget,
      totalBudgetSpent
    });
  });

  app.use(express.static(ROOT_DIR));
  app.get('/', (req, res) => res.sendFile(path.join(ROOT_DIR, 'index.html')));

  app.listen(PORT, () => {
    console.log(`SmartFinance API running at http://localhost:${PORT}`);
    console.log(`SQLite database: ${DB_PATH}`);
  });
}

start().catch(error => {
  console.error('Failed to start SmartFinance API:', error);
  process.exitCode = 1;
});
