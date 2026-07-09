import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getPeople, getColors, createSection, createPerson } from '../lib/api';

export default function CreateSection() {
  const { person } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [allPeople, setAllPeople] = useState([]);
  const [colors, setColors] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(null);

  useEffect(() => {
    Promise.all([getPeople(), getColors()])
      .then(([peopleData, colorsData]) => {
        setAllPeople(peopleData);
        setColors(colorsData);
        const avail = colorsData.find(c => c.available);
        if (avail) setNewColor(avail.hex);
      })
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

  async function handleAddPerson(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const p = await createPerson(newName.trim(), newColor);
      setAllPeople(prev => [...prev, p]);
      setSelectedIds(prev => [...prev, p.id]);
      setShowAddPerson(false);
      setNewName('');
      // Refresh colors
      const colorsData = await getColors();
      setColors(colorsData);
      const avail = colorsData.find(c => c.available);
      if (avail) setNewColor(avail.hex);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!person) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: '#1E4A4A' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
          New Section
        </h1>
      </div>

      <div className="px-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4A3F32' }}>
              What's the chore?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Making Tea, Walking the dog, Dishes"
              className="w-full px-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2"
              style={{
                borderColor: '#D4C9B8',
                backgroundColor: 'rgba(255,255,255,0.7)',
                color: '#2D2A24',
              }}
              autoFocus
            />
          </div>

          {/* People selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4A3F32' }}>
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
                      backgroundColor: selected ? 'rgba(217,119,6,0.08)' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: selected ? '#D97706' : '#C8BBA8',
                        backgroundColor: selected ? '#D97706' : 'transparent',
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
                    <span className="font-medium" style={{ color: '#2D2A24' }}>{p.name}</span>
                  </button>
                );
              })}

              {/* Add person inline */}
              {!showAddPerson ? (
                <button
                  type="button"
                  onClick={() => setShowAddPerson(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all"
                  style={{
                    borderColor: '#C8BBA8',
                    color: '#6B5E4A',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }}
                >
                  + Add someone new
                </button>
              ) : (
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className="w-full px-3 py-2 rounded-lg border text-sm mb-2 focus:outline-none"
                    style={{ borderColor: '#D4C9B8' }}
                  />
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {colors.filter(c => c.available || c.hex === newColor).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        disabled={!c.available}
                        onClick={() => setNewColor(c.hex)}
                        className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all ${
                          newColor === c.hex ? 'ring-2 ring-offset-1 ring-amber-500 scale-110' : ''
                        } ${!c.available ? 'opacity-30' : ''}`}
                        style={{ backgroundColor: c.hex, color: 'white' }}
                      >
                        {!c.available ? '✕' : ''}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      disabled={!newName.trim()}
                      className="flex-1 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-40"
                      style={{ backgroundColor: '#1E4A4A' }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPerson(false)}
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{ color: '#6B5E4A', backgroundColor: 'rgba(0,0,0,0.05)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !name.trim() || selectedIds.length === 0}
            className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-40 shadow-sm"
            style={{ backgroundColor: '#1E4A4A' }}
          >
            {busy ? 'Creating...' : 'Create Section'}
          </button>
        </form>
      </div>
    </div>
  );
}
