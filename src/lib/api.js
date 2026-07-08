const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ─────────── People ───────────
export function getPeople() {
  return request('/people');
}

export function createPerson(name, color) {
  return request('/people', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

// ─────────── Colors ───────────
export function getColors() {
  return request('/colors');
}

// ─────────── Sections ───────────
export function getSections(personId) {
  const qs = personId ? `?person_id=${personId}` : '';
  return request(`/sections${qs}`);
}

export function getSection(id) {
  return request(`/sections/${id}`);
}

export function createSection(name, memberIds) {
  return request('/sections', {
    method: 'POST',
    body: JSON.stringify({ name, member_ids: memberIds }),
  });
}

// ─────────── Entries ───────────
export function createEntry(sectionId, personId, date) {
  return request('/entries', {
    method: 'POST',
    body: JSON.stringify({ section_id: sectionId, person_id: personId, date }),
  });
}

export function deleteEntry(entryId) {
  return request(`/entries/${entryId}`, { method: 'DELETE' });
}

export function getEntries(sectionId, date) {
  const qs = date ? `?section_id=${sectionId}&date=${date}` : `?section_id=${sectionId}`;
  return request(`/entries${qs}`);
}

// ─────────── Stats ───────────
export function getStats(personId) {
  const qs = personId ? `?person_id=${personId}` : '';
  return request(`/stats${qs}`);
}
