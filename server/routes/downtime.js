const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const db      = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'ectron-production-control-secret-2024';

const VALID_STAGES = [
  'Assembly',
  'Insulation',
  'RF',
  'Calibration',
  'Multin test',
  'Perso',
  'Packaging'
];

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

function calculateMinutes(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Crosses midnight
  }
  return endMinutes - startMinutes;
}

// ─── GET /api/downtime ─────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const { date, stage } = req.query;

  let query = 'SELECT id, user_name, stage, date, start_time, end_time, total_minutes, created_at FROM downtime WHERE 1=1';
  const params = [];

  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }
  if (stage) {
    query += ' AND stage = ?';
    params.push(stage);
  }

  query += ' ORDER BY date DESC, start_time DESC';

  const records = db.all(query, params);

  // Calculate day totals (total downtime minutes grouped by day)
  const daySummary = db.all(`
    SELECT date, SUM(total_minutes) as day_total_minutes, COUNT(*) as count
    FROM downtime
    GROUP BY date
    ORDER BY date DESC
  `);

  res.json({
    stages: VALID_STAGES,
    records,
    daySummary
  });
});

// ─── POST /api/downtime ────────────────────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  if (req.user.access === 'viewer') {
    return res.status(403).json({ message: 'Access denied: Viewers cannot record downtime.' });
  }

  const { user_name, stage, date, start_time, end_time } = req.body;

  const assignedUser = user_name?.trim() || req.user.name;
  const assignedStage = stage?.trim();
  const assignedDate = date?.trim();
  const assignedStart = start_time?.trim();
  const assignedEnd = end_time?.trim();

  if (!assignedStage || !assignedDate || !assignedStart || !assignedEnd) {
    return res.status(400).json({ message: 'Stage, date, start time, and end time are required.' });
  }

  if (!VALID_STAGES.includes(assignedStage)) {
    return res.status(400).json({ message: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` });
  }

  const totalMinutes = calculateMinutes(assignedStart, assignedEnd);

  const info = db.run(`
    INSERT INTO downtime (user_name, stage, date, start_time, end_time, total_minutes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    assignedUser,
    assignedStage,
    assignedDate,
    assignedStart,
    assignedEnd,
    totalMinutes
  ]);

  const record = db.get(
    'SELECT id, user_name, stage, date, start_time, end_time, total_minutes, created_at FROM downtime WHERE id = ?',
    [info.lastInsertRowid]
  );

  res.status(201).json(record);
});

// ─── PUT /api/downtime/:id ─────────────────────────────────────────────────────
router.put('/:id', authenticate, (req, res) => {
  if (req.user.access === 'viewer') {
    return res.status(403).json({ message: 'Access denied: Viewers cannot modify downtime records.' });
  }

  const { id } = req.params;
  const { user_name, stage, date, start_time, end_time } = req.body;

  const existing = db.get('SELECT * FROM downtime WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Downtime record not found.' });

  const assignedUser = user_name?.trim() || existing.user_name;
  const assignedStage = stage?.trim() || existing.stage;
  const assignedDate = date?.trim() || existing.date;
  const assignedStart = start_time?.trim() || existing.start_time;
  const assignedEnd = end_time?.trim() || existing.end_time;

  if (stage && !VALID_STAGES.includes(assignedStage)) {
    return res.status(400).json({ message: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` });
  }

  const totalMinutes = calculateMinutes(assignedStart, assignedEnd);

  db.run(`
    UPDATE downtime
    SET user_name     = ?,
        stage         = ?,
        date          = ?,
        start_time    = ?,
        end_time      = ?,
        total_minutes = ?,
        updated_at    = datetime('now')
    WHERE id = ?
  `, [
    assignedUser,
    assignedStage,
    assignedDate,
    assignedStart,
    assignedEnd,
    totalMinutes,
    id
  ]);

  const updated = db.get(
    'SELECT id, user_name, stage, date, start_time, end_time, total_minutes, created_at FROM downtime WHERE id = ?',
    [id]
  );

  res.json(updated);
});

// ─── DELETE /api/downtime/:id ──────────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  if (req.user.access === 'viewer') {
    return res.status(403).json({ message: 'Access denied: Viewers cannot delete downtime records.' });
  }

  const { id } = req.params;

  const existing = db.get('SELECT id FROM downtime WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Downtime record not found.' });

  db.run('DELETE FROM downtime WHERE id = ?', [id]);
  res.json({ message: 'Downtime record deleted successfully.' });
});

module.exports = router;
