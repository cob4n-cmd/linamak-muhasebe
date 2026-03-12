const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Monthly KDV summary
router.get('/summary/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const m = String(month).padStart(2, '0');

  // Hesaplanan KDV (satis/gelir KDV'si)
  const incomeKdv = db.prepare(`SELECT COALESCE(SUM(kdv_amount), 0) as total FROM incomes
    WHERE strftime('%Y', income_date) = ? AND strftime('%m', income_date) = ? AND invoice_no != ''`).get(year, m).total;

  // Indirilecek KDV (alis/gider KDV'si)
  const expenseKdv = db.prepare(`SELECT COALESCE(SUM(kdv_amount), 0) as total FROM expenses
    WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`).get(year, m).total;

  // Faturali is KDV'leri (gelir tarafinda)
  const jobKdv = db.prepare(`SELECT COALESCE(SUM(j.contract_value * j.kdv_rate / 100), 0) as total FROM jobs j
    WHERE j.invoice_status = 'faturali' AND strftime('%Y', j.start_date) = ? AND strftime('%m', j.start_date) = ?`).get(year, m).total;

  const hesaplananKdv = Math.round((incomeKdv + jobKdv) * 100) / 100;
  const indirilecekKdv = Math.round(expenseKdv * 100) / 100;
  const odenecekKdv = Math.round((hesaplananKdv - indirilecekKdv) * 100) / 100;

  // Detay islemleri
  const incomeDetails = db.prepare(`SELECT 'gelir' as type, description, amount, kdv_rate, kdv_amount, total_with_kdv, income_date as date, invoice_no
    FROM incomes WHERE strftime('%Y', income_date) = ? AND strftime('%m', income_date) = ? AND invoice_no != ''`).all(year, m);
  const expenseDetails = db.prepare(`SELECT 'gider' as type, description, amount, kdv_rate, kdv_amount, total_with_kdv, expense_date as date, '' as invoice_no
    FROM expenses WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`).all(year, m);

  res.json({ hesaplananKdv, indirilecekKdv, odenecekKdv, details: [...incomeDetails, ...expenseDetails].sort((a, b) => b.date.localeCompare(a.date)) });
});

// Annual KDV summary
router.get('/summary/:year', (req, res) => {
  const { year } = req.params;
  const months = [];
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    const incomeKdv = db.prepare(`SELECT COALESCE(SUM(kdv_amount), 0) as total FROM incomes
      WHERE strftime('%Y', income_date) = ? AND strftime('%m', income_date) = ? AND invoice_no != ''`).get(year, m).total;
    const jobKdv = db.prepare(`SELECT COALESCE(SUM(j.contract_value * j.kdv_rate / 100), 0) as total FROM jobs j
      WHERE j.invoice_status = 'faturali' AND strftime('%Y', j.start_date) = ? AND strftime('%m', j.start_date) = ?`).get(year, m).total;
    const expenseKdv = db.prepare(`SELECT COALESCE(SUM(kdv_amount), 0) as total FROM expenses
      WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`).get(year, m).total;
    months.push({
      month: i, hesaplanan: Math.round((incomeKdv + jobKdv) * 100) / 100,
      indirilecek: Math.round(expenseKdv * 100) / 100,
      odenecek: Math.round((incomeKdv + jobKdv - expenseKdv) * 100) / 100
    });
  }
  res.json(months);
});

module.exports = router;
