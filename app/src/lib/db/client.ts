import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'financial.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database | null = null;

function saveDb() {
  if (_db) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function getDb(): Promise<Database> {
  if (_db) return _db;

  // Resolve WASM file from real filesystem (Turbopack virtualizes require.resolve)
  const wasmDir = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist');
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(wasmDir, file),
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // Initialize tables
  _db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      group_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      original_amount INTEGER NOT NULL,
      original_currency TEXT NOT NULL,
      converted_amount INTEGER,
      converted_currency TEXT,
      description TEXT NOT NULL,
      raw_description TEXT NOT NULL,
      direction TEXT NOT NULL,
      auto_category TEXT NOT NULL DEFAULT 'other',
      strand_id INTEGER,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      is_transfer INTEGER NOT NULL DEFAULT 0,
      exclude_from_flow INTEGER NOT NULL DEFAULT 0,
      fingerprint TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      date TEXT NOT NULL,
      balance INTEGER NOT NULL,
      currency TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      base_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      UNIQUE(date, base_currency, target_currency)
    );

    CREATE TABLE IF NOT EXISTS upload_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      filename TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      rows_imported INTEGER NOT NULL DEFAULT 0,
      rows_skipped INTEGER NOT NULL DEFAULT 0,
      date_range_start TEXT,
      date_range_end TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      uploaded_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_fingerprint ON transactions(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_snapshots_account ON snapshots(account_id);
  `);

  // Migrations for databases created before these columns existed.
  // sql.js has no IF NOT EXISTS for columns, so ignore "duplicate column" errors.
  const migrations = [
    "ALTER TABLE snapshots ADD COLUMN updated_by TEXT",
    "ALTER TABLE snapshots ADD COLUMN updated_at TEXT",
    "ALTER TABLE upload_logs ADD COLUMN uploaded_by TEXT",
  ];
  for (const migration of migrations) {
    try {
      _db.run(migration);
    } catch {
      // Column already exists
    }
  }

  saveDb();
  return _db;
}

// Convert snake_case DB rows to camelCase
function toCamelCase(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
      // Convert SQLite integers to booleans for known boolean fields
      if (['isActive', 'isRecurring', 'isTransfer', 'excludeFromFlow'].includes(camelKey)) {
        obj[camelKey] = value === 1 || value === true;
      } else {
        obj[camelKey] = value;
      }
    }
    return obj;
  });
}

// Public API
export const db = {
  async all(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const database = await getDb();
    const stmt = database.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return toCamelCase(results);
  },

  async get(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | undefined> {
    const results = await this.all(sql, params);
    return results[0];
  },

  async run(sql: string, params: unknown[] = []): Promise<{ lastId: number; changes: number }> {
    const database = await getDb();
    database.run(sql, params);
    const lastIdResult = database.exec("SELECT last_insert_rowid() as id");
    const lastId = lastIdResult.length > 0 ? (lastIdResult[0].values[0][0] as number) : 0;
    const changesResult = database.exec("SELECT changes() as c");
    const changes = changesResult.length > 0 ? (changesResult[0].values[0][0] as number) : 0;
    saveDb();
    return { lastId, changes };
  },
};
