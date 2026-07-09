const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const token = localStorage.getItem('whose_turn_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { headers, ...options });

  if (res.status === 401) {
    localStorage.removeItem('whose_turn_token');
    localStorage.removeItem('whose_turn_person');
    window.location.href = '/';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

// ─────────── Auth ───────────
export function signup(household_name, password, person_name, person_color) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ household_name, password, person_name, person_color }),
  });
}

export function login(household_name, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ household_name, password }),
  });
}

export function getMe() {
  return request('/auth/me');
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

// ─────────── Colors ───────────
export function getColors() {
  return request('/colors');
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

// ─────────── Sections ───────────
export function getSections(personId) {
  const qs = personId ? `?person_id=${personId}` : '';
  return request(`/sections${qs}`);
}

export function getSection(id, year, month) {
  let qs = '';
  if (year && month) qs = `?year=${year}&month=${month}`;
  return request(`/sections/${id}${qs}`);
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
export function getStats() {
  return request('/stats');
}
