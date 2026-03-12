const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List cards
router.get('/', (req, res) => {
  const cards = db.prepare(`SELECT cc.*,
    COALESCE((SELECT SUM(CASE WHEN t.is_paid = 0 THEN t.amount ELSE 0 END) FROM credit_card_transactions t WHERE t.card_id = cc.id), 0) as current_debt,
    COALESCE((SELECT SUM(CASE WHEN t.is_paid = 0 THEN t.installment_amount * t.remaining_installments ELSE 0 END) FROM credit_card_transactions t WHERE t.card_id = cc.id), 0) as total_remaining
    FROM credit_cards cc ORDER BY cc.bank_name`).all();
  res.json(cards);
});

// Single card
router.get('/:id', (req, res) => {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Kart bulunamadi' });
  card.transactions = db.prepare('SELECT * FROM credit_card_transactions WHERE card_id = ? ORDER BY transaction_date DESC').all(req.params.id);
  res.json(card);
});

// Create card
router.post('/', (req, res) => {
  const { bank_name, card_name, last_four_digits, credit_limit, closing_day, due_day, note } = req.body;
  if (!bank_name) return res.status(400).json({ error: 'Banka adi gerekli' });
  const r = db.prepare(`INSERT INTO credit_cards (bank_name, card_name, last_four_digits, credit_limit, closing_day, due_day, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(bank_name, card_name || '', last_four_digits || '', credit_limit || 0, closing_day || 1, due_day || 10, note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update card
router.put('/:id', (req, res) => {
  const { bank_name, card_name, last_four_digits, credit_limit, closing_day, due_day, note } = req.body;
  db.prepare(`UPDATE credit_cards SET bank_name=?, card_name=?, last_four_digits=?, credit_limit=?, closing_day=?, due_day=?, note=? WHERE id=?`)
    .run(bank_name, card_name || '', last_four_digits || '', credit_limit || 0, closing_day || 1, due_day || 10, note || '', req.params.id);
  res.json({ success: true });
});

// Delete card
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM credit_cards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Add transaction
router.post('/:id/transactions', (req, res) => {
  const { description, amount, transaction_date, installment_count, category, note } = req.body;
  if (!description || !amount || !transaction_date) return res.status(400).json({ error: 'Aciklama, tutar ve tarih gerekli' });
  const ic = installment_count || 1;
  const ia = Math.round(amount / ic * 100) / 100;
  const r = db.prepare(`INSERT INTO credit_card_transactions (card_id, description, amount, transaction_date, installment_count, installment_amount, remaining_installments, category, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, description, amount, transaction_date, ic, ia, ic, category || 'Genel', note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update transaction
router.put('/transactions/:tid', (req, res) => {
  const { description, amount, transaction_date, installment_count, category, note } = req.body;
  const ic = installment_count || 1;
  const ia = Math.round(amount / ic * 100) / 100;
  db.prepare(`UPDATE credit_card_transactions SET description=?, amount=?, transaction_date=?, installment_count=?, installment_amount=?, category=?, note=? WHERE id=?`)
    .run(description, amount, transaction_date, ic, ia, category || 'Genel', note || '', req.params.tid);
  res.json({ success: true });
});

// Pay installment
router.put('/transactions/:tid/pay', (req, res) => {
  const t = db.prepare('SELECT * FROM credit_card_transactions WHERE id = ?').get(req.params.tid);
  if (!t) return res.status(404).json({ error: 'Islem bulunamadi' });
  const remaining = t.remaining_installments - 1;
  const isPaid = remaining <= 0 ? 1 : 0;
  db.prepare('UPDATE credit_card_transactions SET remaining_installments = ?, is_paid = ? WHERE id = ?')
    .run(Math.max(0, remaining), isPaid, req.params.tid);
  res.json({ success: true, remaining });
});

// Delete transaction
router.delete('/transactions/:tid', (req, res) => {
  db.prepare('DELETE FROM credit_card_transactions WHERE id = ?').run(req.params.tid);
  res.json({ success: true });
});

module.exports = router;
