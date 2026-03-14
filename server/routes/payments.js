const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Create payment
router.post('/', async (req, res) => {
  const { job_id, amount, payment_date, method, note } = req.body;
  if (!job_id || !amount || !payment_date) return res.status(400).json({ error: 'Is, tutar ve tarih gerekli' });
  const job = await db.get('SELECT customer_id, title FROM jobs WHERE id = ?', job_id);
  const customer_id = job ? job.customer_id : null;
  const r = await db.run('INSERT INTO payments (job_id, customer_id, amount, payment_date, method, note) VALUES (?, ?, ?, ?, ?, ?)',
    job_id, customer_id, amount, payment_date, method || 'nakit', note || '');

  // Otomatik gelir kaydı oluştur
  const kdv_rate = 20;
  const kdv_amount = Math.round(amount * kdv_rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((amount + kdv_amount) * 100) / 100;
  const description = job ? `${job.title} - Tahsilat` : 'Tahsilat';
  await db.run(`INSERT INTO incomes (customer_id, job_id, description, category, amount, kdv_rate, kdv_amount, total_with_kdv, income_date, method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    customer_id, job_id, description, 'Is Tahsilati', amount, kdv_rate, kdv_amount, total_with_kdv, payment_date, method || 'nakit', note || '');

  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update payment
router.put('/:id', async (req, res) => {
  const { amount, payment_date, method, note } = req.body;
  await db.run('UPDATE payments SET amount=?, payment_date=?, method=?, note=? WHERE id=?',
    amount, payment_date, method || 'nakit', note || '', req.params.id);
  res.json({ success: true });
});

// Delete payment (ilgili otomatik gelir kaydını da sil)
router.delete('/:id', async (req, res) => {
  const payment = await db.get('SELECT * FROM payments WHERE id = ?', req.params.id);
  await db.run('DELETE FROM payments WHERE id = ?', req.params.id);
  // İlgili otomatik gelir kaydını sil
  if (payment) {
    await db.run('DELETE FROM incomes WHERE job_id = ? AND amount = ? AND income_date = ? AND category = ?',
      payment.job_id, payment.amount, payment.payment_date, 'Is Tahsilati');
  }
  res.json({ success: true });
});

module.exports = router;
