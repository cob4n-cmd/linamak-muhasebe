const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Categories
router.get('/categories', async (req, res) => {
  res.json(await db.all('SELECT * FROM expense_categories ORDER BY name'));
});

// List expenses
router.get('/', async (req, res) => {
  const { job_id, month, year, category } = req.query;
  let sql = `SELECT e.*, s.name as supplier_name, j.title as job_title
    FROM expenses e LEFT JOIN suppliers s ON e.supplier_id = s.id LEFT JOIN jobs j ON e.job_id = j.id WHERE 1=1`;
  const params = [];
  if (job_id) { sql += ` AND e.job_id = ?`; params.push(job_id); }
  if (category) { sql += ` AND e.category = ?`; params.push(category); }
  if (year) { sql += ` AND strftime('%Y', e.expense_date) = ?`; params.push(year); }
  if (month) { sql += ` AND strftime('%m', e.expense_date) = ?`; params.push(String(month).padStart(2, '0')); }
  sql += ` ORDER BY e.expense_date DESC`;
  res.json(await db.all(sql, ...params));
});

// Create expense
router.post('/', async (req, res) => {
  const { job_id, supplier_id, category, description, amount, kdv_rate, expense_date, is_paid, payment_method } = req.body;
  if (!category || !amount || !expense_date) return res.status(400).json({ error: 'Kategori, tutar ve tarih gerekli' });
  const rate = kdv_rate || 20;
  const kdv_amount = Math.round(amount * rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((amount + kdv_amount) * 100) / 100;
  const r = await db.run(`INSERT INTO expenses (job_id, supplier_id, category, description, amount, kdv_rate, kdv_amount, total_with_kdv, expense_date, is_paid, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    job_id || null, supplier_id || null, category, description || '', amount, rate, kdv_amount, total_with_kdv,
    expense_date, is_paid ? 1 : 0, payment_method || 'nakit'
  );
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update expense
router.put('/:id', async (req, res) => {
  const { job_id, supplier_id, category, description, amount, kdv_rate, expense_date, is_paid, payment_method } = req.body;
  const rate = kdv_rate || 20;
  const kdv_amount = Math.round(amount * rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((amount + kdv_amount) * 100) / 100;
  await db.run(`UPDATE expenses SET job_id=?, supplier_id=?, category=?, description=?, amount=?, kdv_rate=?, kdv_amount=?, total_with_kdv=?, expense_date=?, is_paid=?, payment_method=? WHERE id=?`,
    job_id || null, supplier_id || null, category, description || '', amount, rate, kdv_amount, total_with_kdv, expense_date, is_paid ? 1 : 0, payment_method || 'nakit', req.params.id);
  res.json({ success: true });
});

// Delete expense
router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM expenses WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
