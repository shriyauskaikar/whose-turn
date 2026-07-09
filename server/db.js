import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isLocal = !process.env.TURSO_DB_URL;

let db;

if (isLocal) {
  const DB_PATH = path.join(__dirname, '..', 'data', 'whose-turn.db');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = createClient({ url: `file:${DB_PATH}` });
} else {
  db = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  });
}

async function initSchema() {
  // Check if old schema (without households) needs migration
  const hasHouseholds = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='households'"
  );
  const hasPeople = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='people'"
  );

  if (hasHouseholds.rows.length === 0 && hasPeople.rows.length > 0) {
    // Old schema — drop and recreate clean
    await db.execute('DROP TABLE IF EXISTS entries');
    await db.execute('DROP TABLE IF EXISTS section_members');
    await db.execute('DROP TABLE IF EXISTS sections');
    await db.execute('DROP TABLE IF EXISTS people');
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      session_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(household_id, name)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(household_id, name)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS section_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      UNIQUE(section_id, person_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(section_id, person_id, date)
    )
  `);

  try { await db.execute('CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)'); } catch {}
  try { await db.execute('CREATE INDEX IF NOT EXISTS idx_entries_section ON entries(section_id)'); } catch {}
  try { await db.execute('CREATE INDEX IF NOT EXISTS idx_households_token ON households(session_token)'); } catch {}

  console.log('📦 Schema initialized');
}

await initSchema();
export default db;
