const { createClient } = require('@libsql/client');
const path = require('path');
const bcrypt = require('bcryptjs');

// Turso cloud veya lokal SQLite
const DB_DIR = process.env.DB_DIR || __dirname;
const localUrl = 'file:' + path.join(DB_DIR, 'firma.db');

const client = createClient({
  url: process.env.TURSO_DB_URL || localUrl,
  authToken: process.env.TURSO_DB_TOKEN || undefined,
});

// Wrapper: node:sqlite benzeri API ama async
const db = {
  async get(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  },
  async all(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return result.rows;
  },
  async run(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected };
  },
  async exec(sql) {
    // executeMultiple doesn't support parameters but handles multiple statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
  },
};

// ===================== VERITABANI BASLAT =====================
async function initDB() {
  console.log('Veritabani URL:', process.env.TURSO_DB_URL ? 'Turso Cloud' : localUrl);

  // Tablolari tek tek olustur (executeMultiple yerine)
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      name TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      tax_office TEXT DEFAULT '',
      tax_number TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      tax_office TEXT DEFAULT '',
      tax_number TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'beklemede',
      invoice_status TEXT NOT NULL DEFAULT 'faturasiz',
      invoice_no TEXT DEFAULT '',
      contract_value REAL NOT NULL DEFAULT 0,
      kdv_rate REAL NOT NULL DEFAULT 20,
      contract_value_with_kdv REAL NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      method TEXT DEFAULT 'nakit',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      amount REAL NOT NULL,
      kdv_rate REAL NOT NULL DEFAULT 20,
      kdv_amount REAL NOT NULL DEFAULT 0,
      total_with_kdv REAL NOT NULL DEFAULT 0,
      expense_date TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'nakit',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      description TEXT DEFAULT '',
      amount REAL NOT NULL,
      kdv_rate REAL NOT NULL DEFAULT 20,
      total_with_kdv REAL NOT NULL DEFAULT 0,
      debt_date TEXT NOT NULL,
      due_date TEXT,
      is_paid INTEGER NOT NULL DEFAULT 0,
      paid_date TEXT,
      payment_method TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Genel',
      amount REAL NOT NULL,
      kdv_rate REAL NOT NULL DEFAULT 20,
      kdv_amount REAL NOT NULL DEFAULT 0,
      total_with_kdv REAL NOT NULL DEFAULT 0,
      income_date TEXT NOT NULL,
      method TEXT DEFAULT 'nakit',
      invoice_no TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS income_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS credit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      card_name TEXT DEFAULT '',
      last_four_digits TEXT DEFAULT '',
      credit_limit REAL NOT NULL DEFAULT 0,
      closing_day INTEGER DEFAULT 1,
      due_day INTEGER DEFAULT 10,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS credit_card_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_date TEXT NOT NULL,
      installment_count INTEGER NOT NULL DEFAULT 1,
      installment_amount REAL NOT NULL DEFAULT 0,
      remaining_installments INTEGER NOT NULL DEFAULT 0,
      is_paid INTEGER NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'Genel',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'diger',
      value REAL NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      acquisition_date TEXT,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ];

  for (const sql of tables) {
    await client.execute(sql);
  }

  // Indeksler
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)',
    'CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)',
    'CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(income_date)',
    'CREATE INDEX IF NOT EXISTS idx_incomes_customer ON incomes(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_cc_transactions_card ON credit_card_transactions(card_id)',
    'CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier ON supplier_debts(supplier_id)',
  ];

  for (const sql of indexes) {
    await client.execute(sql);
  }

  // Migration: faturali/faturasiz tutar ayrimi + supplier_debts job_id
  const migrations = [
    "ALTER TABLE jobs ADD COLUMN faturali_tutar REAL NOT NULL DEFAULT 0",
    "ALTER TABLE jobs ADD COLUMN faturasiz_tutar REAL NOT NULL DEFAULT 0",
    "ALTER TABLE supplier_debts ADD COLUMN job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL",
  ];
  for (const sql of migrations) {
    try { await client.execute(sql); } catch (e) { /* column already exists */ }
  }

  // Mevcut verileri migrate et
  await db.run("UPDATE jobs SET faturali_tutar = contract_value, faturasiz_tutar = 0 WHERE faturali_tutar = 0 AND faturasiz_tutar = 0 AND invoice_status = 'faturali'");
  await db.run("UPDATE jobs SET faturali_tutar = 0, faturasiz_tutar = contract_value WHERE faturali_tutar = 0 AND faturasiz_tutar = 0 AND invoice_status = 'faturasiz'");
  // Karma olmayan, henuz set edilmemis olanlari faturasiz olarak kabul et
  await db.run("UPDATE jobs SET faturasiz_tutar = contract_value WHERE faturali_tutar = 0 AND faturasiz_tutar = 0 AND contract_value > 0");

  // Seed: Admin kullanici
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', 'admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.run("INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, 'admin', ?)", 'admin', hash, 'Admin');
    console.log('Varsayilan admin kullanici olusturuldu. Kullanici: admin, Sifre: admin123');
  }

  // Seed: Gider kategorileri
  const expCats = ['Malzeme', 'Iscilik', 'Nakliye', 'Enerji', 'Kira', 'Ofis', 'Vergi', 'Sigorta', 'Bakim', 'Yedek Parca', 'Diger'];
  for (const c of expCats) {
    await db.run("INSERT OR IGNORE INTO expense_categories (name) VALUES (?)", c);
  }

  // Seed: Gelir kategorileri
  const incCats = ['Is Tahsilati', 'Hizmet Geliri', 'Fatura Tahsilati', 'Diger'];
  for (const c of incCats) {
    await db.run("INSERT OR IGNORE INTO income_categories (name) VALUES (?)", c);
  }

  // Seed: Uygulama ayarlari
  const defaultSettings = { default_kdv_rate: '20', company_name: 'LinaMAK', currency: 'TRY' };
  for (const [k, v] of Object.entries(defaultSettings)) {
    await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", k, v);
  }

  console.log('Veritabani hazir.');
}

module.exports = { db, initDB };
