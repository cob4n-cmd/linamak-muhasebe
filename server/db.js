const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

// Cloud deploy: /data volume, local: server/firma.db
const DB_DIR = process.env.DB_DIR || __dirname;
const DB_PATH = path.join(DB_DIR, 'firma.db');
const db = new DatabaseSync(DB_PATH);
console.log('Veritabani yolu:', DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ===================== TABLOLAR =====================
db.exec(`
  -- Kullanicilar
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    name TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Musteriler
  CREATE TABLE IF NOT EXISTS customers (
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
  );

  -- Tedarikciler
  CREATE TABLE IF NOT EXISTS suppliers (
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
  );

  -- Isler (Anlasmali Isler)
  CREATE TABLE IF NOT EXISTS jobs (
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
  );

  -- Odemeler
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    method TEXT DEFAULT 'nakit',
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Gider Kategorileri
  CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  -- Giderler
  CREATE TABLE IF NOT EXISTS expenses (
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
  );

  -- Tedarikci Borclari
  CREATE TABLE IF NOT EXISTS supplier_debts (
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
  );

  -- Gelirler
  CREATE TABLE IF NOT EXISTS incomes (
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
  );

  -- Gelir Kategorileri
  CREATE TABLE IF NOT EXISTS income_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  -- Kredi Kartlari
  CREATE TABLE IF NOT EXISTS credit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT NOT NULL,
    card_name TEXT DEFAULT '',
    last_four_digits TEXT DEFAULT '',
    credit_limit REAL NOT NULL DEFAULT 0,
    closing_day INTEGER DEFAULT 1,
    due_day INTEGER DEFAULT 10,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Kredi Karti Islemleri
  CREATE TABLE IF NOT EXISTS credit_card_transactions (
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
  );

  -- Varliklar
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'diger',
    value REAL NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    acquisition_date TEXT,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Uygulama Ayarlari
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ===================== INDEKSLER =====================
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);
  CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
  CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
  CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(income_date);
  CREATE INDEX IF NOT EXISTS idx_incomes_customer ON incomes(customer_id);
  CREATE INDEX IF NOT EXISTS idx_cc_transactions_card ON credit_card_transactions(card_id);
  CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier ON supplier_debts(supplier_id);
`);

// ===================== SEED DATA =====================

// Admin kullanici
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, 'admin', ?)").run('admin', hash, 'Admin');
  console.log('Varsayilan admin kullanici olusturuldu. Kullanici: admin, Sifre: admin123');
}

// Gider kategorileri
const expCats = ['Malzeme', 'Iscilik', 'Nakliye', 'Enerji', 'Kira', 'Ofis', 'Vergi', 'Sigorta', 'Bakim', 'Yedek Parca', 'Diger'];
const insertExpCat = db.prepare("INSERT OR IGNORE INTO expense_categories (name) VALUES (?)");
expCats.forEach(c => insertExpCat.run(c));

// Gelir kategorileri
const incCats = ['Is Tahsilati', 'Hizmet Geliri', 'Fatura Tahsilati', 'Diger'];
const insertIncCat = db.prepare("INSERT OR IGNORE INTO income_categories (name) VALUES (?)");
incCats.forEach(c => insertIncCat.run(c));

// Uygulama ayarlari
const defaultSettings = { default_kdv_rate: '20', company_name: 'LinaMAK', currency: 'TRY' };
const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
Object.entries(defaultSettings).forEach(([k, v]) => insertSetting.run(k, v));

module.exports = db;
