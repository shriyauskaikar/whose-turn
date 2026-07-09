import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getColors, getPeople, createPerson } from '../lib/api';

export default function ManagePeople() {
  const { person, logout } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [colors, setColors] = useState([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [peopleData, colorsData] = await Promise.all([
      getPeople(),
      getColors(),
    ]);
    setPeople(peopleData);
    setColors(colorsData);
    const avail = colorsData.find(c => c.available);
    if (avail) setNewColor(avail.hex);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await createPerson(newName.trim(), newColor, newPin || undefined);
      setSuccess(`Added ${newName.trim()}!`);
      setNewName('');
      setNewPin('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!person) { navigate('/'); return null; }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: '#1E4A4A' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
          Manage Profiles
        </h1>
      </div>

      <div className="px-4 max-w-md mx-auto space-y-6">
        {/* Current profiles */}
        <div className="rounded-2xl p-4 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1E4A4A' }}>Current Profiles</h2>
          {people.length === 0 ? (
            <p className="text-sm" style={{ color: '#A89B88' }}>No profiles yet</p>
          ) : (
            <div className="space-y-2">
              {people.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: p.color }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="font-medium flex-1" style={{ color: '#2D2A24' }}>{p.name}</span>
                  {p.has_password && <span className="text-xs" style={{ color: '#8B7D6B' }}>🔒 PIN</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new profile */}
        <div className="rounded-2xl p-4 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1E4A4A' }}>Add a Profile</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name"
              className="w-full px-4 py-2.5 rounded-lg border text-base focus:outline-none"
              style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }}
              autoFocus
            />

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4A3F32' }}>Color</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    disabled={!c.available}
                    onClick={() => setNewColor(c.hex)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newColor === c.hex ? 'ring-2 ring-offset-2 ring-amber-500 scale-110' : 'hover:scale-110'
                    } ${!c.available ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.available ? c.name : `${c.name} (taken)`}
                  >
                    {!c.available && <span className="flex items-center justify-center text-white text-xs font-bold">✕</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4A3F32' }}>
                Profile PIN <span className="font-normal" style={{ color: '#A89B88' }}>(optional)</span>
              </label>
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full px-4 py-2.5 rounded-lg border text-base focus:outline-none"
                style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm" style={{ color: '#0D9488' }}>{success}</p>}

            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="w-full py-2.5 rounded-xl text-white font-medium disabled:opacity-40 transition-all"
              style={{ backgroundColor: '#1E4A4A' }}
            >
              {busy ? 'Adding...' : 'Add Profile'}
            </button>
          </form>
        </div>

        {/* Account actions */}
        <div className="flex justify-center gap-4 py-4">
          <button
            onClick={() => navigate('/pick-person')}
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: '#6B5E4A' }}
          >
            Switch profile
          </button>
          <span style={{ color: '#C8BBA8' }}>·</span>
          <button
            onClick={logout}
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: '#A89B88' }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
