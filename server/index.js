import express from 'express';
import cors from 'cors';
import path from 'path';
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
api.get('/colors', (req, res) => {
  const usedColors = db.prepare('SELECT color FROM people').all().map(r => r.color);
  const available = COLOR_PALETTE.map(c => ({
    ...c,
    available: !usedColors.includes(c.hex),
  }));
  res.json(available);
});

app.use('/api', api);

// ───────────── Serve static frontend (auto-detect production) ─────────────
const distPath = path.join(__dirname, '..', 'dist');
const fs = await import('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ───────────── Start ─────────────
app.listen(PORT, () => {
  console.log(`🧑‍🍳 Whose Turn server running on http://localhost:${PORT}`);
});
