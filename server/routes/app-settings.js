const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

// Get all settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// Update settings
router.put('/', adminOnly, (req, res) => {
  const updates = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  Object.entries(updates).forEach(([k, v]) => stmt.run(k, String(v)));
  res.json({ success: true });
});

module.exports = router;
