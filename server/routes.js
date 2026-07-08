// ─────────────────────────────────────────────
// Fixed color palette — people pick from here,
// used colors are hidden from the picker.
// ─────────────────────────────────────────────
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
  // GET /api/people — list all people
  router.get('/people', async (req, res) => {
    const db = req.db;
    const result = await db.execute('SELECT id, name, color, created_at FROM people ORDER BY name');
    res.json(result.rows);
  });

  // POST /api/people — create a new person
  router.post('/people', async (req, res) => {
    const db = req.db;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    try {
      const result = await db.execute({
        sql: 'INSERT INTO people (name, color) VALUES (?, ?)',
        args: [name, color],
      });
      const personResult = await db.execute({
        sql: 'SELECT id, name, color, created_at FROM people WHERE id = ?',
        args: [result.lastInsertRowid],
      });
      res.status(201).json(personResult.rows[0]);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        const taken = err.message.includes('name') ? 'name' : 'color';
        return res.status(409).json({ error: `That ${taken} is already taken` });
      }
      throw err;
    }
  });
}

// ───────────── Sections routes ─────────────
export function sectionsRoutes(router) {
  // GET /api/sections — list all sections (?person_id= for user's sections)
  router.get('/sections', async (req, res) => {
    const db = req.db;
    const { person_id } = req.query;

    let sections;
    if (person_id) {
      const result = await db.execute({
        sql: `SELECT s.id, s.name, s.created_at
              FROM sections s
              JOIN section_members sm ON sm.section_id = s.id
              WHERE sm.person_id = ?
              ORDER BY s.name`,
        args: [person_id],
      });
      sections = result.rows;
    } else {
      const result = await db.execute('SELECT id, name, created_at FROM sections ORDER BY name');
      sections = result.rows;
    }

    // Attach members to each section
    for (const section of sections) {
      const membersResult = await db.execute({
        sql: `SELECT p.id, p.name, p.color
              FROM section_members sm
              JOIN people p ON p.id = sm.person_id
              WHERE sm.section_id = ?
              ORDER BY p.name`,
        args: [section.id],
      });
      section.members = membersResult.rows;
    }

    res.json(sections);
  });

  // POST /api/sections — create a section with member list
  router.post('/sections', async (req, res) => {
    const db = req.db;
    const { name, member_ids } = req.body;

    if (!name || !member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: 'Name and at least one member are required' });
    }

    try {
      const tx = await db.transaction('write');

      const sectionResult = await tx.execute({
        sql: 'INSERT INTO sections (name) VALUES (?)',
        args: [name],
      });
      const sectionId = sectionResult.lastInsertRowid;

      for (const personId of member_ids) {
        await tx.execute({
          sql: 'INSERT INTO section_members (section_id, person_id) VALUES (?, ?)',
          args: [sectionId, personId],
        });
      }

      await tx.commit();

      // Fetch the full section with members
      const sectionResult2 = await db.execute({
        sql: 'SELECT id, name, created_at FROM sections WHERE id = ?',
        args: [sectionId],
      });
      const section = sectionResult2.rows[0];

      const membersResult = await db.execute({
        sql: `SELECT p.id, p.name, p.color
              FROM section_members sm
              JOIN people p ON p.id = sm.person_id
              WHERE sm.section_id = ?
              ORDER BY p.name`,
        args: [sectionId],
      });
      section.members = membersResult.rows;

      res.status(201).json(section);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'A section with that name already exists' });
      }
      throw err;
    }
  });

  // GET /api/sections/:id — single section with detail
  router.get('/sections/:id', async (req, res) => {
    const db = req.db;

    const sectionResult = await db.execute({
      sql: 'SELECT id, name, created_at FROM sections WHERE id = ?',
      args: [req.params.id],
    });
    const section = sectionResult.rows[0];

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const membersResult = await db.execute({
      sql: `SELECT p.id, p.name, p.color
            FROM section_members sm
            JOIN people p ON p.id = sm.person_id
            WHERE sm.section_id = ?
            ORDER BY p.name`,
      args: [section.id],
    });
    section.members = membersResult.rows;

    // Get recent entries (last 5 weeks from today)
    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    const sinceStr = fiveWeeksAgo.toISOString().split('T')[0];

    const entriesResult = await db.execute({
      sql: `SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
            FROM entries e
            JOIN people p ON p.id = e.person_id
            WHERE e.section_id = ? AND e.date >= ?
            ORDER BY e.date DESC`,
      args: [section.id, sinceStr],
    });
    section.entries = entriesResult.rows;

    // Per-person totals for this section
    const totalsResult = await db.execute({
      sql: `SELECT e.person_id, p.name, p.color, COUNT(*) AS count
            FROM entries e
            JOIN people p ON p.id = e.person_id
            WHERE e.section_id = ?
            GROUP BY e.person_id
            ORDER BY count DESC`,
      args: [section.id],
    });
    section.totals = totalsResult.rows;

    res.json(section);
  });
}

// ───────────── Entries routes ─────────────
export function entriesRoutes(router) {
  // POST /api/entries — log that someone did a task
  router.post('/entries', async (req, res) => {
    const db = req.db;
    const { section_id, person_id, date } = req.body;

    if (!section_id || !person_id || !date) {
      return res.status(400).json({ error: 'section_id, person_id, and date are required' });
    }

    try {
      const result = await db.execute({
        sql: 'INSERT INTO entries (section_id, person_id, date) VALUES (?, ?, ?)',
        args: [section_id, person_id, date],
      });

      const entryResult = await db.execute({
        sql: `SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
              FROM entries e
              JOIN people p ON p.id = e.person_id
              WHERE e.id = ?`,
        args: [result.lastInsertRowid],
      });

      res.status(201).json(entryResult.rows[0]);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Entry already exists for this person on this date in this section' });
      }
      throw err;
    }
  });

  // DELETE /api/entries/:id — undo an entry
  router.delete('/entries/:id', async (req, res) => {
    const db = req.db;
    const result = await db.execute({
      sql: 'DELETE FROM entries WHERE id = ?',
      args: [req.params.id],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ ok: true });
  });

  // GET /api/entries?section_id=&date= — check who did what
  router.get('/entries', async (req, res) => {
    const db = req.db;
    const { section_id, date } = req.query;

    if (!section_id) {
      return res.status(400).json({ error: 'section_id is required' });
    }

    let entries;
    if (date) {
      const result = await db.execute({
        sql: `SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
              FROM entries e
              JOIN people p ON p.id = e.person_id
              WHERE e.section_id = ? AND e.date = ?
              ORDER BY e.person_id`,
        args: [section_id, date],
      });
      entries = result.rows;
    } else {
      const result = await db.execute({
        sql: `SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
              FROM entries e
              JOIN people p ON p.id = e.person_id
              WHERE e.section_id = ?
              ORDER BY e.date DESC, e.person_id`,
        args: [section_id],
      });
      entries = result.rows;
    }

    res.json(entries);
  });
}

// ───────────── Stats routes ─────────────
export function statsRoutes(router) {
  // GET /api/stats — overall stats per person
  router.get('/stats', async (req, res) => {
    const db = req.db;
    const { person_id } = req.query;

    // All-time totals per person across all sections
    let allTotals;
    if (person_id) {
      const result = await db.execute({
        sql: `SELECT p.id, p.name, p.color, COUNT(e.id) AS count
              FROM people p
              LEFT JOIN entries e ON e.person_id = p.id
              WHERE p.id = ?
              GROUP BY p.id
              ORDER BY count DESC`,
        args: [person_id],
      });
      allTotals = result.rows;
    } else {
      allTotals = (await db.execute(
        `SELECT p.id, p.name, p.color, COUNT(e.id) AS count
         FROM people p
         LEFT JOIN entries e ON e.person_id = p.id
         GROUP BY p.id
         ORDER BY count DESC`
      )).rows;
    }

    // Per-section breakdown
    const perSectionSql = `
      SELECT s.id AS section_id, s.name AS section_name,
             p.id AS person_id, p.name AS person_name,
             p.color AS person_color, COUNT(e.id) AS count
      FROM sections s
      JOIN section_members sm ON sm.section_id = s.id
      JOIN people p ON p.id = sm.person_id
      LEFT JOIN entries e ON e.section_id = s.id AND e.person_id = p.id
      ${person_id ? 'WHERE p.id = ?' : ''}
      GROUP BY s.id, p.id
      ORDER BY s.name, p.name
    `;

    const perSectionRows = person_id
      ? (await db.execute({ sql: perSectionSql, args: [person_id] })).rows
      : (await db.execute(perSectionSql)).rows;

    // Group by section
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
