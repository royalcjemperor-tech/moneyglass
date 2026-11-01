require('dotenv').config();
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const db = require('./db');
const { seal, unseal, lookupDigest, hashSession, hashPassword, verifyPassword } = require('./security');
const { parseStatement } = require('./statement-parser');
const { getTransactions, getBudgets, buildDashboard, transactionFingerprint } = require('./analytics');
const { answerQuestion } = require('./assistant');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_DAYS = Math.max(1, Math.min(30, Number(process.env.SESSION_TTL_DAYS || 7)));
const COOKIE_NAME = 'moneyglass_session';
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: null
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Cross-origin request rejected.' });
    } catch {
      return res.status(403).json({ error: 'Invalid request origin.' });
    }
  }
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0, etag: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again in 15 minutes.' } });
const assistantLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false, message: { error: 'Import limit reached. Please try again later.' } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1 } });

function nowIso() { return new Date().toISOString(); }
function newId() { return crypto.randomUUID(); }
function readCookie(req, name) {
  const header = req.headers.cookie || '';
  const found = header.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  if (!found) return null;
  try { return decodeURIComponent(found.slice(name.length + 1)); } catch { return null; }
}
function writeSessionCookie(req, res, token, maxAgeSeconds) {
  const secureMode = String(process.env.COOKIE_SECURE || 'auto').toLowerCase();
  const secure = secureMode === 'true' || (secureMode === 'auto' && req.secure);
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function clearSessionCookie(req, res) {
  writeSessionCookie(req, res, '', 0);
}
function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 86400000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashSession(token), userId, expiresAt, nowIso());
  writeSessionCookie(req, res, token, SESSION_DAYS * 86400);
}
function authRequired(req, res, next) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token || token.length > 200) return res.status(401).json({ error: 'Please sign in to continue.' });
  const session = db.prepare(`SELECT s.token_hash, s.user_id, s.expires_at, u.email_cipher, u.profile_cipher
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).get(hashSession(token));
  if (!session || session.expires_at < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.token_hash);
    clearSessionCookie(req, res);
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  req.user = { id: session.user_id, email: unseal(session.email_cipher), ...unseal(session.profile_cipher) };
  req.sessionTokenHash = session.token_hash;
  next();
}
function validateEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function validatePassword(password) {
  return typeof password === 'string' && password.length >= 10 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
function normalizeTransaction(input, fallbackSource = 'manual') {
  if (!input || typeof input !== 'object') throw new Error('Invalid transaction.');
  const date = input.date;
  const description = String(input.description || '').trim().slice(0, 240);
  const amount = Number(input.amount);
  if (!validateDate(date)) throw new Error('Enter a valid transaction date.');
  if (!description) throw new Error('Enter a transaction description.');
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000000000) throw new Error('Enter a valid non-zero amount.');
  const category = String(input.category || (amount > 0 ? 'Income' : 'Other')).trim().slice(0, 48) || 'Other';
  return {
    date, description, amount: Math.round(amount * 100) / 100,
    category, currency: 'INR', source: fallbackSource === 'statement' ? 'statement' : 'manual'
  };
}
function insertTransaction(userId, transaction) {
  const tx = normalizeTransaction(transaction, transaction.source);
  const fingerprint = transactionFingerprint(tx);
  const exists = db.prepare('SELECT id FROM transactions WHERE user_id = ? AND fingerprint = ?').get(userId, fingerprint);
  if (exists) return { id: exists.id, duplicate: true };
  const id = newId();
  db.prepare('INSERT INTO transactions (id, user_id, payload_cipher, fingerprint, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, seal(tx), fingerprint, nowIso());
  return { id, duplicate: false };
}
function sendError(res, error, status = 400) {
  return res.status(status).json({ error: error.message || 'Something went wrong.' });
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'moneyglass', time: nowIso() }));

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  if (String(process.env.ALLOW_SIGNUP || 'true').toLowerCase() === 'false') return res.status(403).json({ error: 'New account registration is disabled on this installation.' });
  try {
    const name = String(req.body.name || '').trim().slice(0, 80);
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Use at least 10 characters with letters and numbers.' });
    const emailLookup = lookupDigest(email);
    if (db.prepare('SELECT id FROM users WHERE email_lookup = ?').get(emailLookup)) return res.status(409).json({ error: 'An account with this email already exists.' });
    const credentials = await hashPassword(password);
    const id = newId();
    const timestamp = nowIso();
    const create = db.transaction(() => {
      db.prepare(`INSERT INTO users (id, email_lookup, email_cipher, profile_cipher, password_hash, password_salt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, emailLookup, seal(email), seal({ name }), credentials.hash, credentials.salt, timestamp, timestamp);
      db.prepare('INSERT INTO user_settings (user_id, payload_cipher, updated_at) VALUES (?, ?, ?)')
        .run(id, seal({ currency: 'INR', monthStart: 1, theme: 'dark' }), timestamp);
    });
    create();
    createSession(req, res, id);
    res.status(201).json({ user: { id, name, email } });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'An account with this email already exists.' });
    sendError(res, error);
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!validateEmail(email) || typeof password !== 'string' || password.length > 128) return res.status(400).json({ error: 'Enter your email and password.' });
    const user = db.prepare('SELECT * FROM users WHERE email_lookup = ?').get(lookupDigest(email));
    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    createSession(req, res, user.id);
    const profile = unseal(user.profile_cipher);
    res.json({ user: { id: user.id, name: profile.name, email: unseal(user.email_cipher) } });
  } catch (error) { sendError(res, error); }
});

app.post('/api/auth/logout', (req, res) => {
  const token = readCookie(req, COOKIE_NAME);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSession(token));
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.get('/api/auth/me', authRequired, (req, res) => res.json({ user: req.user }));

app.get('/api/dashboard', authRequired, (req, res) => {
  try { res.json(buildDashboard(req.user.id, String(req.query.range || '30d'), req.query.from, req.query.to)); }
  catch (error) { sendError(res, error, 500); }
});

app.get('/api/transactions', authRequired, (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || 'all');
    const type = String(req.query.type || 'all');
    let rows = getTransactions(req.user.id);
    if (search) rows = rows.filter(tx => `${tx.description} ${tx.category}`.toLowerCase().includes(search));
    if (category !== 'all') rows = rows.filter(tx => tx.category === category);
    if (type === 'income') rows = rows.filter(tx => tx.amount > 0);
    if (type === 'expense') rows = rows.filter(tx => tx.amount < 0);
    rows.sort((a, b) => b.date.localeCompare(a.date));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({ items: rows.slice((page - 1) * limit, page * limit), page, pages, total, categories: [...new Set(getTransactions(req.user.id).map(tx => tx.category).filter(Boolean))].sort() });
  } catch (error) { sendError(res, error, 500); }
});

app.post('/api/transactions', authRequired, (req, res) => {
  try {
    const input = { ...req.body };
    if (input.type === 'expense') input.amount = -Math.abs(Number(input.amount));
    else if (input.type === 'income') input.amount = Math.abs(Number(input.amount));
    const result = insertTransaction(req.user.id, input);
    if (result.duplicate) return res.status(409).json({ error: 'This transaction appears to be a duplicate.' });
    res.status(201).json({ id: result.id });
  } catch (error) { sendError(res, error); }
});

app.patch('/api/transactions/:id', authRequired, (req, res) => {
  try {
    const row = db.prepare('SELECT id, payload_cipher FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Transaction not found.' });
    const existing = unseal(row.payload_cipher);
    const merged = normalizeTransaction({ ...existing, ...req.body }, existing.source);
    const fingerprint = transactionFingerprint(merged);
    const dupe = db.prepare('SELECT id FROM transactions WHERE user_id = ? AND fingerprint = ? AND id != ?').get(req.user.id, fingerprint, row.id);
    if (dupe) return res.status(409).json({ error: 'Another transaction already has the same date, description and amount.' });
    db.prepare('UPDATE transactions SET payload_cipher = ?, fingerprint = ? WHERE id = ? AND user_id = ?').run(seal(merged), fingerprint, row.id, req.user.id);
    res.json({ ok: true });
  } catch (error) { sendError(res, error); }
});

app.delete('/api/transactions/:id', authRequired, (req, res) => {
  const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Transaction not found.' });
  res.json({ ok: true });
});

app.post('/api/import/preview', authRequired, importLimiter, upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a statement file first.' });
    const result = await parseStatement(req.file);
    if (!result.transactions.length) return res.status(422).json({ error: result.warnings[0] || 'No transactions could be read.', warnings: result.warnings });
    const existing = new Set(db.prepare('SELECT fingerprint FROM transactions WHERE user_id = ?').all(req.user.id).map(row => row.fingerprint));
    const preview = result.transactions.map(tx => {
      const fingerprint = transactionFingerprint(tx);
      const duplicate = existing.has(fingerprint);
      existing.add(fingerprint);
      return { ...tx, duplicate };
    });
    res.json({ fileName: req.file.originalname.slice(0, 120), count: preview.length, transactions: preview, warnings: result.warnings || [] });
  } catch (error) { sendError(res, error, 422); }
});

app.post('/api/import/commit', authRequired, (req, res) => {
  try {
    const input = Array.isArray(req.body.transactions) ? req.body.transactions : [];
    if (!input.length || input.length > 5000) return res.status(400).json({ error: 'The import must contain between 1 and 5,000 transactions.' });
    let imported = 0;
    let duplicates = 0;
    const insertMany = db.transaction(() => {
      for (const item of input) {
        const result = insertTransaction(req.user.id, { ...item, source: 'statement' });
        if (result.duplicate) duplicates++;
        else imported++;
      }
    });
    insertMany();
    res.status(201).json({ imported, duplicates });
  } catch (error) { sendError(res, error); }
});

app.get('/api/budgets', authRequired, (req, res) => res.json({ items: getBudgets(req.user.id) }));
app.post('/api/budgets', authRequired, (req, res) => {
  try {
    const category = String(req.body.category || '').trim().slice(0, 48);
    const amount = Number(req.body.amount);
    if (!category) return res.status(400).json({ error: 'Choose a category.' });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) return res.status(400).json({ error: 'Enter a valid budget amount.' });
    const id = newId();
    const currentDate = new Date();
    const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    db.prepare('INSERT INTO budgets (id, user_id, payload_cipher, created_at) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, seal({ category, amount: Math.round(amount * 100) / 100, period: 'month', month }), nowIso());
    res.status(201).json({ id });
  } catch (error) { sendError(res, error); }
});
app.delete('/api/budgets/:id', authRequired, (req, res) => {
  const result = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Budget not found.' });
  res.json({ ok: true });
});

app.post('/api/assistant', authRequired, assistantLimiter, async (req, res) => {
  const question = String(req.body.question || '').trim().slice(0, 500);
  if (question.length < 3) return res.status(400).json({ error: 'Please enter a question.' });
  try { res.json(await answerQuestion(req.user.id, question)); }
  catch (error) { sendError(res, error, 500); }
});

app.patch('/api/profile', authRequired, (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  if (name.length < 2) return res.status(400).json({ error: 'Name must contain at least two characters.' });
  db.prepare('UPDATE users SET profile_cipher = ?, updated_at = ? WHERE id = ?').run(seal({ name }), nowIso(), req.user.id);
  res.json({ user: { ...req.user, name } });
});

app.post('/api/profile/password', authRequired, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;
    const user = db.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').get(req.user.id);
    if (!user || !(await verifyPassword(currentPassword || '', user.password_salt, user.password_hash))) return res.status(401).json({ error: 'Your current password is incorrect.' });
    if (!validatePassword(newPassword)) return res.status(400).json({ error: 'Use at least 10 characters with letters and numbers.' });
    const credentials = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?').run(credentials.hash, credentials.salt, nowIso(), req.user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(req.user.id, req.sessionTokenHash);
    res.json({ ok: true, message: 'Password updated. Other active sessions were signed out.' });
  } catch (error) { sendError(res, error); }
});

app.get('/api/settings', authRequired, (req, res) => {
  const row = db.prepare('SELECT payload_cipher FROM user_settings WHERE user_id = ?').get(req.user.id);
  res.json(row ? unseal(row.payload_cipher) : { currency: 'INR', monthStart: 1, theme: 'dark' });
});
app.patch('/api/settings', authRequired, (req, res) => {
  const currency = req.body.currency === 'INR' ? 'INR' : 'INR';
  const settings = { currency, monthStart: 1, theme: 'dark' };
  db.prepare(`INSERT INTO user_settings (user_id, payload_cipher, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET payload_cipher = excluded.payload_cipher, updated_at = excluded.updated_at`)
    .run(req.user.id, seal(settings), nowIso());
  res.json(settings);
});

app.get('/api/export/json', authRequired, (req, res) => {
  const payload = {
    format: 'moneyglass-backup-v1',
    exportedAt: nowIso(),
    user: { name: req.user.name, email: req.user.email },
    transactions: getTransactions(req.user.id),
    budgets: getBudgets(req.user.id)
  };
  res.setHeader('Content-Disposition', 'attachment; filename="moneyglass-backup.json"');
  res.type('application/json').send(JSON.stringify(payload, null, 2));
});
app.get('/api/export/csv', authRequired, (req, res) => {
  const rows = getTransactions(req.user.id);
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = ['Date,Description,Category,Type,Amount,Currency', ...rows.map(tx => [tx.date, tx.description, tx.category, tx.amount < 0 ? 'Expense' : 'Income', Math.abs(tx.amount).toFixed(2), tx.currency || 'INR'].map(csvCell).join(','))].join('\r\n');
  res.setHeader('Content-Disposition', 'attachment; filename="moneyglass-transactions.csv"');
  res.type('text/csv; charset=utf-8').send(`\uFEFF${csv}`);
});

app.delete('/api/account', authRequired, async (req, res) => {
  try {
    const user = db.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').get(req.user.id);
    if (!user || !(await verifyPassword(req.body.password || '', user.password_salt, user.password_hash))) return res.status(401).json({ error: 'Password confirmation failed.' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (error) { sendError(res, error); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Statement files must be 12 MB or smaller.' });
  console.error(`[${nowIso()}]`, error.message);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Moneyglass is running on port ${PORT}`);
  console.log(`Database directory: ${process.env.DATA_DIR || path.join(process.cwd(), 'data')}`);
  if (!process.env.OLLAMA_URL) console.log('Assistant mode: private built-in insights (no external API).');
});
