const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, adminOnly, SECRET } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

// Me
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, role, name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });
  res.json(user);
});

// List users (admin)
router.get('/users', auth, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, username, role, name, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// Create user (admin)
router.post('/users', auth, adminOnly, (req, res) => {
  const { username, password, role = 'staff', name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)').run(username, hash, role, name || username);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Bu kullanici adi zaten mevcut' });
  }
});

// Change password
router.put('/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Eski ve yeni sifre gerekli' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Mevcut sifre hatali' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;
