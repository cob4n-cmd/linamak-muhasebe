const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List suppliers
router.get('/', async (req, res) => {
  const { search } = req.query;
  let sql = `SELECT s.*,
    COALESCE((SELECT SUM(d.total_with_kdv) FROM supplier_debts d WHERE d.supplier_id = s.id AND d.is_paid = 0), 0) as unpaid_debt,
    COALESCE((SELECT SUM(d.total_with_kdv) FROM supplier_debts d WHERE d.supplier_id = s.id AND d.is_paid = 1), 0) as paid_debt,
    COALESCE((SELECT SUM(d.total_with_kdv) FROM supplier_debts d WHERE d.supplier_id = s.id), 0) as total_debt,
    COALESCE((SELECT SUM(e.total_with_kdv) FROM expenses e WHERE e.supplier_id = s.id), 0) as total_expense
    FROM suppliers s`;
  const params = [];
  if (search) { sql += ` WHERE s.name LIKE ? OR s.contact_person LIKE ?`; params.push(`%${search}%`, `%${search}%`); }
  sql += ` ORDER BY s.name`;
  res.json(await db.all(sql, ...params));
});

// Single supplier
router.get('/:id', async (req, res) => {
  const s = await db.get('SELECT * FROM suppliers WHERE id = ?', req.params.id);
  if (!s) return res.status(404).json({ error: 'Tedarikci bulunamadi' });
  // Borclar
  s.debts = await db.all(`SELECT d.*, d.total_with_kdv as total_amount,
    CASE WHEN d.is_paid = 1 THEN 'paid' ELSE 'unpaid' END as status,
    j.title as job_title
    FROM supplier_debts d
    LEFT JOIN jobs j ON j.id = d.job_id
    WHERE d.supplier_id = ? ORDER BY d.debt_date DESC`, req.params.id);
  // Giderler (expenses) - bu tedarikçiden yapılan alımlar
  s.purchases = await db.all(`SELECT e.id, e.description, e.amount, e.kdv_rate, e.total_with_kdv,
    e.expense_date, e.is_paid, e.payment_method, e.category,
    j.title as job_title, j.id as job_id
    FROM expenses e
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE e.supplier_id = ? ORDER BY e.expense_date DESC`, req.params.id);
  // Hesap hareketleri: tüm borç ödemeleri + gider ödemeleri
  const debtPayments = await db.all(`SELECT d.id, d.description, d.total_with_kdv as amount, d.paid_date as date,
    d.payment_method, j.title as job_title,
    'borc_odeme' as type
    FROM supplier_debts d
    LEFT JOIN jobs j ON j.id = d.job_id
    WHERE d.supplier_id = ? AND d.is_paid = 1
    ORDER BY d.paid_date DESC`, req.params.id);
  const expensePayments = await db.all(`SELECT e.id, e.description, e.total_with_kdv as amount, e.expense_date as date,
    e.payment_method, j.title as job_title,
    'gider' as type
    FROM expenses e
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE e.supplier_id = ?
    ORDER BY e.expense_date DESC`, req.params.id);
  // Birleştir ve tarihe göre sırala
  s.transactions = [...debtPayments, ...expensePayments].sort((a, b) => {
    const da = a.date || '0000';
    const db2 = b.date || '0000';
    return db2.localeCompare(da);
  });
  res.json(s);
});

// Create supplier
router.post('/', async (req, res) => {
  const { name, contact_person, phone, email, tax_office, tax_number, address, city, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Tedarikci adi gerekli' });
  const r = await db.run(`INSERT INTO suppliers (name, contact_person, phone, email, tax_office, tax_number, address, city, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, name, contact_person || '', phone || '', email || '', tax_office || '', tax_number || '', address || '', city || '', note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update supplier
router.put('/:id', async (req, res) => {
  const { name, contact_person, phone, email, tax_office, tax_number, address, city, note } = req.body;
  await db.run(`UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, tax_office=?, tax_number=?, address=?, city=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`,
    name, contact_person || '', phone || '', email || '', tax_office || '', tax_number || '', address || '', city || '', note || '', req.params.id);
  res.json({ success: true });
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM suppliers WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// Add debt
router.post('/:id/debts', async (req, res) => {
  const { description, amount, kdv_rate, debt_date, due_date, note, job_id } = req.body;
  if (!amount || !debt_date) return res.status(400).json({ error: 'Tutar ve tarih gerekli' });
  const rate = kdv_rate || 20;
  const total_with_kdv = Math.round(amount * (1 + rate / 100) * 100) / 100;
  const r = await db.run(`INSERT INTO supplier_debts (supplier_id, description, amount, kdv_rate, total_with_kdv, debt_date, due_date, note, job_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, req.params.id, description || '', amount, rate, total_with_kdv, debt_date, due_date || null, note || '', job_id || null);
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update debt
router.put('/debts/:debtId', async (req, res) => {
  const { description, amount, kdv_rate, debt_date, due_date, note } = req.body;
  const rate = kdv_rate || 20;
  const total_with_kdv = Math.round(amount * (1 + rate / 100) * 100) / 100;
  await db.run(`UPDATE supplier_debts SET description=?, amount=?, kdv_rate=?, total_with_kdv=?, debt_date=?, due_date=?, note=? WHERE id=?`,
    description || '', amount, rate, total_with_kdv, debt_date, due_date || null, note || '', req.params.debtId);
  res.json({ success: true });
});

// Pay debt
router.put('/debts/:debtId/pay', async (req, res) => {
  const { payment_method } = req.body;
  await db.run(`UPDATE supplier_debts SET is_paid = 1, paid_date = date('now','localtime'), payment_method = ? WHERE id = ?`,
    payment_method || 'nakit', req.params.debtId);
  res.json({ success: true });
});

// Delete debt
router.delete('/debts/:debtId', async (req, res) => {
  await db.run('DELETE FROM supplier_debts WHERE id = ?', req.params.debtId);
  res.json({ success: true });
});

module.exports = router;
