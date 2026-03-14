const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List cards
router.get('/', async (req, res) => {
  const cards = await db.all(`SELECT cc.*,
    COALESCE((SELECT SUM(CASE WHEN t.is_paid = 0 THEN t.amount ELSE 0 END) FROM credit_card_transactions t WHERE t.card_id = cc.id), 0) as current_debt,
    COALESCE((SELECT SUM(CASE WHEN t.is_paid = 0 THEN t.installment_amount * t.remaining_installments ELSE 0 END) FROM credit_card_transactions t WHERE t.card_id = cc.id), 0) as total_remaining
    FROM credit_cards cc ORDER BY cc.bank_name`);
  res.json(cards);
});

// Single card
router.get('/:id', async (req, res) => {
  const card = await db.get('SELECT * FROM credit_cards WHERE id = ?', req.params.id);
  if (!card) return res.status(404).json({ error: 'Kart bulunamadi' });
  card.transactions = await db.all('SELECT * FROM credit_card_transactions WHERE card_id = ? ORDER BY transaction_date DESC', req.params.id);
  res.json(card);
});

// Create card
router.post('/', async (req, res) => {
  const { bank_name, card_name, last_four_digits, credit_limit, closing_day, due_day, note } = req.body;
  if (!bank_name) return res.status(400).json({ error: 'Banka adi gerekli' });
  const r = await db.run(`INSERT INTO credit_cards (bank_name, card_name, last_four_digits, credit_limit, closing_day, due_day, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)`, bank_name, card_name || '', last_four_digits || '', credit_limit || 0, closing_day || 1, due_day || 10, note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update card
router.put('/:id', async (req, res) => {
  const { bank_name, card_name, last_four_digits, credit_limit, closing_day, due_day, note } = req.body;
  await db.run(`UPDATE credit_cards SET bank_name=?, card_name=?, last_four_digits=?, credit_limit=?, closing_day=?, due_day=?, note=? WHERE id=?`,
    bank_name, card_name || '', last_four_digits || '', credit_limit || 0, closing_day || 1, due_day || 10, note || '', req.params.id);
  res.json({ success: true });
});

// Delete card
router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM credit_cards WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// Add transaction
router.post('/:id/transactions', async (req, res) => {
  const { description, amount, transaction_date, installment_count, category, note } = req.body;
  if (!description || !amount || !transaction_date) return res.status(400).json({ error: 'Aciklama, tutar ve tarih gerekli' });
  const ic = installment_count || 1;
  const ia = Math.round(amount / ic * 100) / 100;
  const r = await db.run(`INSERT INTO credit_card_transactions (card_id, description, amount, transaction_date, installment_count, installment_amount, remaining_installments, category, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, req.params.id, description, amount, transaction_date, ic, ia, ic, category || 'Genel', note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update transaction
router.put('/transactions/:tid', async (req, res) => {
  const { description, amount, transaction_date, installment_count, category, note } = req.body;
  const ic = installment_count || 1;
  const ia = Math.round(amount / ic * 100) / 100;
  await db.run(`UPDATE credit_card_transactions SET description=?, amount=?, transaction_date=?, installment_count=?, installment_amount=?, category=?, note=? WHERE id=?`,
    description, amount, transaction_date, ic, ia, category || 'Genel', note || '', req.params.tid);
  res.json({ success: true });
});

// Pay installment
router.put('/transactions/:tid/pay', async (req, res) => {
  const t = await db.get('SELECT * FROM credit_card_transactions WHERE id = ?', req.params.tid);
  if (!t) return res.status(404).json({ error: 'Islem bulunamadi' });
  const remaining = t.remaining_installments - 1;
  const isPaid = remaining <= 0 ? 1 : 0;
  await db.run('UPDATE credit_card_transactions SET remaining_installments = ?, is_paid = ? WHERE id = ?',
    Math.max(0, remaining), isPaid, req.params.tid);
  res.json({ success: true, remaining });
});

// Delete transaction
router.delete('/transactions/:tid', async (req, res) => {
  await db.run('DELETE FROM credit_card_transactions WHERE id = ?', req.params.tid);
  res.json({ success: true });
});

module.exports = router;
