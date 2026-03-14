const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Stats
router.get('/stats', async (req, res) => {
  const totalIncome = (await db.get('SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM incomes')).t;
  const totalPayments = (await db.get('SELECT COALESCE(SUM(amount), 0) as t FROM payments')).t;
  const totalExpense = (await db.get('SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM expenses')).t;
  const totalRevenue = totalIncome + totalPayments;
  const profit = totalRevenue - totalExpense;
  const supplierDebt = (await db.get('SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM supplier_debts WHERE is_paid = 0')).t;
  const ccDebt = (await db.get('SELECT COALESCE(SUM(installment_amount * remaining_installments), 0) as t FROM credit_card_transactions WHERE is_paid = 0')).t;
  const activeJobs = (await db.get("SELECT COUNT(*) as c FROM jobs WHERE status IN ('beklemede','devam')")).c;
  const customerCount = (await db.get('SELECT COUNT(*) as c FROM customers')).c;
  const totalContracts = (await db.get('SELECT COALESCE(SUM(contract_value_with_kdv), 0) as t FROM jobs')).t;
  const totalAssets = (await db.get('SELECT COALESCE(SUM(value), 0) as t FROM assets')).t;

  res.json({ totalRevenue, totalExpense, profit, supplierDebt, ccDebt, activeJobs, customerCount, totalContracts, totalAssets });
});

// Monthly breakdown
router.get('/monthly/:year', async (req, res) => {
  const { year } = req.params;
  const data = [];
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    const income = (await db.get(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM incomes WHERE strftime('%Y', income_date) = ? AND strftime('%m', income_date) = ?`, year, m)).t;
    const payments = (await db.get(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE strftime('%Y', payment_date) = ? AND strftime('%m', payment_date) = ?`, year, m)).t;
    const expense = (await db.get(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM expenses WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`, year, m)).t;
    const revenue = income + payments;
    data.push({ month: i, gelir: Math.round(revenue * 100) / 100, gider: Math.round(expense * 100) / 100, kar: Math.round((revenue - expense) * 100) / 100 });
  }
  res.json(data);
});

// Recent activity
router.get('/recent', async (req, res) => {
  const recentJobs = await db.all(`SELECT j.*, c.name as customer_name FROM jobs j LEFT JOIN customers c ON j.customer_id = c.id ORDER BY j.created_at DESC LIMIT 5`);
  const recentPayments = await db.all(`SELECT p.*, j.title as job_title, c.name as customer_name FROM payments p LEFT JOIN jobs j ON p.job_id = j.id LEFT JOIN customers c ON p.customer_id = c.id ORDER BY p.created_at DESC LIMIT 5`);
  const unpaidDebts = await db.all(`SELECT d.*, s.name as supplier_name FROM supplier_debts d JOIN suppliers s ON d.supplier_id = s.id WHERE d.is_paid = 0 ORDER BY d.due_date ASC, d.debt_date DESC LIMIT 5`);
  res.json({ recentJobs, recentPayments, unpaidDebts });
});

// Available years
router.get('/years', async (req, res) => {
  const rows = await db.all(`SELECT DISTINCT strftime('%Y', start_date) as y FROM jobs WHERE start_date IS NOT NULL
    UNION SELECT DISTINCT strftime('%Y', payment_date) FROM payments
    UNION SELECT DISTINCT strftime('%Y', expense_date) FROM expenses
    UNION SELECT DISTINCT strftime('%Y', income_date) FROM incomes
    ORDER BY y DESC`);
  const years = rows.map(r => r.y).filter(Boolean);
  if (years.length === 0) years.push(new Date().getFullYear().toString());
  res.json(years);
});

module.exports = router;
