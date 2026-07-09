import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const ALL_COLORS = [
  { name: 'Rose', hex: '#E11D48' }, { name: 'Orange', hex: '#EA580C' },
  { name: 'Amber', hex: '#D97706' }, { name: 'Lime', hex: '#65A30D' },
  { name: 'Teal', hex: '#0D9488' }, { name: 'Sky', hex: '#0284C7' },
  { name: 'Indigo', hex: '#4F46E5' }, { name: 'Violet', hex: '#7C3AED' },
  { name: 'Fuchsia', hex: '#C026D3' }, { name: 'Emerald', hex: '#059669' },
  { name: 'Cyan', hex: '#0891B2' }, { name: 'Pink', hex: '#DB2777' },
];

export default function Login() {
  const { login, signup, household, person, selectPerson } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [hhName, setHhName] = useState('');
  const [password, setPassword] = useState('');
  const [yourName, setYourName] = useState('');
  const [yourColor, setYourColor] = useState(ALL_COLORS[0].hex);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already logged in with a person? Skip to dashboard
  if (person) return <Navigate to="/dashboard" replace />;
  // Logged in but no person? Go pick one
  if (household && !person) return <Navigate to="/pick-person" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'signup') {
        await signup(hhName, password, yourName, yourColor);
        navigate('/dashboard');
      } else {
        const data = await login(hhName, password);
        const storedPerson = localStorage.getItem('whose_turn_person');
        if (storedPerson) {
          const p = JSON.parse(storedPerson);
          if (data.people.find(x => x.id === p.id)) {
            selectPerson(p);
            navigate('/dashboard');
            return;
          }
        }
        navigate('/pick-person');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
            Whose Turn
          </h1>
          <p className="text-sm" style={{ color: '#8B7D6B' }}>
            {mode === 'signup' ? 'Create your household' : 'Sign in to your household'}
          </p>
        </div>

        <div className="flex mb-6 rounded-xl overflow-hidden border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: mode === 'login' ? '#1E4A4A' : 'transparent',
              color: mode === 'login' ? 'white' : '#6B5E4A',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: mode === 'signup' ? '#1E4A4A' : 'transparent',
              color: mode === 'signup' ? 'white' : '#6B5E4A',
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border border-amber-200/40 shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#4A3F32' }}>Household Name</label>
            <input type="text" value={hhName} onChange={e => setHhName(e.target.value)}
              placeholder='e.g. "Smith Family"'
              className="w-full px-4 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-2"
              style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }} autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#4A3F32' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 4 characters' : 'Your household password'}
              className="w-full px-4 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-2"
              style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }} />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#4A3F32' }}>Your Name</label>
                <input type="text" value={yourName} onChange={e => setYourName(e.target.value)}
                  placeholder="e.g. Mom"
                  className="w-full px-4 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-2"
                  style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#4A3F32' }}>Your Color</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_COLORS.map(c => (
                    <button key={c.hex} type="button" onClick={() => setYourColor(c.hex)}
                      className={`w-8 h-8 rounded-full transition-all ${yourColor === c.hex ? 'ring-2 ring-offset-2 ring-amber-500 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c.hex }} title={c.name} />
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy || !hhName || !password || (mode === 'signup' && (!yourName || !yourColor))}
            className="w-full py-3 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-40 shadow-sm"
            style={{ backgroundColor: '#D97706' }}>
            {busy ? '...' : mode === 'signup' ? 'Create Household' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
