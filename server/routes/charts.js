const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// Revenue trend
router.get('/revenue-trend/:year', (req, res) => {
  const { year } = req.params;
  const data = [];
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    const income = db.prepare(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM incomes WHERE strftime('%Y', income_date) = ? AND strftime('%m', income_date) = ?`).get(year, m).t;
    const payments = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE strftime('%Y', payment_date) = ? AND strftime('%m', payment_date) = ?`).get(year, m).t;
    const expense = db.prepare(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM expenses WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`).get(year, m).t;
    data.push({ month: i, gelir: Math.round((income + payments) * 100) / 100, gider: Math.round(expense * 100) / 100, kar: Math.round((income + payments - expense) * 100) / 100 });
  }
  res.json(data);
});

// Expense breakdown
router.get('/expense-breakdown/:year', (req, res) => {
  const { year } = req.params;
  const data = db.prepare(`SELECT category as name, SUM(total_with_kdv) as value FROM expenses
    WHERE strftime('%Y', expense_date) = ? GROUP BY category ORDER BY value DESC`).all(year);
  res.json(data);
});

// Customer ranking
router.get('/customer-ranking/:year', (req, res) => {
  const { year } = req.params;
  const data = db.prepare(`SELECT c.name, SUM(p.amount) as total FROM payments p
    JOIN customers c ON p.customer_id = c.id
    WHERE strftime('%Y', p.payment_date) = ?
    GROUP BY c.id ORDER BY total DESC LIMIT 10`).all(year);
  res.json(data);
});

// Cash flow
router.get('/cash-flow/:year', (req, res) => {
  const { year } = req.params;
  const data = [];
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    const inflow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE strftime('%Y', payment_date) = ? AND strftime('%m', payment_date) = ?`).get(year, m).t;
    const incomeFlow = db.prepare(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM incomes WHERE strftime('%Y', income_date) = ? AND strftime('%m', income_date) = ?`).get(year, m).t;
    const outflow = db.prepare(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM expenses WHERE strftime('%Y', expense_date) = ? AND strftime('%m', expense_date) = ?`).get(year, m).t;
    data.push({ month: i, giris: Math.round((inflow + incomeFlow) * 100) / 100, cikis: Math.round(outflow * 100) / 100, net: Math.round((inflow + incomeFlow - outflow) * 100) / 100 });
  }
  res.json(data);
});

// Growth comparison
router.get('/growth', (req, res) => {
  const years = db.prepare(`SELECT DISTINCT strftime('%Y', income_date) as y FROM incomes
    UNION SELECT DISTINCT strftime('%Y', payment_date) FROM payments
    UNION SELECT DISTINCT strftime('%Y', expense_date) FROM expenses ORDER BY y DESC LIMIT 3`).all().map(r => r.y).filter(Boolean);

  const data = years.map(year => {
    const income = db.prepare(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM incomes WHERE strftime('%Y', income_date) = ?`).get(year).t;
    const payments = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM payments WHERE strftime('%Y', payment_date) = ?`).get(year).t;
    const expense = db.prepare(`SELECT COALESCE(SUM(total_with_kdv), 0) as t FROM expenses WHERE strftime('%Y', expense_date) = ?`).get(year).t;
    return { year, gelir: Math.round((income + payments) * 100) / 100, gider: Math.round(expense * 100) / 100 };
  });
  res.json(data);
});

module.exports = router;
