const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { auth, adminOnly, SECRET } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli' });
  const user = await db.get('SELECT * FROM users WHERE username = ?', username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Kullanici adi veya sifre hatali' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

// Me
router.get('/me', auth, async (req, res) => {
  const user = await db.get('SELECT id, username, role, name FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });
  res.json(user);
});

// List users (admin)
router.get('/users', auth, adminOnly, async (req, res) => {
  const users = await db.all('SELECT id, username, role, name, created_at FROM users ORDER BY id');
  res.json(users);
});

// Create user (admin)
router.post('/users', auth, adminOnly, async (req, res) => {
  const { username, password, role = 'staff', name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    await db.run('INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)', username, hash, role, name || username);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Bu kullanici adi zaten mevcut' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Eski ve yeni sifre gerekli' });
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Mevcut sifre hatali' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;
