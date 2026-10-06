const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'ectron-production-control-secret-2024';

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
}

const VALID_ACCESS = ['admin', 'supervisor', 'viewer'];

function requireAdminOrSupervisor(req, res, next) {
  if (req.user.access === 'viewer') {
    return res.status(403).json({ message: 'Access denied: Viewers cannot modify users.' });
  }
  next();
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const { q } = req.query;
  let rows;
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    rows = db.all(`
      SELECT id, name, company_id, email, phone, access, team_name, created_at
      FROM users
      WHERE name LIKE ? OR email LIKE ? OR company_id LIKE ? OR phone LIKE ? OR team_name LIKE ?
      ORDER BY name
    `, [like, like, like, like, like]);
  } else {
    rows = db.all(`
      SELECT id, name, company_id, email, phone, access, team_name, created_at
      FROM users
      ORDER BY name
    `);
  }
  res.json(rows);
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post('/', authenticate, requireAdminOrSupervisor, (req, res) => {
  const { name, password, company_id, email, phone, access, team_name } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Name and password are required.' });
  }

  const existing = db.get('SELECT id FROM users WHERE name = ?', [name.trim()]);
  if (existing) {
    return res.status(409).json({ message: 'A user with this name already exists.' });
  }

  const normalizedAccess = VALID_ACCESS.includes(access?.toLowerCase()) ? access.toLowerCase() : 'viewer';

  const hash = bcrypt.hashSync(password, 10);
  const info = db.run(`
    INSERT INTO users (name, password, company_id, email, phone, access, team_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    name.trim(),
    hash,
    (company_id || '').trim(),
    (email || '').trim(),
    (phone || '').trim(),
    normalizedAccess,
    (team_name || '').trim(),
  ]);

  const user = db.get(
    'SELECT id, name, company_id, email, phone, access, team_name, created_at FROM users WHERE id = ?',
    [info.lastInsertRowid]
  );

  res.status(201).json(user);
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', authenticate, requireAdminOrSupervisor, (req, res) => {
  const { id } = req.params;
  const { name, password, company_id, email, phone, access, team_name } = req.body;

  const existing = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'User not found.' });

  if (name) {
    const conflict = db.get('SELECT id FROM users WHERE name = ? AND id != ?', [name.trim(), id]);
    if (conflict) return res.status(409).json({ message: 'A user with this name already exists.' });
  }

  let newPassword = existing.password;
  if (password && password.trim()) {
    newPassword = bcrypt.hashSync(password, 10);
  }

  const newAccess = access ? (VALID_ACCESS.includes(access.toLowerCase()) ? access.toLowerCase() : existing.access) : existing.access;

  db.run(`
    UPDATE users
    SET name       = ?,
        password   = ?,
        company_id = ?,
        email      = ?,
        phone      = ?,
        access     = ?,
        team_name  = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `, [
    (name || existing.name).trim(),
    newPassword,
    (company_id !== undefined ? company_id : existing.company_id).trim(),
    (email !== undefined ? email : existing.email).trim(),
    (phone !== undefined ? phone : existing.phone).trim(),
    newAccess,
    (team_name !== undefined ? team_name : (existing.team_name || '')).trim(),
    id,
  ]);

  const updated = db.get(
    'SELECT id, name, company_id, email, phone, access, team_name, created_at FROM users WHERE id = ?',
    [id]
  );

  res.json(updated);
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete('/:id', authenticate, requireAdminOrSupervisor, (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  const existing = db.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'User not found.' });

  db.run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ message: 'User deleted successfully.' });
});

module.exports = router;
