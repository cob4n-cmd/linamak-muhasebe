const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'linamak-muhasebe-secret-2024';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Gecersiz token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Yetkiniz yok' });
  next();
}

module.exports = { auth, adminOnly, SECRET };
