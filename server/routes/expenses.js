const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// KDV hesaplama helper: KDV sadece faturali kisma uygulanir
function calcExpense(faturali_tutar, faturasiz_tutar, kdv_rate) {
  const ft = Number(faturali_tutar) || 0;
  const fst = Number(faturasiz_tutar) || 0;
  const rate = Number(kdv_rate) || 20;
  const amount = ft + fst; // toplam net tutar
  const kdv_amount = Math.round(ft * rate / 100 * 100) / 100; // KDV sadece faturaliya
  const total_with_kdv = Math.round((ft + kdv_amount + fst) * 100) / 100;
  return { amount, kdv_amount, total_with_kdv, rate, ft, fst };
}

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
  const { job_id, supplier_id, category, description, faturali_tutar, faturasiz_tutar, amount: legacyAmount, kdv_rate, expense_date, is_paid, payment_method } = req.body;
  if (!category || !expense_date) return res.status(400).json({ error: 'Kategori ve tarih gerekli' });

  // Eski format uyumlulugu: sadece amount gonderilmisse faturasiz olarak kabul et
  let ft = Number(faturali_tutar) || 0;
  let fst = Number(faturasiz_tutar) || 0;
  if (ft === 0 && fst === 0 && legacyAmount) {
    fst = Number(legacyAmount) || 0;
  }
  if (ft + fst <= 0) return res.status(400).json({ error: 'Tutar gerekli' });

  const { amount, kdv_amount, total_with_kdv, rate } = calcExpense(ft, fst, kdv_rate);

  const r = await db.run(`INSERT INTO expenses (job_id, supplier_id, category, description, amount, kdv_rate, kdv_amount, total_with_kdv, expense_date, is_paid, payment_method, faturali_tutar, faturasiz_tutar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    job_id || null, supplier_id || null, category, description || '', amount, rate, kdv_amount, total_with_kdv,
    expense_date, is_paid ? 1 : 0, payment_method || 'nakit', ft, fst
  );
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update expense
router.put('/:id', async (req, res) => {
  const { job_id, supplier_id, category, description, faturali_tutar, faturasiz_tutar, amount: legacyAmount, kdv_rate, expense_date, is_paid, payment_method } = req.body;

  let ft = Number(faturali_tutar) || 0;
  let fst = Number(faturasiz_tutar) || 0;
  if (ft === 0 && fst === 0 && legacyAmount) {
    fst = Number(legacyAmount) || 0;
  }

  const { amount, kdv_amount, total_with_kdv, rate } = calcExpense(ft, fst, kdv_rate);

  await db.run(`UPDATE expenses SET job_id=?, supplier_id=?, category=?, description=?, amount=?, kdv_rate=?, kdv_amount=?, total_with_kdv=?, expense_date=?, is_paid=?, payment_method=?, faturali_tutar=?, faturasiz_tutar=? WHERE id=?`,
    job_id || null, supplier_id || null, category, description || '', amount, rate, kdv_amount, total_with_kdv, expense_date, is_paid ? 1 : 0, payment_method || 'nakit', ft, fst, req.params.id);
  res.json({ success: true });
});

// Delete expense
router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM expenses WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
