export const COLOR_PALETTE = [
  { name: 'Rose',     hex: '#E11D48' },
  { name: 'Orange',   hex: '#EA580C' },
  { name: 'Amber',    hex: '#D97706' },
  { name: 'Lime',     hex: '#65A30D' },
  { name: 'Teal',     hex: '#0D9488' },
  { name: 'Sky',      hex: '#0284C7' },
  { name: 'Indigo',   hex: '#4F46E5' },
  { name: 'Violet',   hex: '#7C3AED' },
  { name: 'Fuchsia',  hex: '#C026D3' },
  { name: 'Emerald',  hex: '#059669' },
  { name: 'Cyan',     hex: '#0891B2' },
  { name: 'Pink',     hex: '#DB2777' },
];

// ───────────── People routes ─────────────
export function peopleRoutes(router) {
  router.get('/', async (req, res) => {
    const result = await req.db.execute({
      sql: 'SELECT id, name, color, created_at FROM people WHERE household_id = ? ORDER BY name',
      args: [req.household.id],
    });
    res.json(result.rows);
  });

  router.post('/', async (req, res) => {
    const db = req.db;
    const { name, color } = req.body;
    if (!name || !color) return res.status(400).json({ error: 'Name and color are required' });

    try {
      const result = await db.execute({
        sql: 'INSERT INTO people (household_id, name, color) VALUES (?, ?, ?)',
        args: [req.household.id, name, color],
      });
      const person = (await db.execute({
        sql: 'SELECT id, name, color, created_at FROM people WHERE id = ?',
        args: [result.lastInsertRowid],
      })).rows[0];
      res.status(201).json(person);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        const field = err.message.includes('name') ? 'name' : 'color';
        return res.status(409).json({ error: `That ${field} is already taken in your household` });
      }
      throw err;
    }
  });
}

// ───────────── Sections routes ─────────────
export function sectionsRoutes(router) {
  router.get('/', async (req, res) => {
    const { person_id } = req.query;
    let sections;

    if (person_id) {
      sections = (await req.db.execute({
        sql: `SELECT s.id, s.name, s.created_at
              FROM sections s
              JOIN section_members sm ON sm.section_id = s.id
              WHERE s.household_id = ? AND sm.person_id = ?
              ORDER BY s.name`,
        args: [req.household.id, person_id],
      })).rows;
    } else {
      sections = (await req.db.execute({
        sql: 'SELECT id, name, created_at FROM sections WHERE household_id = ? ORDER BY name',
        args: [req.household.id],
      })).rows;
    }

    for (const section of sections) {
      section.members = (await req.db.execute({
        sql: `SELECT p.id, p.name, p.color
              FROM section_members sm
              JOIN people p ON p.id = sm.person_id
              WHERE sm.section_id = ? AND sm.household_id = ?
              ORDER BY p.name`,
        args: [section.id, req.household.id],
      })).rows;
    }

    res.json(sections);
  });

  router.post('/', async (req, res) => {
    const db = req.db;
    const { name, member_ids } = req.body;
    if (!name || !member_ids?.length) {
      return res.status(400).json({ error: 'Name and at least one member are required' });
    }

    try {
      const tx = await db.transaction('write');
      const sectionResult = await tx.execute({
        sql: 'INSERT INTO sections (household_id, name) VALUES (?, ?)',
        args: [req.household.id, name],
      });
      const sectionId = sectionResult.lastInsertRowid;

      for (const personId of member_ids) {
        await tx.execute({
          sql: 'INSERT INTO section_members (household_id, section_id, person_id) VALUES (?, ?, ?)',
          args: [req.household.id, sectionId, personId],
        });
      }
      await tx.commit();

      const section = (await db.execute({
        sql: 'SELECT id, name, created_at FROM sections WHERE id = ?',
        args: [sectionId],
      })).rows[0];

      section.members = (await db.execute({
        sql: `SELECT p.id, p.name, p.color
              FROM section_members sm
              JOIN people p ON p.id = sm.person_id
              WHERE sm.section_id = ? AND sm.household_id = ?
              ORDER BY p.name`,
        args: [sectionId, req.household.id],
      })).rows;

      res.status(201).json(section);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'A section with that name already exists in your household' });
      }
      throw err;
    }
  });

  router.get('/:id', async (req, res) => {
    const db = req.db;
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || (now.getMonth() + 1);

    const section = (await db.execute({
      sql: 'SELECT id, name, created_at FROM sections WHERE id = ? AND household_id = ?',
      args: [req.params.id, req.household.id],
    })).rows[0];

    if (!section) return res.status(404).json({ error: 'Section not found' });

    section.members = (await db.execute({
      sql: `SELECT p.id, p.name, p.color
            FROM section_members sm
            JOIN people p ON p.id = sm.person_id
            WHERE sm.section_id = ? AND sm.household_id = ?
            ORDER BY p.name`,
      args: [section.id, req.household.id],
    })).rows;

    // Entries for the requested month
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    section.entries = (await db.execute({
      sql: `SELECT e.id, e.section_id, e.person_id, e.date,
                   p.name AS person_name, p.color AS person_color
            FROM entries e
            JOIN people p ON p.id = e.person_id
            WHERE e.section_id = ? AND e.household_id = ? AND e.date >= ? AND e.date <= ?
            ORDER BY e.date`,
      args: [section.id, req.household.id, startDate, endDate],
    })).rows;

    // Totals (all-time for this section)
    section.totals = (await db.execute({
      sql: `SELECT e.person_id, p.name, p.color, COUNT(*) AS count
            FROM entries e
            JOIN people p ON p.id = e.person_id
            WHERE e.section_id = ? AND e.household_id = ?
            GROUP BY e.person_id
            ORDER BY count DESC`,
      args: [section.id, req.household.id],
    })).rows;

    res.json(section);
  });
}

// ───────────── Entries routes ─────────────
export function entriesRoutes(router) {
  router.post('/', async (req, res) => {
    const db = req.db;
    const { section_id, person_id, date } = req.body;
    if (!section_id || !person_id || !date) {
      return res.status(400).json({ error: 'section_id, person_id, and date are required' });
    }

    try {
      const result = await db.execute({
        sql: 'INSERT INTO entries (household_id, section_id, person_id, date) VALUES (?, ?, ?, ?)',
        args: [req.household.id, section_id, person_id, date],
      });
      const entry = (await db.execute({
        sql: `SELECT e.id, e.section_id, e.person_id, e.date,
                     p.name AS person_name, p.color AS person_color
              FROM entries e JOIN people p ON p.id = e.person_id
              WHERE e.id = ?`,
        args: [result.lastInsertRowid],
      })).rows[0];
      res.status(201).json(entry);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Entry already exists for this person on this date' });
      }
      throw err;
    }
  });

  router.delete('/:id', async (req, res) => {
    const result = await req.db.execute({
      sql: 'DELETE FROM entries WHERE id = ? AND household_id = ?',
      args: [req.params.id, req.household.id],
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ok: true });
  });

  router.get('/', async (req, res) => {
    const { section_id, date } = req.query;
    if (!section_id) return res.status(400).json({ error: 'section_id is required' });

    let query;
    if (date) {
      query = {
        sql: `SELECT e.id, e.section_id, e.person_id, e.date,
                     p.name AS person_name, p.color AS person_color
              FROM entries e JOIN people p ON p.id = e.person_id
              WHERE e.section_id = ? AND e.household_id = ? AND e.date = ?
              ORDER BY e.person_id`,
        args: [section_id, req.household.id, date],
      };
    } else {
      query = {
        sql: `SELECT e.id, e.section_id, e.person_id, e.date,
                     p.name AS person_name, p.color AS person_color
              FROM entries e JOIN people p ON p.id = e.person_id
              WHERE e.section_id = ? AND e.household_id = ?
              ORDER BY e.date DESC, e.person_id`,
        args: [section_id, req.household.id],
      };
    }

    res.json((await req.db.execute(query)).rows);
  });
}

// ───────────── Stats routes ─────────────
export function statsRoutes(router) {
  router.get('/', async (req, res) => {
    const db = req.db;
    const { person_id } = req.query;
    const hid = req.household.id;

    let allTotals;
    if (person_id) {
      allTotals = (await db.execute({
        sql: `SELECT p.id, p.name, p.color, COUNT(e.id) AS count
              FROM people p LEFT JOIN entries e ON e.person_id = p.id AND e.household_id = p.household_id
              WHERE p.id = ? AND p.household_id = ?
              GROUP BY p.id ORDER BY count DESC`,
        args: [person_id, hid],
      })).rows;
    } else {
      allTotals = (await db.execute({
        sql: `SELECT p.id, p.name, p.color, COUNT(e.id) AS count
              FROM people p LEFT JOIN entries e ON e.person_id = p.id AND e.household_id = p.household_id
              WHERE p.household_id = ?
              GROUP BY p.id ORDER BY count DESC`,
        args: [hid],
      })).rows;
    }

    const perSectionRows = (await db.execute({
      sql: `SELECT s.id AS section_id, s.name AS section_name,
                   p.id AS person_id, p.name AS person_name,
                   p.color AS person_color, COUNT(e.id) AS count
            FROM sections s
            JOIN section_members sm ON sm.section_id = s.id
            JOIN people p ON p.id = sm.person_id
            LEFT JOIN entries e ON e.section_id = s.id AND e.person_id = p.id
            WHERE s.household_id = ?
            GROUP BY s.id, p.id
            ORDER BY s.name, p.name`,
      args: [hid],
    })).rows;

    const sectionMap = {};
    for (const row of perSectionRows) {
      if (!sectionMap[row.section_id]) {
        sectionMap[row.section_id] = {
          section_id: row.section_id,
          section_name: row.section_name,
          people: [],
        };
      }
      sectionMap[row.section_id].people.push({
        person_id: row.person_id,
        person_name: row.person_name,
        person_color: row.person_color,
        count: row.count,
      });
    }

    res.json({
      all_totals: allTotals,
      per_section: Object.values(sectionMap),
    });
  });
}
