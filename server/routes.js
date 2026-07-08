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
  // Darker tones for contrast on light backgrounds
  { name: 'Cyan',     hex: '#0891B2' },
  { name: 'Pink',     hex: '#DB2777' },
];

// ───────────── People routes ─────────────
export function peopleRoutes(router) {
  // GET /api/people — list all people
  router.get('/people', (req, res) => {
    const db = req.db;
    const people = db.prepare('SELECT id, name, color, created_at FROM people ORDER BY name').all();
    res.json(people);
  });

  // POST /api/people — create a new person
  router.post('/people', (req, res) => {
    const db = req.db;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    // Check if name already taken
    const existing = db.prepare('SELECT id FROM people WHERE name = ?').get(name);
    if (existing) {
      return res.status(409).json({ error: 'That name is already taken' });
    }

    // Check if color already in use
    const colorTaken = db.prepare('SELECT id FROM people WHERE color = ?').get(color);
    if (colorTaken) {
      return res.status(409).json({ error: 'That color is already in use' });
    }

    const result = db.prepare('INSERT INTO people (name, color) VALUES (?, ?)').run(name, color);
    const person = db.prepare('SELECT id, name, color, created_at FROM people WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(person);
  });
}

// ───────────── Sections routes ─────────────
export function sectionsRoutes(router) {
  // GET /api/sections — list all sections (optionally ?person_id= for user's sections)
  router.get('/sections', (req, res) => {
    const db = req.db;
    const { person_id } = req.query;

    let sections;
    if (person_id) {
      sections = db.prepare(`
        SELECT s.id, s.name, s.created_at
        FROM sections s
        JOIN section_members sm ON sm.section_id = s.id
        WHERE sm.person_id = ?
        ORDER BY s.name
      `).all(person_id);
    } else {
      sections = db.prepare('SELECT id, name, created_at FROM sections ORDER BY name').all();
    }

    // Attach members to each section
    const getMembers = db.prepare(`
      SELECT p.id, p.name, p.color
      FROM section_members sm
      JOIN people p ON p.id = sm.person_id
      WHERE sm.section_id = ?
      ORDER BY p.name
    `);

    for (const section of sections) {
      section.members = getMembers.all(section.id);
    }

    res.json(sections);
  });

  // POST /api/sections — create a section with member list
  router.post('/sections', (req, res) => {
    const db = req.db;
    const { name, member_ids } = req.body;

    if (!name || !member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: 'Name and at least one member are required' });
    }

    const insertSection = db.prepare('INSERT INTO sections (name) VALUES (?)');
    const insertMember = db.prepare('INSERT INTO section_members (section_id, person_id) VALUES (?, ?)');

    const transaction = db.transaction(() => {
      const result = insertSection.run(name);
      const sectionId = result.lastInsertRowid;

      for (const personId of member_ids) {
        insertMember.run(sectionId, personId);
      }

      return sectionId;
    });

    try {
      const sectionId = transaction();
      // Fetch the full section with members
      const section = db.prepare('SELECT id, name, created_at FROM sections WHERE id = ?').get(sectionId);
      const members = db.prepare(`
        SELECT p.id, p.name, p.color
        FROM section_members sm
        JOIN people p ON p.id = sm.person_id
        WHERE sm.section_id = ?
        ORDER BY p.name
      `).all(sectionId);
      section.members = members;

      res.status(201).json(section);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'A section with that name already exists' });
      }
      throw err;
    }
  });

  // GET /api/sections/:id — single section with detail
  router.get('/sections/:id', (req, res) => {
    const db = req.db;
    const section = db.prepare('SELECT id, name, created_at FROM sections WHERE id = ?').get(req.params.id);

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    section.members = db.prepare(`
      SELECT p.id, p.name, p.color
      FROM section_members sm
      JOIN people p ON p.id = sm.person_id
      WHERE sm.section_id = ?
      ORDER BY p.name
    `).all(section.id);

    // Get recent entries (last 5 weeks from today)
    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    const sinceStr = fiveWeeksAgo.toISOString().split('T')[0];

    section.entries = db.prepare(`
      SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
      FROM entries e
      JOIN people p ON p.id = e.person_id
      WHERE e.section_id = ? AND e.date >= ?
      ORDER BY e.date DESC
    `).all(section.id, sinceStr);

    // Per-person totals for this section
    section.totals = db.prepare(`
      SELECT e.person_id, p.name, p.color, COUNT(*) AS count
      FROM entries e
      JOIN people p ON p.id = e.person_id
      WHERE e.section_id = ?
      GROUP BY e.person_id
      ORDER BY count DESC
    `).all(section.id);

    res.json(section);
  });
}

// ───────────── Entries routes ─────────────
export function entriesRoutes(router) {
  // POST /api/entries — log that someone did a task
  router.post('/entries', (req, res) => {
    const db = req.db;
    const { section_id, person_id, date } = req.body;

    if (!section_id || !person_id || !date) {
      return res.status(400).json({ error: 'section_id, person_id, and date are required' });
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM entries WHERE section_id = ? AND person_id = ? AND date = ?').get(section_id, person_id, date);
    if (existing) {
      return res.status(409).json({ error: 'Entry already exists for this person on this date in this section' });
    }

    const result = db.prepare('INSERT INTO entries (section_id, person_id, date) VALUES (?, ?, ?)').run(section_id, person_id, date);
    const entry = db.prepare(`
      SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
      FROM entries e
      JOIN people p ON p.id = e.person_id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(entry);
  });

  // DELETE /api/entries/:id — undo an entry
  router.delete('/entries/:id', (req, res) => {
    const db = req.db;
    const result = db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ ok: true });
  });

  // GET /api/entries?section_id=&date= — check who did what on a specific day
  router.get('/entries', (req, res) => {
    const db = req.db;
    const { section_id, date } = req.query;

    let entries;
    if (section_id && date) {
      entries = db.prepare(`
        SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
        FROM entries e
        JOIN people p ON p.id = e.person_id
        WHERE e.section_id = ? AND e.date = ?
        ORDER BY e.person_id
      `).all(section_id, date);
    } else if (section_id) {
      entries = db.prepare(`
        SELECT e.id, e.section_id, e.person_id, e.date, p.name AS person_name, p.color AS person_color
        FROM entries e
        JOIN people p ON p.id = e.person_id
        WHERE e.section_id = ?
        ORDER BY e.date DESC, e.person_id
      `).all(section_id);
    } else {
      return res.status(400).json({ error: 'section_id is required' });
    }

    res.json(entries);
  });
}

// ───────────── Stats routes ─────────────
export function statsRoutes(router) {
  // GET /api/stats — overall stats per person
  router.get('/stats', (req, res) => {
    const db = req.db;
    const { person_id } = req.query;

    // All-time totals per person across all sections
    let allTotals;
    if (person_id) {
      allTotals = db.prepare(`
        SELECT p.id, p.name, p.color, COUNT(e.id) AS count
        FROM people p
        LEFT JOIN entries e ON e.person_id = p.id
        WHERE p.id = ?
        GROUP BY p.id
        ORDER BY count DESC
      `).all(person_id);
    } else {
      allTotals = db.prepare(`
        SELECT p.id, p.name, p.color, COUNT(e.id) AS count
        FROM people p
        LEFT JOIN entries e ON e.person_id = p.id
        GROUP BY p.id
        ORDER BY count DESC
      `).all();
    }

    // Per-section breakdown for each person
    const perSection = db.prepare(`
      SELECT
        s.id AS section_id,
        s.name AS section_name,
        p.id AS person_id,
        p.name AS person_name,
        p.color AS person_color,
        COUNT(e.id) AS count
      FROM sections s
      JOIN section_members sm ON sm.section_id = s.id
      JOIN people p ON p.id = sm.person_id
      LEFT JOIN entries e ON e.section_id = s.id AND e.person_id = p.id
      ${person_id ? 'WHERE p.id = ?' : ''}
      GROUP BY s.id, p.id
      ORDER BY s.name, p.name
    `).all(...(person_id ? [person_id] : []));

    // Group by section
    const sectionMap = {};
    for (const row of perSection) {
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
