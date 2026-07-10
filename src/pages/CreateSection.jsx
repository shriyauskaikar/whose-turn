import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getPeople, createSection } from '../lib/api';

export default function CreateSection() {
  const { person } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [allPeople, setAllPeople] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPeople()
      .then(setAllPeople)
      .catch(console.error);
  }, []);

  function togglePerson(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedIds.length === 0) {
      setError('Select at least one person');
      return;
    }
    setBusy(true);
    try {
      const section = await createSection(name.trim(), selectedIds);
      navigate(`/section/${section.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!person) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: 'var(--heading)' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: 'var(--heading)' }}>
          New Section
        </h1>
      </div>

      <div className="px-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              What's the chore?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Making Tea, Walking the dog, Dishes"
              className="w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--text)',
              }}
              autoFocus
            />
          </div>

          {/* People selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Who does this?
            </label>
            <div className="space-y-2">
              {allPeople.map((p) => {
                const selected = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePerson(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      selected ? 'border-amber-400' : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: selected ? 'rgba(217,119,6,0.08)' : 'var(--card)',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: selected ? 'var(--accent)' : 'var(--border-light)',
                        backgroundColor: selected ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.color }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !name.trim() || selectedIds.length === 0}
            className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-40 shadow-sm"
            style={{ backgroundColor: 'var(--heading)' }}
          >
            {busy ? 'Creating...' : 'Create Section'}
          </button>
        </form>
      </div>
    </div>
  );
}
