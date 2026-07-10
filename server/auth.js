import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ───────────── Auth Middleware (guard) ─────────────
export function authMiddleware(req, res, next) {
  if (!req.household) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// People included in responses — adds has_password boolean
function formatPeople(rows) {
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color,
    created_at: r.created_at,
    has_password: !!r.password_hash,
  }));
}

// ───────────── Auth Routes ─────────────
export function authRoutes(router) {
  // POST /api/auth/signup — create a household + first person
  router.post('/auth/signup', async (req, res) => {
    const db = req.db;
    const { household_name, password, person_name, person_color, person_password } = req.body;

    if (!household_name || !password || !person_name || !person_color) {
      return res.status(400).json({
        error: 'household_name, password, person_name, and person_color are required',
      });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Household password must be at least 4 characters' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const session_token = crypto.randomUUID();
    const person_password_hash = person_password ? await bcrypt.hash(person_password, 10) : null;

    try {
      const tx = await db.transaction('write');

      const hhResult = await tx.execute({
        sql: 'INSERT INTO households (name, password_hash, session_token) VALUES (?, ?, ?)',
        args: [household_name, password_hash, session_token],
      });
      const householdId = hhResult.lastInsertRowid;

      await tx.execute({
        sql: 'INSERT INTO people (household_id, name, color, password_hash) VALUES (?, ?, ?, ?)',
        args: [householdId, person_name, person_color, person_password_hash],
      });

      await tx.commit();

      const household = (await db.execute({
        sql: 'SELECT id, name, created_at FROM households WHERE id = ?',
        args: [householdId],
      })).rows[0];

      const people = formatPeople((await db.execute({
        sql: 'SELECT id, name, color, created_at, password_hash FROM people WHERE household_id = ? ORDER BY name',
        args: [householdId],
      })).rows);

      res.status(201).json({ token: session_token, household, people });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'A household with that name already exists' });
      }
      throw err;
    }
  });

  // POST /api/auth/login — verify household password, return session + people
  router.post('/auth/login', async (req, res) => {
    const db = req.db;
    const { household_name, password } = req.body;

    if (!household_name || !password) {
      return res.status(400).json({ error: 'household_name and password are required' });
    }

    const result = await db.execute({
      sql: 'SELECT id, name, password_hash, session_token, created_at FROM households WHERE name = ?',
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

    // Reuse existing session token so all devices stay logged in
    // Only generate a new one if the household doesn't have one yet
    // (e.g. first login after signup with a different device, or after logout)
    let session_token = household.session_token;
    if (!session_token) {
      session_token = crypto.randomUUID();
      await db.execute({
        sql: 'UPDATE households SET session_token = ? WHERE id = ?',
        args: [session_token, household.id],
      });
    }

    const people = formatPeople((await db.execute({
      sql: 'SELECT id, name, color, created_at, password_hash FROM people WHERE household_id = ? ORDER BY name',
      args: [household.id],
    })).rows);

    res.json({
      token: session_token,
      household: { id: household.id, name: household.name, created_at: household.created_at },
      people,
    });
  });

  // GET /api/auth/me — validate token, return household + people (with has_password)
  router.get('/auth/me', async (req, res) => {
    if (!req.household) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const people = formatPeople((await req.db.execute({
      sql: 'SELECT id, name, color, created_at, password_hash FROM people WHERE household_id = ? ORDER BY name',
      args: [req.household.id],
    })).rows);

    res.json({ household: req.household, people });
  });

  // POST /api/auth/verify-person — verify a person's password
  router.post('/auth/verify-person', authMiddleware, async (req, res) => {
    const db = req.db;
    const { person_id, password } = req.body;

    if (!person_id) {
      return res.status(400).json({ error: 'person_id is required' });
    }

    const person = (await db.execute({
      sql: 'SELECT id, name, color, created_at, password_hash FROM people WHERE id = ? AND household_id = ?',
      args: [person_id, req.household.id],
    })).rows[0];

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // If person has no password, let them through
    if (!person.password_hash) {
      return res.json({
        verified: true,
        person: { id: person.id, name: person.name, color: person.color, created_at: person.created_at },
      });
    }

    if (!password) {
      return res.status(403).json({ error: 'Person password required' });
    }

    const valid = await bcrypt.compare(password, person.password_hash);
    if (!valid) {
      return res.status(403).json({ error: 'Wrong person password' });
    }

    res.json({
      verified: true,
      person: { id: person.id, name: person.name, color: person.color, created_at: person.created_at },
    });
  });

  // POST /api/auth/set-person-password — set/change a person's password
  router.post('/auth/set-person-password', authMiddleware, async (req, res) => {
    const db = req.db;
    const { person_id, password } = req.body;

    if (!person_id) {
      return res.status(400).json({ error: 'person_id is required' });
    }

    // Verify this person belongs to the household
    const person = (await db.execute({
      sql: 'SELECT id FROM people WHERE id = ? AND household_id = ?',
      args: [person_id, req.household.id],
    })).rows[0];

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      const hash = await bcrypt.hash(password, 10);
      await db.execute({
        sql: 'UPDATE people SET password_hash = ? WHERE id = ?',
        args: [hash, person_id],
      });
    } else {
      // Remove password
      await db.execute({
        sql: 'UPDATE people SET password_hash = NULL WHERE id = ?',
        args: [person_id],
      });
    }

    res.json({ ok: true });
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
