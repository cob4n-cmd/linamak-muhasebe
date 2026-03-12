const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List suppliers
router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = `SELECT s.*,
    COALESCE((SELECT SUM(d.total_with_kdv) FROM supplier_debts d WHERE d.supplier_id = s.id AND d.is_paid = 0), 0) as unpaid_debt,
    COALESCE((SELECT SUM(d.total_with_kdv) FROM supplier_debts d WHERE d.supplier_id = s.id), 0) as total_debt
    FROM suppliers s`;
  const params = [];
  if (search) { sql += ` WHERE s.name LIKE ? OR s.contact_person LIKE ?`; params.push(`%${search}%`, `%${search}%`); }
  sql += ` ORDER BY s.name`;
  res.json(db.prepare(sql).all(...params));
});

// Single supplier
router.get('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Tedarikci bulunamadi' });
  s.debts = db.prepare('SELECT * FROM supplier_debts WHERE supplier_id = ? ORDER BY debt_date DESC').all(req.params.id);
  res.json(s);
});

// Create supplier
router.post('/', (req, res) => {
  const { name, contact_person, phone, email, tax_office, tax_number, address, city, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Tedarikci adi gerekli' });
  const r = db.prepare(`INSERT INTO suppliers (name, contact_person, phone, email, tax_office, tax_number, address, city, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, contact_person || '', phone || '', email || '', tax_office || '', tax_number || '', address || '', city || '', note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update supplier
router.put('/:id', (req, res) => {
  const { name, contact_person, phone, email, tax_office, tax_number, address, city, note } = req.body;
  db.prepare(`UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, tax_office=?, tax_number=?, address=?, city=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, contact_person || '', phone || '', email || '', tax_office || '', tax_number || '', address || '', city || '', note || '', req.params.id);
  res.json({ success: true });
});

// Delete supplier
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Add debt
router.post('/:id/debts', (req, res) => {
  const { description, amount, kdv_rate, debt_date, due_date, note } = req.body;
  if (!amount || !debt_date) return res.status(400).json({ error: 'Tutar ve tarih gerekli' });
  const rate = kdv_rate || 20;
  const total_with_kdv = Math.round(amount * (1 + rate / 100) * 100) / 100;
  const r = db.prepare(`INSERT INTO supplier_debts (supplier_id, description, amount, kdv_rate, total_with_kdv, debt_date, due_date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, description || '', amount, rate, total_with_kdv, debt_date, due_date || null, note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update debt
router.put('/debts/:debtId', (req, res) => {
  const { description, amount, kdv_rate, debt_date, due_date, note } = req.body;
  const rate = kdv_rate || 20;
  const total_with_kdv = Math.round(amount * (1 + rate / 100) * 100) / 100;
  db.prepare(`UPDATE supplier_debts SET description=?, amount=?, kdv_rate=?, total_with_kdv=?, debt_date=?, due_date=?, note=? WHERE id=?`)
    .run(description || '', amount, rate, total_with_kdv, debt_date, due_date || null, note || '', req.params.debtId);
  res.json({ success: true });
});

// Pay debt
router.put('/debts/:debtId/pay', (req, res) => {
  const { payment_method } = req.body;
  db.prepare(`UPDATE supplier_debts SET is_paid = 1, paid_date = date('now','localtime'), payment_method = ? WHERE id = ?`)
    .run(payment_method || 'nakit', req.params.debtId);
  res.json({ success: true });
});

// Delete debt
router.delete('/debts/:debtId', (req, res) => {
  db.prepare('DELETE FROM supplier_debts WHERE id = ?').run(req.params.debtId);
  res.json({ success: true });
});

module.exports = router;
