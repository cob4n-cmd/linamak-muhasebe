const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

// List customers
router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = `SELECT c.*,
    COALESCE((SELECT SUM(j.contract_value_with_kdv) FROM jobs j WHERE j.customer_id = c.id), 0) as total_contract,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.customer_id = c.id), 0) as total_paid,
    COALESCE((SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id), 0) as job_count
    FROM customers c`;
  const params = [];
  if (search) {
    sql += ` WHERE c.name LIKE ? OR c.contact_person LIKE ? OR c.phone LIKE ?`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY c.name`;
  res.json(db.prepare(sql).all(...params));
});

// Single customer
router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Musteri bulunamadi' });
  const jobs = db.prepare(`SELECT j.*,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.job_id = j.id), 0) as total_paid,
    COALESCE((SELECT SUM(e.total_with_kdv) FROM expenses e WHERE e.job_id = j.id), 0) as total_expense
    FROM jobs j WHERE j.customer_id = ? ORDER BY j.created_at DESC`).all(req.params.id);
  const payments = db.prepare(`SELECT p.*, j.title as job_title FROM payments p
    LEFT JOIN jobs j ON p.job_id = j.id
    WHERE p.customer_id = ? ORDER BY p.payment_date DESC`).all(req.params.id);
  res.json({ ...c, jobs, payments });
});

// Create customer
router.post('/', (req, res) => {
  const { name, contact_person, phone, email, tax_office, tax_number, address, city, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Musteri adi gerekli' });
  const r = db.prepare(`INSERT INTO customers (name, contact_person, phone, email, tax_office, tax_number, address, city, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, contact_person || '', phone || '', email || '', tax_office || '', tax_number || '', address || '', city || '', note || '');
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

// Update customer
router.put('/:id', (req, res) => {
  const { name, contact_person, phone, email, tax_office, tax_number, address, city, note } = req.body;
  db.prepare(`UPDATE customers SET name=?, contact_person=?, phone=?, email=?, tax_office=?, tax_number=?, address=?, city=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, contact_person || '', phone || '', email || '', tax_office || '', tax_number || '', address || '', city || '', note || '', req.params.id);
  res.json({ success: true });
});

// Delete customer
router.delete('/:id', (req, res) => {
  const jobs = db.prepare('SELECT COUNT(*) as cnt FROM jobs WHERE customer_id = ?').get(req.params.id);
  if (jobs.cnt > 0) return res.status(400).json({ error: `Bu musteriye ait ${jobs.cnt} is bulunmaktadir. Once isleri silin.` });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
