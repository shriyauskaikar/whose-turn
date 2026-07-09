import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getStats } from '../lib/api';

function Bar({ value, max, color, label, showLabel = true }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs font-medium w-16 truncate text-right shrink-0" style={{ color: '#4A3F32' }}>
          {label}
        </span>
      )}
      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: '#E0D8CC' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
          }}
        />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color: '#4A3F32' }}>{value}</span>
    </div>
  );
}

export default function Stats() {
  const { person } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!person) return;
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [person]);

  if (!person) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
        <p style={{ color: '#A89B88' }}>Loading stats...</p>
      </div>
    );
  }

  const maxTotal = Math.max(...(stats?.all_totals?.map(t => t.count) || [0]), 1);

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
          Stats
        </h1>
      </div>

      {/* Overall totals */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-5 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1E4A4A' }}>All-time totals</h2>
          <div className="space-y-2">
            {stats?.all_totals?.map((t) => (
              <Bar key={t.id} value={t.count} max={maxTotal} color={t.color} label={t.name} />
            )) || <p className="text-sm" style={{ color: '#A89B88' }}>No entries yet</p>}
          </div>
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="px-4 pt-4 space-y-4">
        <h2 className="text-sm font-semibold px-1" style={{ color: '#1E4A4A' }}>Per section</h2>
        {stats?.per_section?.length === 0 && (
          <p className="text-sm px-1" style={{ color: '#A89B88' }}>No sections yet</p>
        )}
        {stats?.per_section?.map((section) => {
          const maxCount = Math.max(...section.people.map(p => p.count), 1);
          return (
            <div
              key={section.section_id}
              className="rounded-2xl p-4 border border-amber-200/40"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
            >
              <button
                onClick={() => navigate(`/section/${section.section_id}`)}
                className="text-left mb-2"
              >
                <h3
                  className="font-medium"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}
                >
                  {section.section_name}
                </h3>
              </button>
              <div className="space-y-1.5">
                {section.people.map((p) => (
                  <Bar key={p.person_id} value={p.count} max={maxCount} color={p.person_color} label={p.person_name} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-around py-3 px-4 border-t"
        style={{
          backgroundColor: 'rgba(245, 240, 232, 0.95)',
          borderColor: '#D4C9B8',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center gap-0.5 text-xs font-medium"
          style={{ color: '#8B7D6B' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
        <button
          onClick={() => navigate('/section/new')}
          className="flex flex-col items-center gap-0.5 text-xs font-medium"
          style={{ color: '#8B7D6B' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Section
        </button>
        <button
          onClick={() => navigate('/stats')}
          className="flex flex-col items-center gap-0.5 text-xs font-medium"
          style={{ color: '#1E4A4A' }}
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
