const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Create payment
router.post('/', (req, res) => {
  const { job_id, amount, payment_date, method, note } = req.body;
  if (!job_id || !amount || !payment_date) return res.status(400).json({ error: 'Is, tutar ve tarih gerekli' });
  const job = db.prepare('SELECT customer_id, title FROM jobs WHERE id = ?').get(job_id);
  const customer_id = job ? job.customer_id : null;
  const r = db.prepare('INSERT INTO payments (job_id, customer_id, amount, payment_date, method, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(job_id, customer_id, amount, payment_date, method || 'nakit', note || '');

  // Otomatik gelir kaydı oluştur
  const kdv_rate = 20;
  const kdv_amount = Math.round(amount * kdv_rate / 100 * 100) / 100;
  const total_with_kdv = Math.round((amount + kdv_amount) * 100) / 100;
  const description = job ? `${job.title} - Tahsilat` : 'Tahsilat';
  db.prepare(`INSERT INTO incomes (customer_id, job_id, description, category, amount, kdv_rate, kdv_amount, total_with_kdv, income_date, method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(customer_id, job_id, description, 'Is Tahsilati', amount, kdv_rate, kdv_amount, total_with_kdv, payment_date, method || 'nakit', note || '');

  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update payment
router.put('/:id', (req, res) => {
  const { amount, payment_date, method, note } = req.body;
  db.prepare('UPDATE payments SET amount=?, payment_date=?, method=?, note=? WHERE id=?')
    .run(amount, payment_date, method || 'nakit', note || '', req.params.id);
  res.json({ success: true });
});

// Delete payment (ilgili otomatik gelir kaydını da sil)
router.delete('/:id', (req, res) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  // İlgili otomatik gelir kaydını sil
  if (payment) {
    db.prepare('DELETE FROM incomes WHERE job_id = ? AND amount = ? AND income_date = ? AND category = ?')
      .run(payment.job_id, payment.amount, payment.payment_date, 'Is Tahsilati');
  }
  res.json({ success: true });
});

module.exports = router;
