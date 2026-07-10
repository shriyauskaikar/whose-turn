import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getSections, createEntry, deleteEntry, getEntries } from '../lib/api';
import Confetti from '../lib/Confetti';

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function DayDot({ dateStr, entry, dayLabel }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={dateStr}>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dayLabel}</span>
      <div
        className="w-5 h-5 rounded-full"
        style={{
          backgroundColor: entry ? entry.person_color : 'var(--bar-bg)',
          opacity: entry ? 1 : 0.5,
        }}
      />
    </div>
  );
}

function SectionCard({ section, person, onRefresh }) {
  const [miniHistory, setMiniHistory] = useState({});
  const [todaysEntry, setTodaysEntry] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const navigate = useNavigate();
  const today = todayStr();

  useEffect(() => {
    loadHistory();
  }, [section.id]);

  async function loadHistory() {
    try {
      const entries = await getEntries(section.id);
      const map = {};
      const tEntry = entries.find(e => e.date === today);
      setTodaysEntry(tEntry || null);

      for (const entry of entries) {
        map[entry.date] = entry;
      }
      setMiniHistory(map);
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }

  async function handleDidIt() {
    setBusy(true);
    try {
      await createEntry(section.id, person.id, today);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
      await loadHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      if (err.status !== 409) console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!todaysEntry) return;
    setBusy(true);
    try {
      await deleteEntry(todaysEntry.id);
      await loadHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const dayNames = last7Days().map((d, i) => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { date: d, label: labels[new Date(d).getDay()] };
  });

  return (
    <div
      className="rounded-2xl p-5 shadow-sm border border-amber-200/40"
      style={{ backgroundColor: 'var(--card)' }}
    >
      {/* Section name + tap to detail */}
      <button
        onClick={() => navigate(`/section/${section.id}`)}
        className="w-full text-left"
      >
        <h2
          className="text-xl font-semibold mb-3"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--heading)' }}
        >
          {section.name}
        </h2>
      </button>

      {/* 7-day mini strip */}
      <div className="flex justify-between mb-4">
        {dayNames.map(({ date, label }) => (
          <DayDot key={date} dateStr={date} entry={miniHistory[date]} dayLabel={label} />
        ))}
      </div>

      {/* Today's status per member */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Today:</span>
        {section.members.map((m) => {
          const hasEntry = miniHistory[today]?.person_id === m.id;
          return (
            <div
              key={m.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: hasEntry ? `${m.color}20` : 'rgba(0,0,0,0.04)',
                color: hasEntry ? m.color : 'var(--text-muted)',
              }}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
              {m.name}
              {hasEntry && ' ✅'}
            </div>
          );
        })}
      </div>

      {/* Streaks */}
      {section.streaks?.filter(s => s.streak > 0).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>🔥 Streaks:</span>
          {section.streaks.filter(s => s.streak > 0).map(s => (
            <span key={s.person_id} className="text-[10px] font-medium" style={{ color: s.color }}>
              {s.name}: {s.streak} day{s.streak > 1 ? 's' : ''}
            </span>
          ))}
        </div>
      )}

      {/* I Did It / Undo button */}
      {todaysEntry && todaysEntry.person_id === person.id ? (
        <button
          onClick={handleUndo}
          disabled={busy}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all border disabled:opacity-50"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {busy ? '...' : 'Undo — remove my entry'}
        </button>
      ) : (
        <button
          onClick={handleDidIt}
          disabled={busy}
          className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {busy ? '...' : '✅ I did this today!'}
        </button>
      )}

      <Confetti active={confetti} />
    </div>
  );
}

export default function Dashboard() {
  const { person, household } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!person) return;
    loadSections();
  }, [person]);

  async function loadSections() {
    try {
      const data = await getSections(person.id);
      setSections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!person) {
    navigate('/');
    return null;
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--heading)' }}
          >
            Whose Turn
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {household?.name} · Hey, {person.name}!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/stats')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--heading)',
              border: '1px solid rgba(30,74,74,0.15)',
            }}
          >
            Stats
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ color: 'var(--text-light)', backgroundColor: 'var(--card)', border: '1px solid rgba(30,74,74,0.15)' }}
            title="Settings, members & logout"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Sections list */}
      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <p className="text-center" style={{ color: 'var(--text-light)' }}>Loading...</p>
        ) : sections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg mb-2" style={{ color: '#8B7D6A', fontFamily: "'Fraunces', Georgia, serif" }}>
              No sections yet!
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-light)' }}>
              Create your first chore to start tracking.
            </p>
            <button
              onClick={() => navigate('/section/new')}
              className="px-6 py-3 rounded-xl text-white font-semibold text-base shadow-sm"
              style={{ backgroundColor: 'var(--heading)' }}
            >
              + Create a Section
            </button>
          </div>
        ) : (
          sections.map((section) => (
            <SectionCard key={section.id} section={section} person={person} onRefresh={loadSections} />
          ))
        )}
      </div>

      {/* FAB: Create section */}
      {sections.length > 0 && (
        <button
          onClick={() => navigate('/section/new')}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center text-2xl transition-all active:scale-90"
          style={{ backgroundColor: 'var(--accent)' }}
          title="New section"
        >
          +
        </button>
      )}

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-around py-3 px-4 border-t"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center gap-0.5 text-xs font-medium"
          style={{ color: 'var(--heading)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
        <button
          onClick={() => navigate('/section/new')}
          className="flex flex-col items-center gap-0.5 text-xs font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Section
        </button>
        <button
          onClick={() => navigate('/stats')}
          className="flex flex-col items-center gap-0.5 text-xs font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Stats
        </button>
      </nav>
    </div>
  );
}
