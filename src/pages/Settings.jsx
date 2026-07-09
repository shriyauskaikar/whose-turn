import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Settings() {
  const { person, household, people, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  if (!person) { navigate('/'); return null; }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: '#1E4A4A' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>
          Settings
        </h1>
      </div>

      <div className="px-4 max-w-md mx-auto space-y-4 pt-4">
        {/* Current profile */}
        <div className="rounded-2xl p-5 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: '#8B7D6B' }}>CURRENT PROFILE</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: person.color }}>
              {person.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: '#2D2A24' }}>{person.name}</p>
              <p className="text-sm" style={{ color: '#8B7D6B' }}>{household?.name}</p>
            </div>
          </div>
        </div>

        {/* All members */}
        <div className="rounded-2xl p-5 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#8B7D6B' }}>HOUSEHOLD MEMBERS ({people.length})</p>
          <div className="space-y-2">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: p.id === person.id ? 'rgba(217,119,6,0.08)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: p.color }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span className="font-medium" style={{ color: '#2D2A24' }}>{p.name}</span>
                {p.id === person.id && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#D97706', color: 'white' }}>You</span>}
                {p.has_password && <span className="text-xs" style={{ color: '#A89B88' }}>🔒</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl p-5 border border-amber-200/40 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#8B7D6B' }}>ACTIONS</p>

          <button
            onClick={() => navigate('/pick-person')}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-amber-400"
            style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}
          >
            <span className="text-lg">🔄</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#2D2A24' }}>Switch Profile</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Pick a different person or add someone new</p>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-red-300"
            style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}
          >
            <span className="text-lg">🚪</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#DC2626' }}>Log Out</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Sign out of {household?.name} entirely</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
