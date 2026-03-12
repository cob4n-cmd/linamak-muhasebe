const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Create payment
router.post('/', (req, res) => {
  const { job_id, amount, payment_date, method, note } = req.body;
  if (!job_id || !amount || !payment_date) return res.status(400).json({ error: 'Is, tutar ve tarih gerekli' });
  const job = db.prepare('SELECT customer_id FROM jobs WHERE id = ?').get(job_id);
  const customer_id = job ? job.customer_id : null;
  const r = db.prepare('INSERT INTO payments (job_id, customer_id, amount, payment_date, method, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(job_id, customer_id, amount, payment_date, method || 'nakit', note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update payment
router.put('/:id', (req, res) => {
  const { amount, payment_date, method, note } = req.body;
  db.prepare('UPDATE payments SET amount=?, payment_date=?, method=?, note=? WHERE id=?')
    .run(amount, payment_date, method || 'nakit', note || '', req.params.id);
  res.json({ success: true });
});

// Delete payment
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
