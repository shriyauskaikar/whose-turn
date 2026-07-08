import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In local dev, use a SQLite file. In production (Vercel), use Turso.
const isLocal = !process.env.TURSO_DB_URL;

let db;

if (isLocal) {
  const DB_PATH = path.join(__dirname, '..', 'data', 'whose-turn.db');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = createClient({ url: `file:${DB_PATH}` });
} else {
  db = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  });
}

// ───────────── Schema ─────────────
async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      color      TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS section_members (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      UNIQUE(section_id, person_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(section_id, person_id, date)
    )
  `);

  // Indices — ignore errors if they already exist
  try { await db.execute('CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)'); } catch {}
  try { await db.execute('CREATE INDEX IF NOT EXISTS idx_entries_section ON entries(section_id)'); } catch {}

  console.log('📦 Schema initialized');
}

await initSchema();

export default db;
