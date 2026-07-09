import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getColors, createPerson, verifyPerson } from '../lib/api';

export default function PickPerson() {
  const { household, people, selectPerson, addPersonLocally, logout } = useAuth();
  const navigate = useNavigate();
  const [colors, setColors] = useState([]);
  const [unlockingPerson, setUnlockingPerson] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);

  // Add self state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    getColors().then(setColors).catch(console.error);
  }, []);

  useEffect(() => {
    if (colors.length > 0 && !newColor) {
      const avail = colors.find(c => c.available);
      if (avail) setNewColor(avail.hex);
    }
  }, [colors]);

  if (!household) return <Navigate to="/" replace />;

  function handleSelect(p) {
    if (p.has_password) {
      setUnlockingPerson(p);
      setPinValue('');
      setPinError('');
    } else {
      selectPerson(p);
      navigate('/dashboard');
    }
  }

  async function handleUnlock(e) {
    e.preventDefault();
    if (!pinValue) return;
    setBusy(true);
    setPinError('');
    try {
      await verifyPerson(unlockingPerson.id, pinValue);
      selectPerson(unlockingPerson);
      navigate('/dashboard');
    } catch (err) {
      setPinError(err.message || 'Wrong PIN');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSelf(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setAddError('');
    try {
      const p = await createPerson(newName.trim(), newColor, newPin || undefined);
      addPersonLocally(p);
      selectPerson(p);
      navigate('/dashboard');
    } catch (err) {
      setAddError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-1 shrink-0" style={{ color: '#1E4A4A' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
              Who are you?
            </h1>
            <p className="text-sm" style={{ color: '#8B7D6B' }}>
              {household.name}
            </p>
          </div>
        </div>

        {/* Existing profiles */}
        {people.length > 0 && (
          <div className="space-y-2 mb-4">
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-transparent hover:border-amber-400 transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: p.color }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span className="text-lg font-medium flex-1 text-left" style={{ color: '#2D2A24' }}>{p.name}</span>
                {p.has_password && (
                  <span className="text-base" title="Profile locked">🔒</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Add self */}
        {!showAdd ? (
          <button
            onClick={() => { setShowAdd(true); setAddError(''); }}
            className="w-full py-3 rounded-xl border-2 border-dashed text-base font-medium transition-all"
            style={{ borderColor: '#C8BBA8', color: '#6B5E4A', backgroundColor: 'rgba(255,255,255,0.4)' }}
          >
            + I'm new — add me
          </button>
        ) : (
          <form onSubmit={handleAddSelf} className="space-y-3 p-4 rounded-2xl border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Your name"
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

            {addError && <p className="text-sm text-red-600">{addError}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !newName.trim()}
                className="flex-1 py-2.5 rounded-lg text-white font-medium disabled:opacity-40"
                style={{ backgroundColor: '#1E4A4A' }}
              >
                {busy ? '...' : 'Add me!'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddError(''); }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: '#6B5E4A', backgroundColor: 'rgba(0,0,0,0.05)' }}
              >
                Back
              </button>
            </div>
          </form>
        )}

        <button
          onClick={logout}
          className="w-full mt-6 py-2 text-sm text-center"
          style={{ color: '#A89B88' }}
        >
          Switch household
        </button>
      </div>

      {/* PIN unlock modal */}
      {unlockingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleUnlock} className="w-full max-w-xs p-6 rounded-2xl shadow-xl border border-amber-200/40" style={{ backgroundColor: '#F5F0E8' }}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2" style={{ backgroundColor: unlockingPerson.color }}>
                {unlockingPerson.name[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
                {unlockingPerson.name}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#8B7D6B' }}>Enter your profile PIN</p>
            </div>
            <input
              type="password"
              value={pinValue}
              onChange={e => setPinValue(e.target.value)}
              placeholder="PIN"
              className="w-full px-4 py-3 rounded-xl border text-lg text-center tracking-widest focus:outline-none focus:ring-2"
              style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }}
              autoFocus
              maxLength={20}
            />
            {pinError && <p className="text-sm text-red-600 mt-2 text-center">{pinError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={busy || !pinValue}
                className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-40"
                style={{ backgroundColor: '#D97706' }}
              >
                {busy ? '...' : 'Unlock'}
              </button>
              <button
                type="button"
                onClick={() => { setUnlockingPerson(null); setPinError(''); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: '#6B5E4A', backgroundColor: 'rgba(0,0,0,0.05)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
