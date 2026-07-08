import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity } from '../lib/IdentityContext';
import { getPeople, createPerson, getColors } from '../lib/api';

const AVATAR_COLORS = [
  '#E11D48', '#EA580C', '#D97706', '#65A30D', '#0D9488',
  '#0284C7', '#4F46E5', '#7C3AED', '#C026D3', '#059669',
  '#0891B2', '#DB2777',
];

export default function WhoAreYou() {
  const { identify } = useIdentity();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [colors, setColors] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPeople(), getColors()])
      .then(([peopleData, colorsData]) => {
        setPeople(peopleData);
        setColors(colorsData);
        // Pick first available color for new user
        const avail = colorsData.find(c => c.available);
        if (avail) setSelectedColor(avail.hex);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(person) {
    identify(person);
    navigate('/dashboard');
  }

  async function handleAddPerson(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const person = await createPerson(newName.trim(), selectedColor);
      identify(person);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
        <p className="text-stone-500 font-sans">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold mb-2"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              color: '#1E4A4A',
            }}
          >
            Whose Turn?
          </h1>
          <p className="text-base" style={{ color: '#6B5E4A', fontFamily: "'Inter', sans-serif" }}>
            Who are you?
          </p>
        </div>

        {/* Existing people */}
        {people.length > 0 && (
          <div className="space-y-3 mb-8">
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => handleSelect(person)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-amber-400 transition-all bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name[0].toUpperCase()}
                </div>
                <span className="text-lg font-medium" style={{ color: '#2D2A24' }}>
                  {person.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Add new person */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed text-base font-medium transition-all hover:shadow-sm"
            style={{
              borderColor: '#C8BBA8',
              color: '#6B5E4A',
              fontFamily: "'Inter', sans-serif",
              backgroundColor: 'rgba(255,255,255,0.4)',
            }}
          >
            + I'm new here
          </button>
        ) : (
          <form onSubmit={handleAddPerson} className="space-y-4 p-4 rounded-xl bg-white/70 backdrop-blur-sm shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#4A3F32', fontFamily: "'Inter', sans-serif" }}>
                Your name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Shriya"
                className="w-full px-4 py-2.5 rounded-lg border text-base focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#D4C9B8',
                  backgroundColor: 'white',
                  fontFamily: "'Inter', sans-serif",
                  color: '#2D2A24',
                }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#4A3F32', fontFamily: "'Inter', sans-serif" }}>
                Your color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    disabled={!c.available}
                    onClick={() => setSelectedColor(c.hex)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      selectedColor === c.hex ? 'ring-2 ring-offset-2 ring-amber-500 scale-110' : ''
                    } ${!c.available ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c.hex, color: 'white' }}
                    title={c.available ? c.name : `${c.name} (already taken)`}
                  >
                    {!c.available && '✕'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newName.trim() || !selectedColor}
                className="flex-1 py-2.5 rounded-lg text-white font-medium text-base transition-all disabled:opacity-40"
                style={{
                  backgroundColor: '#1E4A4A',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Let's go!
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setError(''); }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  color: '#6B5E4A',
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: 'rgba(0,0,0,0.05)',
                }}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
