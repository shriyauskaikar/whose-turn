import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import { authMiddleware, authRoutes } from './auth.js';
import { peopleRoutes, sectionsRoutes, entriesRoutes, statsRoutes, COLOR_PALETTE } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ───────────── Middleware ─────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

// Attach database to each request
app.use((req, _res, next) => {
  req.db = db;
  next();
});

// ───────────── Resolve household from token ─────────────
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = await db.execute({
      sql: 'SELECT id, name FROM households WHERE session_token = ?',
      args: [token],
    });
    if (result.rows.length > 0) {
      req.household = result.rows[0];
      req.householdToken = token;
    }
  }
  next();
});

// ───────────── API Routes ─────────────
const api = express.Router({ mergeParams: true });

// Auth routes (public — no auth middleware)
authRoutes(api);

// Protected routes via sub-routers
const peopleRouter = express.Router({ mergeParams: true });
api.use('/people', authMiddleware, peopleRouter);
peopleRoutes(peopleRouter);

const sectionsRouter = express.Router({ mergeParams: true });
api.use('/sections', authMiddleware, sectionsRouter);
sectionsRoutes(sectionsRouter);

const entriesRouter = express.Router({ mergeParams: true });
api.use('/entries', authMiddleware, entriesRouter);
entriesRoutes(entriesRouter);

const statsRouter = express.Router({ mergeParams: true });
api.use('/stats', authMiddleware, statsRouter);
statsRoutes(statsRouter);

// Color palette (protected)
api.get('/colors', authMiddleware, async (req, res) => {
  const usedRows = await db.execute({
    sql: 'SELECT color FROM people WHERE household_id = ?',
    args: [req.household.id],
  });
  const usedColors = usedRows.rows.map(r => r.color);
  const available = COLOR_PALETTE.map(c => ({
    ...c,
    available: !usedColors.includes(c.hex),
  }));
  res.json(available);
});

app.use('/api', api);

// ───────────── Serve static frontend (local) ─────────────
if (!process.env.VERCEL) {
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// ───────────── Export for Vercel ─────────────
export default app;

// ───────────── Start (when run directly) ─────────────
const isEntryPoint = process.argv[1]?.replace(/\\/g, '/').endsWith('server/index.js');
if (isEntryPoint) {
  app.listen(PORT, () => {
    console.log(`🧑‍🍳 Whose Turn server running on http://localhost:${PORT}`);
  });
}
