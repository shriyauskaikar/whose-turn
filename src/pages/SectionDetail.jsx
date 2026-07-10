import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getSection, createEntry, deleteEntry, updateSection, deleteSection, getPeople } from '../lib/api';
import Confetti from '../lib/Confetti';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export default function SectionDetail() {
  const { id } = useParams();
  const { person } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confetti, setConfetti] = useState(false);

  // Edit/delete state
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMembers, setEditMembers] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calendar view state: which year+month to show
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-12

  const todayStrVal = todayStr();

  // Fetch section data for the visible month
  const loadSection = useCallback(async () => {
    try {
      const data = await getSection(id, viewYear, viewMonth);
      setSection(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, viewYear, viewMonth]);

  useEffect(() => {
    setLoading(true);
    loadSection();
  }, [loadSection]);

  // ─── Month navigation ───
  function goPrevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }

  function goNextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  }

  // ─── Edit/Delete section ───
  async function openEditModal() {
    setEditName(section.name);
    setEditMembers(section.members.map(m => m.id));
    try {
      const people = await getPeople();
      setAllPeople(people);
    } catch {}
    setShowEditModal(true);
  }

  function toggleEditMember(id) {
    setEditMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updates = { name: editName.trim() };
      const origIds = section.members.map(m => m.id).sort().join(',');
      const newIds = [...editMembers].sort().join(',');
      if (origIds !== newIds) updates.member_ids = editMembers;
      await updateSection(id, updates);
      setShowEditModal(false);
      setMessage('✅ Section updated!');
      setTimeout(() => setMessage(''), 2000);
      loadSection();
    } catch (err) {
      setMessage('❌ ' + err.message);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteSection(id);
      navigate('/dashboard');
    } catch (err) {
      setMessage('❌ ' + err.message);
      setTimeout(() => setMessage(''), 3000);
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  // Build entry lookup
  const entryMap = {};
  if (section) {
    for (const e of section.entries) {
      entryMap[e.date] = e;
    }
  }

  // ─── Toggle entry ───
  async function handleToggleDate(dateStr) {
    if (!person || !section) return;

    const existing = entryMap[dateStr];
    if (existing) {
      if (existing.person_id !== person.id) return;
      setBusy(true);
      try {
        await deleteEntry(existing.id);
        await loadSection();
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
      }
    } else {
      setBusy(true);
      try {
        await createEntry(section.id, person.id, dateStr);
        if (dateStr === todayStrVal) { setConfetti(true); setTimeout(() => setConfetti(false), 4000); }
        await loadSection();
        setMessage('✅ Logged!');
        setTimeout(() => setMessage(''), 2000);
      } catch (err) {
        if (err.status === 409) {
          // Someone else already logged — reload
          await loadSection();
        } else {
          console.error(err);
        }
      } finally {
        setBusy(false);
      }
    }
  }

  // ─── Calendar grid building ───
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const rows = [];
  let cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(viewYear, viewMonth, d);
    const isToday = dateStr === todayStrVal;
    const isFuture = dateStr > todayStrVal;
    const entry = entryMap[dateStr];

    cells.push({ day: d, dateStr, isToday, isFuture, entry });

    if (cells.length === 7) {
      rows.push(cells);
      cells = [];
    }
  }

  if (cells.length > 0) {
    while (cells.length < 7) cells.push(null);
    rows.push(cells);
  }

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  if (!person) { navigate('/'); return null; }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: 'var(--heading)' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold flex-1" style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--heading)' }}>
          {section?.name || 'Section'}
        </h1>

        {/* Menu button */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-amber-50 transition-all" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border shadow-lg overflow-hidden" style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}>
                <button onClick={() => { setShowMenu(false); setShowEditModal(true); openEditModal(); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-amber-50 transition-all" style={{ color: 'var(--text)' }}>
                  ✏️ Edit section
                </button>
                <button onClick={() => { setShowMenu(false); setConfirmDelete(true); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-red-50 transition-all" style={{ color: 'var(--danger)' }}>
                  🗑️ Delete section
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div className="px-4 pb-2">
          <div className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--heading)', color: 'white' }}>
            {message}
          </div>
        </div>
      )}

      {/* Members row */}
      {section && (
        <div className="px-4 py-2 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Members:</span>
          {section.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${m.color}18`, color: m.color }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              {m.name}
            </div>
          ))}
        </div>
      )}

      {/* Streaks */}
      {section?.streaks?.filter(s => s.streak > 0).length > 0 && (
        <div className="px-4 py-1 flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>🔥 Streaks:</span>
          {section.streaks.filter(s => s.streak > 0).map(s => (
            <span key={s.person_id} className="text-[10px] font-medium" style={{ color: s.color }}>
              {s.name}: {s.streak} day{s.streak > 1 ? 's' : ''}
            </span>
          ))}
        </div>
      )}

      {/* ─────── Proper Month Calendar ─────── */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-4 border border-amber-200/40" style={{ backgroundColor: 'var(--card)' }}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goPrevMonth}
              className="p-2 rounded-lg hover:bg-amber-50 transition-all"
              style={{ color: 'var(--heading)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h2 className="text-base font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--heading)' }}>
              {MONTHS[viewMonth - 1]} {viewYear}
            </h2>

            <button
              onClick={goNextMonth}
              className="p-2 rounded-lg hover:bg-amber-50 transition-all"
              style={{ color: 'var(--heading)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Today button */}
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="mb-3 px-3 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--heading)', color: 'white' }}
            >
              Today
            </button>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((label) => (
              <div key={label} className="text-center text-[10px] font-medium py-1" style={{ color: 'var(--text-muted)' }}>
                {label}
              </div>
            ))}
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-light)' }}>Loading...</div>
          ) : (
            <>
              {/* Calendar grid */}
              {rows.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((cell, ci) => {
                    if (!cell) return <div key={`e-${wi}-${ci}`} className="aspect-square" />;

                    const { day, dateStr, isToday, isFuture, entry } = cell;
                    const canClick = !isFuture && !busy;

                    return (
                      <button
                        key={dateStr}
                        disabled={!canClick}
                        onClick={() => handleToggleDate(dateStr)}
                        className={`relative flex flex-col items-center justify-center aspect-square rounded-lg transition-all ${
                          canClick ? 'hover:bg-amber-50 cursor-pointer active:scale-90' : ''
                        } ${isToday ? 'ring-1 ring-amber-300' : ''}`}
                      >
                        <span
                          className={`text-xs leading-none ${isToday ? 'font-bold' : ''}`}
                          style={{
                            color: isFuture ? 'var(--border)' : isToday ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {day}
                        </span>
                        <div className="h-3 flex items-center justify-center mt-0.5">
                          {entry ? (
                            <div
                              className="w-2.5 h-2.5 rounded-full shadow-sm"
                              style={{ backgroundColor: entry.person_color }}
                              title={`${entry.person_name}`}
                            />
                          ) : isToday ? (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                          ) : (
                            <div className="w-2.5 h-2.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2 pt-3 border-t" style={{ borderColor: 'var(--bar-bg)' }}>
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  Tap a past day to log or undo:
                </span>
                {section?.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.name}
                  </div>
                ))}
                <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--border-light)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--bar-bg)' }} />
                  No one
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Per-person totals */}
      {section && (
        <div className="px-4 pt-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--heading)' }}>All-time Totals</h2>
          <div className="space-y-2">
            {section.totals.map((t) => {
              const maxCount = Math.max(...section.totals.map(x => x.count), 1);
              const pct = (t.count / maxCount) * 100;
              return (
                <div key={t.person_id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.color }}>
                    {t.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium w-16 truncate" style={{ color: 'var(--text)' }}>{t.name}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bar-bg)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}88)` }} />
                  </div>
                  <span className="text-sm font-bold w-8 text-right" style={{ color: 'var(--text-secondary)' }}>{t.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Big action button */}
      {section && (
        <div className="px-4 pt-6">
          {entryMap[todayStrVal]?.person_id === person?.id ? (
            <button
              onClick={() => handleToggleDate(todayStrVal)}
              disabled={busy}
              className="w-full py-4 rounded-xl text-base font-medium border transition-all disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {busy ? '...' : 'Undo — remove today'}
            </button>
          ) : (
            <button
              onClick={() => handleToggleDate(todayStrVal)}
              disabled={busy}
              className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {busy ? '...' : '✅ I did this today!'}
            </button>
          )}
        </div>
      )}

      {section && viewMonth !== today.getMonth() + 1 && (
        <p className="px-4 pt-3 text-xs text-center" style={{ color: 'var(--text-light)' }}>
          Showing {MONTHS[viewMonth - 1]} {viewYear} —{' '}
          <button onClick={goToday} className="underline">jump to this month</button>
        </p>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleSaveEdit} className="w-full max-w-sm p-6 rounded-2xl shadow-xl border border-amber-200/40 space-y-4" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--heading)' }}>Edit Section</h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-1" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none" style={{ borderColor: 'var(--border)', backgroundColor: 'white', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Assign to</label>
              <div className="space-y-1.5">
                {allPeople.map(p => {
                  const selected = editMembers.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleEditMember(p.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${selected ? 'border-amber-400' : 'border-transparent'}`}
                      style={{ backgroundColor: selected ? 'rgba(217,119,6,0.08)' : 'var(--card)' }}>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selected ? 'var(--accent)' : 'var(--border-light)', backgroundColor: selected ? 'var(--accent)' : 'transparent' }}>
                        {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: p.color }}>{p.name[0]}</div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={saving || !editName.trim()} className="w-full py-2.5 rounded-xl text-white font-medium disabled:opacity-40" style={{ backgroundColor: 'var(--heading)' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xs p-6 rounded-2xl shadow-xl border border-red-200/40 space-y-4 text-center" style={{ backgroundColor: 'var(--bg)' }}>
            <p className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--danger)' }}>Delete "{section?.name}"?</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All entries for this section will be permanently deleted. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40" style={{ backgroundColor: 'var(--danger)' }}>
                {saving ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Confetti active={confetti} />
    </div>
  );
}
