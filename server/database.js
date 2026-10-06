const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');
const bcrypt    = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'ectron.db');

// sql.js works fully in memory; we persist to disk manually.
let db; // will be set async in init()

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // ─── Schema ──────────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      company_id  TEXT    DEFAULT '',
      email       TEXT    DEFAULT '',
      phone       TEXT    DEFAULT '',
      access      TEXT    NOT NULL DEFAULT 'user',
      team_name   TEXT    DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    try {
      db.run("ALTER TABLE users ADD COLUMN team_name TEXT DEFAULT ''");
    } catch (e) {}

    CREATE TABLE IF NOT EXISTS downtime (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name     TEXT    NOT NULL,
      stage         TEXT    NOT NULL,
      date          TEXT    NOT NULL,
      start_time    TEXT    NOT NULL,
      end_time      TEXT    NOT NULL,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default admin on first run
  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const count  = result[0]?.values[0]?.[0] ?? 0;

  if (count === 0) {
    const hash = bcrypt.hashSync('Admin@1234', 10);
    db.run(
      `INSERT INTO users (name, password, company_id, email, phone, access)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Admin', hash, 'ECTRON-001', 'admin@ectron.com', '', 'admin']
    );
    persist();
    console.log('✔ Default admin created  →  name: Admin  |  password: Admin@1234');
  }

  return db;
}

// Persist the in-memory DB to disk after every write
function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── Query helpers (mimic better-sqlite3's synchronous API) ───────────────

/**
 * Run a statement that doesn't return rows (INSERT / UPDATE / DELETE).
 * Returns { lastInsertRowid, changes }.
 */
function run(sql, params = []) {
  if (params && params.length) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  const meta = db.exec('SELECT last_insert_rowid() as id, changes() as c');
  const row  = meta[0]?.values[0];
  const result = { lastInsertRowid: row?.[0], changes: row?.[1] };
  persist();
  return result;
}

/**
 * Return all matching rows as plain objects with proper parameter binding.
 */
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params && params.length) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Return one row as a plain object (or null).
 */
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] ?? null;
}

module.exports = { init, run, get, all, persist };
