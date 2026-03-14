const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

// Get all settings
router.get('/', async (req, res) => {
  const rows = await db.all('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// Update settings
router.put('/', adminOnly, async (req, res) => {
  const updates = req.body;
  for (const [k, v] of Object.entries(updates)) {
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', k, String(v));
  }
  res.json({ success: true });
});

module.exports = router;
