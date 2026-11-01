const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

process.umask(0o077);
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
try { fs.chmodSync(dataDir, 0o700); } catch { /* Windows filesystems may not support POSIX permissions. */ }
const db = new Database(path.join(dataDir, 'moneyglass.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = FULL');
db.pragma('secure_delete = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email_lookup TEXT NOT NULL UNIQUE,
    email_cipher TEXT NOT NULL,
    profile_cipher TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload_cipher TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_transactions_fingerprint ON transactions(user_id, fingerprint);
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload_cipher TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload_cipher TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

module.exports = db;
