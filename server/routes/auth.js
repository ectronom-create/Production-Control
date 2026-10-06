const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const db        = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'ectron-production-control-secret-2024';
const JWT_EXPIRES = '8h';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Name and password are required.' });
  }

  const user = db.get('SELECT * FROM users WHERE name = ?', [name.trim()]);

  if (!user) {
    return res.status(401).json({ message: 'Invalid name or password.' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid name or password.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, access: user.access },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      company_id: user.company_id,
      email: user.email,
      access: user.access,
    },
  });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ valid: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
