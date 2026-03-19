const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List suppliers - borc hesaplamasi expenses tablosundan
router.get('/', async (req, res) => {
  const { search } = req.query;
  let sql = `SELECT s.*,
    COALESCE((SELECT SUM(e.total_with_kdv) FROM expenses e WHERE e.supplier_id = s.id AND e.is_paid = 0), 0) as unpaid_debt,
    COALESCE((SELECT SUM(e.total_with_kdv) FROM expenses e WHERE e.supplier_id = s.id AND e.is_paid = 1), 0) as paid_total,
    COALESCE((SELECT SUM(e.total_with_kdv) FROM expenses e WHERE e.supplier_id = s.id), 0) as total_debt,
    COALESCE((SELECT COUNT(*) FROM expenses e WHERE e.supplier_id = s.id), 0) as transaction_count
    FROM suppliers s`;
  const params = [];
  if (search) { sql += ` WHERE s.name LIKE ? OR s.contact_person LIKE ?`; params.push(`%${search}%`, `%${search}%`); }
  sql += ` ORDER BY s.name`;
  res.json(await db.all(sql, ...params));
});

// Single supplier - tum alisverisler
router.get('/:id', async (req, res) => {
  const s = await db.get('SELECT * FROM suppliers WHERE id = ?', req.params.id);
  if (!s) return res.status(404).json({ error: 'Tedarikci bulunamadi' });

  // Tum alisverisler (expenses tablosundan)
  s.expenses = await db.all(`SELECT e.*,
    j.title as job_title,
    s2.name as supplier_name
    FROM expenses e
    LEFT JOIN jobs j ON j.id = e.job_id
    LEFT JOIN suppliers s2 ON s2.id = e.supplier_id
    WHERE e.supplier_id = ? ORDER BY e.expense_date DESC`, req.params.id);

  // Ozet hesaplamalar
  s.unpaid_debt = s.expenses.filter(e => !e.is_paid).reduce((sum, e) => sum + Number(e.total_with_kdv || 0), 0);
  s.paid_total = s.expenses.filter(e => e.is_paid).reduce((sum, e) => sum + Number(e.total_with_kdv || 0), 0);
  s.total_debt = s.unpaid_debt + s.paid_total;

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

// Masraf odendi/odenmedi isaretle
router.put('/expenses/:expenseId/toggle-paid', async (req, res) => {
  const { payment_method } = req.body;
  const expense = await db.get('SELECT * FROM expenses WHERE id = ?', req.params.expenseId);
  if (!expense) return res.status(404).json({ error: 'Masraf bulunamadi' });
  const newPaid = expense.is_paid ? 0 : 1;
  await db.run('UPDATE expenses SET is_paid = ?, payment_method = ? WHERE id = ?',
    newPaid, payment_method || expense.payment_method || 'nakit', req.params.expenseId);
  res.json({ success: true, is_paid: newPaid });
});

// Masraf guncelle
router.put('/expenses/:expenseId', async (req, res) => {
  const { description, faturali_tutar, faturasiz_tutar, kdv_rate, expense_date, category, job_id } = req.body;
  const ft = Number(faturali_tutar) || 0;
  const fst = Number(faturasiz_tutar) || 0;
  const rate = Number(kdv_rate) || 20;
  const amount = ft + fst;
  const kdv_amount = Math.round(ft * rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((ft + kdv_amount + fst) * 100) / 100;
  await db.run(`UPDATE expenses SET description=?, amount=?, kdv_rate=?, kdv_amount=?, total_with_kdv=?, expense_date=?, category=?, job_id=?, faturali_tutar=?, faturasiz_tutar=? WHERE id=?`,
    description || '', amount, rate, kdv_amount, total_with_kdv, expense_date, category || 'Genel', job_id || null, ft, fst, req.params.expenseId);
  res.json({ success: true });
});

// Masraf sil (supplier detail'den)
router.delete('/expenses/:expenseId', async (req, res) => {
  await db.run('DELETE FROM expenses WHERE id = ?', req.params.expenseId);
  res.json({ success: true });
});

module.exports = router;
