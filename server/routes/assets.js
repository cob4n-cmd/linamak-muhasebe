const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List assets
router.get('/', async (req, res) => {
  res.json(await db.all('SELECT * FROM assets ORDER BY type, name'));
});

// Balance sheet
router.get('/balance-sheet', async (req, res) => {
  const assets = await db.all('SELECT type, SUM(value) as total FROM assets GROUP BY type ORDER BY total DESC');
  const totalAssetsRow = await db.get('SELECT COALESCE(SUM(value), 0) as total FROM assets');
  const totalAssets = totalAssetsRow.total;
  const supplierDebtRow = await db.get('SELECT COALESCE(SUM(total_with_kdv), 0) as total FROM supplier_debts WHERE is_paid = 0');
  const supplierDebt = supplierDebtRow.total;
  const ccDebtRow = await db.get(`SELECT COALESCE(SUM(installment_amount * remaining_installments), 0) as total FROM credit_card_transactions WHERE is_paid = 0`);
  const ccDebt = ccDebtRow.total;
  const totalLiabilities = supplierDebt + ccDebt;
  res.json({ assets, totalAssets, supplierDebt, ccDebt, totalLiabilities, netWorth: totalAssets - totalLiabilities });
});

// Create asset
router.post('/', async (req, res) => {
  const { name, type, value, description, acquisition_date, note } = req.body;
  if (!name || value === undefined) return res.status(400).json({ error: 'Ad ve deger gerekli' });
  const r = await db.run('INSERT INTO assets (name, type, value, description, acquisition_date, note) VALUES (?, ?, ?, ?, ?, ?)',
    name, type || 'diger', value, description || '', acquisition_date || null, note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update asset
router.put('/:id', async (req, res) => {
  const { name, type, value, description, acquisition_date, note } = req.body;
  await db.run(`UPDATE assets SET name=?, type=?, value=?, description=?, acquisition_date=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`,
    name, type || 'diger', value, description || '', acquisition_date || null, note || '', req.params.id);
  res.json({ success: true });
});

// Delete asset
router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM assets WHERE id = ?', req.params.id);
  res.json({ success: true });
});

module.exports = router;
