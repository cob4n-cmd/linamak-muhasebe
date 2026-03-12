const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List assets
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM assets ORDER BY type, name').all());
});

// Balance sheet
router.get('/balance-sheet', (req, res) => {
  const assets = db.prepare('SELECT type, SUM(value) as total FROM assets GROUP BY type ORDER BY total DESC').all();
  const totalAssets = db.prepare('SELECT COALESCE(SUM(value), 0) as total FROM assets').get().total;
  const supplierDebt = db.prepare('SELECT COALESCE(SUM(total_with_kdv), 0) as total FROM supplier_debts WHERE is_paid = 0').get().total;
  const ccDebt = db.prepare(`SELECT COALESCE(SUM(installment_amount * remaining_installments), 0) as total FROM credit_card_transactions WHERE is_paid = 0`).get().total;
  const totalLiabilities = supplierDebt + ccDebt;
  res.json({ assets, totalAssets, supplierDebt, ccDebt, totalLiabilities, netWorth: totalAssets - totalLiabilities });
});

// Create asset
router.post('/', (req, res) => {
  const { name, type, value, description, acquisition_date, note } = req.body;
  if (!name || value === undefined) return res.status(400).json({ error: 'Ad ve deger gerekli' });
  const r = db.prepare('INSERT INTO assets (name, type, value, description, acquisition_date, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, type || 'diger', value, description || '', acquisition_date || null, note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update asset
router.put('/:id', (req, res) => {
  const { name, type, value, description, acquisition_date, note } = req.body;
  db.prepare(`UPDATE assets SET name=?, type=?, value=?, description=?, acquisition_date=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, type || 'diger', value, description || '', acquisition_date || null, note || '', req.params.id);
  res.json({ success: true });
});

// Delete asset
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
