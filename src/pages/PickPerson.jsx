import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { verifyPerson } from '../lib/api';

export default function PickPerson() {
  const { household, people, selectPerson, logout } = useAuth();
  const navigate = useNavigate();
  const [unlockingPerson, setUnlockingPerson] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
            Who are you?
          </h1>
          <p className="text-sm" style={{ color: '#8B7D6B' }}>
            Household: {household.name}
          </p>
        </div>

        {people.length > 0 ? (
          <div className="space-y-2 mb-6">
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
        ) : (
          <p className="text-center py-4" style={{ color: '#8B7D6B' }}>
            No profiles yet. Ask the household admin to add you.
          </p>
        )}

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

        <button
          onClick={logout}
          className="w-full mt-6 py-2 text-sm text-center"
          style={{ color: '#A89B88' }}
        >
          Switch household
        </button>
      </div>
    </div>
  );
}
