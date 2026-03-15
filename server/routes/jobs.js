const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List jobs
router.get('/', async (req, res) => {
  const { status, search, month, year } = req.query;
  let sql = `SELECT j.*, c.name as customer_name,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.job_id = j.id), 0) as total_paid,
    COALESCE((SELECT SUM(e.total_with_kdv) FROM expenses e WHERE e.job_id = j.id), 0) as total_expense
    FROM jobs j LEFT JOIN customers c ON j.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (status && status !== 'all') { sql += ` AND j.status = ?`; params.push(status); }
  if (search) { sql += ` AND (j.title LIKE ? OR c.name LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  if (year) { sql += ` AND strftime('%Y', j.start_date) = ?`; params.push(year); }
  if (month) { sql += ` AND strftime('%m', j.start_date) = ?`; params.push(String(month).padStart(2, '0')); }
  sql += ` ORDER BY j.created_at DESC`;
  res.json(await db.all(sql, ...params));
});

// Single job
router.get('/:id', async (req, res) => {
  const job = await db.get(`SELECT j.*, c.name as customer_name FROM jobs j LEFT JOIN customers c ON j.customer_id = c.id WHERE j.id = ?`, req.params.id);
  if (!job) return res.status(404).json({ error: 'Is bulunamadi' });
  job.payments = await db.all('SELECT * FROM payments WHERE job_id = ? ORDER BY payment_date DESC', req.params.id);
  job.expenses = await db.all(`SELECT e.*, s.name as supplier_name FROM expenses e LEFT JOIN suppliers s ON e.supplier_id = s.id WHERE e.job_id = ? ORDER BY e.expense_date DESC`, req.params.id);
  res.json(job);
});

// Create job
router.post('/', async (req, res) => {
  const { title, customer_id, customer_name, description, status, invoice_no, faturali_tutar, faturasiz_tutar, kdv_rate, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Is basligi gerekli' });

  let cid = customer_id;
  if (!cid && customer_name) {
    const existing = await db.get('SELECT id FROM customers WHERE name = ?', customer_name);
    if (existing) {
      cid = existing.id;
    } else {
      const r = await db.run('INSERT INTO customers (name) VALUES (?)', customer_name);
      cid = Number(r.lastInsertRowid);
    }
  }

  const rate = Number(kdv_rate) || 20;
  const ft = Number(faturali_tutar) || 0;
  const fst = Number(faturasiz_tutar) || 0;
  const contract_value = ft + fst;
  const contract_value_with_kdv = Math.round((ft * (1 + rate / 100) + fst) * 100) / 100;
  const invoice_status = ft > 0 && fst > 0 ? 'karma' : ft > 0 ? 'faturali' : 'faturasiz';

  const r = await db.run(`INSERT INTO jobs (title, customer_id, description, status, invoice_status, invoice_no, contract_value, kdv_rate, contract_value_with_kdv, faturali_tutar, faturasiz_tutar, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    title, cid || null, description || '', status || 'beklemede', invoice_status, invoice_no || '',
    contract_value, rate, contract_value_with_kdv, ft, fst, start_date || null, end_date || null
  );
  res.json({ id: Number(r.lastInsertRowid), customer_id: cid, success: true });
});

// Update job
router.put('/:id', async (req, res) => {
  const { title, customer_id, customer_name, description, status, invoice_no, faturali_tutar, faturasiz_tutar, kdv_rate, start_date, end_date } = req.body;

  let cid = customer_id;
  if (!cid && customer_name) {
    const existing = await db.get('SELECT id FROM customers WHERE name = ?', customer_name);
    if (existing) { cid = existing.id; }
    else {
      const r = await db.run('INSERT INTO customers (name) VALUES (?)', customer_name);
      cid = Number(r.lastInsertRowid);
    }
  }

  const rate = Number(kdv_rate) || 20;
  const ft = Number(faturali_tutar) || 0;
  const fst = Number(faturasiz_tutar) || 0;
  const contract_value = ft + fst;
  const contract_value_with_kdv = Math.round((ft * (1 + rate / 100) + fst) * 100) / 100;
  const invoice_status = ft > 0 && fst > 0 ? 'karma' : ft > 0 ? 'faturali' : 'faturasiz';

  await db.run(`UPDATE jobs SET title=?, customer_id=?, description=?, status=?, invoice_status=?, invoice_no=?, contract_value=?, kdv_rate=?, contract_value_with_kdv=?, faturali_tutar=?, faturasiz_tutar=?, start_date=?, end_date=?, updated_at=datetime('now','localtime') WHERE id=?`,
    title, cid || null, description || '', status || 'beklemede', invoice_status, invoice_no || '', contract_value, rate, contract_value_with_kdv, ft, fst, start_date || null, end_date || null, req.params.id);
  res.json({ success: true });
});

// Delete job
router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM jobs WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
