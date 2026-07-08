import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
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

// ───────────── API Routes ─────────────
const api = express.Router({ mergeParams: true });
peopleRoutes(api);
sectionsRoutes(api);
entriesRoutes(api);
statsRoutes(api);

// Color palette endpoint (tells frontend which colors are taken)
api.get('/colors', async (_req, res) => {
  const usedRows = await db.execute('SELECT color FROM people');
  const usedColors = usedRows.rows.map(r => r.color);
  const available = COLOR_PALETTE.map(c => ({
    ...c,
    available: !usedColors.includes(c.hex),
  }));
  res.json(available);
});

app.use('/api', api);

// ───────────── Serve static frontend (local only — Vercel handles this in production) ─────────────
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

// ───────────── Start (when run directly, not imported by Vercel) ─────────────
const isEntryPoint = process.argv[1]?.replace(/\\/g, '/').endsWith('server/index.js');
if (isEntryPoint) {
  app.listen(PORT, () => {
    console.log(`🧑‍🍳 Whose Turn server running on http://localhost:${PORT}`);
  });
}
