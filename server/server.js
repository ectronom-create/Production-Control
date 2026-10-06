const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');

async function main() {
  // Bootstrap DB (async with sql.js)
  await db.init();

  const authRoutes     = require('./routes/auth');
  const userRoutes     = require('./routes/users');
  const downtimeRoutes = require('./routes/downtime');

  const app  = express();
  const PORT = process.env.PORT || 3000;

  // ─── Middleware ────────────────────────────────────────────────────────────
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());

  // ─── API ──────────────────────────────────────────────────────────────────
  app.use('/api/auth',     authRoutes);
  app.use('/api/users',    userRoutes);
  app.use('/api/downtime', downtimeRoutes);

  // ─── Start ────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n🏭  ECTRON Production Control API`);
    console.log(`    http://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
