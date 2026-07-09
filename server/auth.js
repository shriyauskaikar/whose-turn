import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ───────────── Auth Middleware (guard) ─────────────
export function authMiddleware(req, res, next) {
  if (!req.household) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ───────────── Auth Routes ─────────────
export function authRoutes(router) {
  // POST /api/auth/signup — create a household + first person
  router.post('/auth/signup', async (req, res) => {
    const db = req.db;
    const { household_name, password, person_name, person_color } = req.body;

    if (!household_name || !password || !person_name || !person_color) {
      return res.status(400).json({
        error: 'household_name, password, person_name, and person_color are required',
      });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const session_token = crypto.randomUUID();

    try {
      const tx = await db.transaction('write');

      const hhResult = await tx.execute({
        sql: 'INSERT INTO households (name, password_hash, session_token) VALUES (?, ?, ?)',
        args: [household_name, password_hash, session_token],
      });
      const householdId = hhResult.lastInsertRowid;

      await tx.execute({
        sql: 'INSERT INTO people (household_id, name, color) VALUES (?, ?, ?)',
        args: [householdId, person_name, person_color],
      });

      await tx.commit();

      const household = (await db.execute({
        sql: 'SELECT id, name, created_at FROM households WHERE id = ?',
        args: [householdId],
      })).rows[0];

      const people = (await db.execute({
        sql: 'SELECT id, name, color, created_at FROM people WHERE household_id = ? ORDER BY name',
        args: [householdId],
      })).rows;

      res.status(201).json({ token: session_token, household, people });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'A household with that name already exists' });
      }
      throw err;
    }
  });

  // POST /api/auth/login — verify password, return session
  router.post('/auth/login', async (req, res) => {
    const db = req.db;
    const { household_name, password } = req.body;

    if (!household_name || !password) {
      return res.status(400).json({ error: 'household_name and password are required' });
    }

    const result = await db.execute({
      sql: 'SELECT id, name, password_hash, created_at FROM households WHERE name = ?',
      args: [household_name],
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Household not found' });
    }

    const household = result.rows[0];
    const valid = await bcrypt.compare(password, household.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    const session_token = crypto.randomUUID();
    await db.execute({
      sql: 'UPDATE households SET session_token = ? WHERE id = ?',
      args: [session_token, household.id],
    });

    const people = (await db.execute({
      sql: 'SELECT id, name, color, created_at FROM people WHERE household_id = ? ORDER BY name',
      args: [household.id],
    })).rows;

    res.json({
      token: session_token,
      household: { id: household.id, name: household.name, created_at: household.created_at },
      people,
    });
  });

  // GET /api/auth/me — validate token, return household + people
  router.get('/auth/me', async (req, res) => {
    if (!req.household) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const people = (await req.db.execute({
      sql: 'SELECT id, name, color, created_at FROM people WHERE household_id = ? ORDER BY name',
      args: [req.household.id],
    })).rows;

    res.json({ household: req.household, people });
  });

  // POST /api/auth/logout — clear session token
  router.post('/auth/logout', async (req, res) => {
    if (req.household) {
      await req.db.execute({
        sql: 'UPDATE households SET session_token = NULL WHERE id = ?',
        args: [req.household.id],
      });
    }
    res.json({ ok: true });
  });
}
