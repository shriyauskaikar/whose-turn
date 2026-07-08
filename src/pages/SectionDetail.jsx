import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIdentity } from '../lib/IdentityContext';
import { getSection, createEntry, deleteEntry } from '../lib/api';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function buildCalendarDays() {
  const days = [];
  const today = new Date();
  // Go back to the start of the week (Sunday) of 5 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 34);

  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0],
      dayOfMonth: d.getDate(),
      isToday: d.toISOString().split('T')[0] === todayStr(),
      isFuture: d > today,
    });
  }
  return days;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SectionDetail() {
  const { id } = useParams();
  const { person } = useIdentity();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const today = todayStr();
  const calendarDays = buildCalendarDays();

  useEffect(() => {
    loadSection();
  }, [id]);

  async function loadSection() {
    try {
      const data = await getSection(id);
      setSection(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Build a lookup: dateStr -> entry
  const entryMap = {};
  if (section) {
    for (const e of section.entries) {
      entryMap[e.date] = e;
    }
  }

  async function handleToggleDate(dateStr) {
    if (!person || !section) return;

    const existing = entryMap[dateStr];
    if (existing) {
      // If it's our entry, delete it
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
      // Create entry for this date
      setBusy(true);
      try {
        await createEntry(section.id, person.id, dateStr);
        await loadSection();
        setMessage('✅ Logged!');
        setTimeout(() => setMessage(''), 2000);
      } catch (err) {
        if (err.status === 409) {
          setMessage('Already logged for this date');
          setTimeout(() => setMessage(''), 2000);
        } else {
          console.error(err);
        }
      } finally {
        setBusy(false);
      }
    }
  }

  if (!person) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
        <p style={{ color: '#A89B88' }}>Loading...</p>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#F5F0E8' }}>
        <p style={{ color: '#8B7D6A' }}>Section not found</p>
        <button onClick={() => navigate('/dashboard')} className="text-sm underline" style={{ color: '#1E4A4A' }}>Back to dashboard</button>
      </div>
    );
  }

  // Group calendar into weeks
  const weeks = [];
  for (let i = 0; i < 35; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="p-1" style={{ color: '#1E4A4A' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
          {section.name}
        </h1>
      </div>

      {/* Toast message */}
      {message && (
        <div className="px-4 pb-2">
          <div className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#1E4A4A', color: 'white' }}>
            {message}
          </div>
        </div>
      )}

      {/* Members row */}
      <div className="px-4 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium" style={{ color: '#8B7D6B' }}>Members:</span>
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

      {/* Calendar */}
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold mb-2" style={{ color: '#1E4A4A' }}>History (last 5 weeks)</h2>
        <div
          className="rounded-2xl p-4 border border-amber-200/40"
          style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
        >
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-center text-[10px] font-medium py-1" style={{ color: '#8B7D6B' }}>
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day) => {
                const entry = entryMap[day.dateStr];
                const isClickable = !day.isFuture && person;
                // Only show today & past as clickable
                return (
                  <button
                    key={day.dateStr}
                    disabled={!isClickable || busy}
                    onClick={() => handleToggleDate(day.dateStr)}
                    className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all ${
                      isClickable ? 'hover:bg-amber-50 cursor-pointer active:scale-90' : ''
                    } ${day.isToday ? 'ring-1 ring-amber-300' : ''}`}
                  >
                    <span
                      className={`text-xs font-medium ${day.isToday ? 'font-bold' : ''}`}
                      style={{
                        color: day.isFuture ? '#C8BBA8' : day.isToday ? '#D97706' : '#4A3F32',
                      }}
                    >
                      {day.dayOfMonth}
                    </span>
                    {entry ? (
                      <div
                        className="w-5 h-5 rounded-full mt-0.5 border border-white/50 shadow-sm"
                        style={{ backgroundColor: entry.person_color }}
                        title={`${entry.person_name} — ${day.dateStr}`}
                      />
                    ) : (
                      <div className="w-5 h-5 mt-0.5" />
                    )}
                    {/* Today indicator */}
                    {day.isToday && !entry && (
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{ backgroundColor: '#D97706' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t" style={{ borderColor: '#E0D8CC' }}>
            <span className="text-[10px] font-medium" style={{ color: '#8B7D6B' }}>Tap a past day to log/undo:</span>
            {section.members.map((m) => (
              <div key={m.id} className="flex items-center gap-1 text-[10px]" style={{ color: '#8B7D6B' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                {m.name}
              </div>
            ))}
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#8B7D6B' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E0D8CC' }} />
              No one
            </div>
          </div>
        </div>
      </div>

      {/* Per-person totals */}
      <div className="px-4 pt-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#1E4A4A' }}>Totals</h2>
        <div className="space-y-2">
          {section.totals.map((t) => {
            const maxCount = Math.max(...section.totals.map(x => x.count), 1);
            const pct = (t.count / maxCount) * 100;
            return (
              <div key={t.person_id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.color }}>
                  {t.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium w-20" style={{ color: '#2D2A24' }}>{t.name}</span>
                <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: '#E0D8CC' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${t.color}, ${t.color}88)`,
                    }}
                  />
                </div>
                <span className="text-sm font-bold w-8 text-right" style={{ color: '#4A3F32' }}>{t.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Big "I did this today" button */}
      <div className="px-4 pt-6">
        {entryMap[today]?.person_id === person.id ? (
          <button
            onClick={() => handleToggleDate(today)}
            disabled={busy}
            className="w-full py-4 rounded-xl text-base font-medium border transition-all disabled:opacity-50"
            style={{ borderColor: '#D4C9B8', color: '#8B7D6B' }}
          >
            {busy ? '...' : 'Undo — remove today'}
          </button>
        ) : (
          <button
            onClick={() => handleToggleDate(today)}
            disabled={busy}
            className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: '#D97706' }}
          >
            {busy ? '...' : '✅ I did this today!'}
          </button>
        )}
      </div>
    </div>
  );
}
