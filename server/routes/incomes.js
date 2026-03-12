const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Categories
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM income_categories ORDER BY name').all());
});

// List incomes
router.get('/', (req, res) => {
  const { month, year, category, customer_id } = req.query;
  let sql = `SELECT i.*, c.name as customer_name, j.title as job_title
    FROM incomes i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN jobs j ON i.job_id = j.id WHERE 1=1`;
  const params = [];
  if (customer_id) { sql += ` AND i.customer_id = ?`; params.push(customer_id); }
  if (category) { sql += ` AND i.category = ?`; params.push(category); }
  if (year) { sql += ` AND strftime('%Y', i.income_date) = ?`; params.push(year); }
  if (month) { sql += ` AND strftime('%m', i.income_date) = ?`; params.push(String(month).padStart(2, '0')); }
  sql += ` ORDER BY i.income_date DESC`;
  res.json(db.prepare(sql).all(...params));
});

// Summary
router.get('/summary', (req, res) => {
  const { year } = req.query;
  const y = year || new Date().getFullYear().toString();
  const monthly = db.prepare(`SELECT strftime('%m', income_date) as month,
    SUM(amount) as total, SUM(kdv_amount) as total_kdv, SUM(total_with_kdv) as total_with_kdv, COUNT(*) as count
    FROM incomes WHERE strftime('%Y', income_date) = ? GROUP BY month ORDER BY month`).all(y);
  const byCategory = db.prepare(`SELECT category, SUM(total_with_kdv) as total, COUNT(*) as count
    FROM incomes WHERE strftime('%Y', income_date) = ? GROUP BY category ORDER BY total DESC`).all(y);
  res.json({ monthly, byCategory });
});

// Create income
router.post('/', (req, res) => {
  const { customer_id, job_id, description, category, amount, kdv_rate, income_date, method, invoice_no, note } = req.body;
  if (!description || !amount || !income_date) return res.status(400).json({ error: 'Aciklama, tutar ve tarih gerekli' });
  const rate = kdv_rate || 20;
  const kdv_amount = Math.round(amount * rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((amount + kdv_amount) * 100) / 100;
  const r = db.prepare(`INSERT INTO incomes (customer_id, job_id, description, category, amount, kdv_rate, kdv_amount, total_with_kdv, income_date, method, invoice_no, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    customer_id || null, job_id || null, description, category || 'Genel', amount, rate, kdv_amount, total_with_kdv,
    income_date, method || 'nakit', invoice_no || '', note || ''
  );
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update income
router.put('/:id', (req, res) => {
  const { customer_id, job_id, description, category, amount, kdv_rate, income_date, method, invoice_no, note } = req.body;
  const rate = kdv_rate || 20;
  const kdv_amount = Math.round(amount * rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((amount + kdv_amount) * 100) / 100;
  db.prepare(`UPDATE incomes SET customer_id=?, job_id=?, description=?, category=?, amount=?, kdv_rate=?, kdv_amount=?, total_with_kdv=?, income_date=?, method=?, invoice_no=?, note=? WHERE id=?`)
    .run(customer_id || null, job_id || null, description, category || 'Genel', amount, rate, kdv_amount, total_with_kdv, income_date, method || 'nakit', invoice_no || '', note || '', req.params.id);
  res.json({ success: true });
});

// Delete income
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM incomes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
