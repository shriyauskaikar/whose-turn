import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { changeHouseholdPassword, changeHouseholdName, deleteHousehold, deletePerson, updatePerson, setPersonPassword, getColors } from '../lib/api';

export default function Settings() {
  const { person, household, people, logout, selectPerson } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState(null); // null | 'password' | 'name' | 'delete' | 'person-...'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Household password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  // Household name change
  const [newName, setNewName] = useState('');

  // Delete household
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Person editing
  const [editingPerson, setEditingPerson] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPin, setEditPin] = useState('');
  const [colors, setColors] = useState([]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPw.length < 4) { setError('New password must be at least 4 characters'); return; }
    setBusy(true);
    try {
      await changeHouseholdPassword(currentPw, newPw);
      setSuccess('Password changed!');
      setCurrentPw(''); setNewPw('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleChangeName(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newName.trim()) { setError('Name cannot be empty'); return; }
    setBusy(true);
    try {
      await changeHouseholdName(newName.trim());
      setSuccess(`Renamed to "${newName.trim()}"!`);
      setNewName('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleDeleteHousehold(e) {
    e.preventDefault();
    setError('');
    if (deleteConfirm !== household.name) {
      setError('Type the household name exactly to confirm');
      return;
    }
    setBusy(true);
    try {
      await deleteHousehold();
      await logout();
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleDeletePerson(personId, personName) {
    if (!window.confirm(`Remove "${personName}" from the household? All their entries will be deleted too.`)) return;
    setBusy(true);
    try {
      await deletePerson(personId);
      if (personId === person.id) {
        await logout();
        navigate('/');
      } else {
        window.location.reload();
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function startEditPerson(p) {
    setEditingPerson(p);
    setEditName(p.name);
    setEditColor(p.color);
    setEditPin('');
    getColors().then(setColors).catch(() => {});
  }

  async function handleEditPerson(e) {
    e.preventDefault();
    if (!editingPerson) return;
    setError(''); setSuccess('');
    setBusy(true);
    try {
      const updates = {};
      if (editName !== editingPerson.name) updates.name = editName;
      if (editColor !== editingPerson.color) updates.color = editColor;
      if (Object.keys(updates).length > 0) {
        const updated = await updatePerson(editingPerson.id, updates);
        selectPerson(updated);
      }
      if (editPin !== '') {
        await setPersonPassword(editingPerson.id, editPin || null);
      }
      setSuccess('Profile updated!');
      setEditingPerson(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleRemovePin(personId) {
    if (!window.confirm('Remove PIN from this profile?')) return;
    setBusy(true);
    try {
      await setPersonPassword(personId, null);
      setSuccess('PIN removed!');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!person) { navigate('/'); return null; }

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
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

      <div className="px-4 max-w-md mx-auto space-y-4 pt-2">
        {/* Toast */}
        {success && <div className="px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#0D9488' }}>{success}</div>}
        {error && <div className="px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#DC2626' }}>{error}</div>}

        {/* Current profile */}
        <div className="rounded-2xl p-5 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#8B7D6B' }}>YOUR PROFILE</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: person.color }}>
              {person.name[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold" style={{ color: '#2D2A24' }}>{person.name}</p>
              <p className="text-sm" style={{ color: '#8B7D6B' }}>{household?.name}</p>
            </div>
            <button onClick={() => startEditPerson(person)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: '#1E4A4A', backgroundColor: 'rgba(30,74,74,0.1)' }}>
              Edit
            </button>
          </div>
        </div>

        {/* Household members */}
        <div className="rounded-2xl p-5 border border-amber-200/40" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#8B7D6B' }}>ALL PROFILES ({people.length})</p>
          <div className="space-y-1.5">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: p.id === person.id ? 'rgba(217,119,6,0.08)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: p.color }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span className="font-medium flex-1 text-sm" style={{ color: '#2D2A24' }}>{p.name}</span>
                {p.id === person.id && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#D97706', color: 'white' }}>You</span>}
                {p.has_password && <span className="text-xs" style={{ color: '#A89B88' }}>🔒</span>}
                {p.id !== person.id && (
                  <button onClick={() => handleDeletePerson(p.id, p.name)} className="text-xs p-1 rounded hover:bg-red-100" style={{ color: '#A89B88' }} title={`Remove ${p.name}`}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl p-5 border border-amber-200/40 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#8B7D6B' }}>ACTIONS</p>

          <button onClick={() => navigate('/pick-person')} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-amber-400" style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}>
            <span className="text-lg">🔄</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#2D2A24' }}>Switch Profile</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Pick a different person or add someone new</p>
            </div>
          </button>

          <button onClick={() => { setActiveSection(activeSection === 'password' ? null : 'password'); setError(''); setSuccess(''); }} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-amber-400" style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}>
            <span className="text-lg">🔑</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#2D2A24' }}>Change Household Password</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Update the main login password</p>
            </div>
          </button>

          {activeSection === 'password' && (
            <form onSubmit={handleChangePassword} className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: '#D4C9B8' }} />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 4 chars)" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: '#D4C9B8' }} />
              <button type="submit" disabled={busy || !currentPw || !newPw} className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40" style={{ backgroundColor: '#1E4A4A' }}>
                {busy ? '...' : 'Update Password'}
              </button>
            </form>
          )}

          <button onClick={() => { setActiveSection(activeSection === 'name' ? null : 'name'); setError(''); setSuccess(''); }} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-amber-400" style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}>
            <span className="text-lg">✏️</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#2D2A24' }}>Rename Household</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Change your household name</p>
            </div>
          </button>

          {activeSection === 'name' && (
            <form onSubmit={handleChangeName} className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New household name" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: '#D4C9B8' }} />
              <button type="submit" disabled={busy || !newName.trim()} className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40" style={{ backgroundColor: '#1E4A4A' }}>
                {busy ? '...' : 'Rename'}
              </button>
            </form>
          )}

          <button onClick={() => { setActiveSection(activeSection === 'delete' ? null : 'delete'); setError(''); setSuccess(''); }} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-red-300" style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}>
            <span className="text-lg">🗑️</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#DC2626' }}>Delete Household</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Permanently delete everything</p>
            </div>
          </button>

          {activeSection === 'delete' && (
            <form onSubmit={handleDeleteHousehold} className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <p className="text-xs" style={{ color: '#DC2626' }}>Type <strong>{household?.name}</strong> to confirm permanent deletion of all data:</p>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={household?.name} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: '#D4C9B8' }} />
              <button type="submit" disabled={busy || deleteConfirm !== household?.name} className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40" style={{ backgroundColor: '#DC2626' }}>
                {busy ? '...' : 'Permanently Delete'}
              </button>
            </form>
          )}

          <button onClick={async () => { await logout(); navigate('/'); }} className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-red-300" style={{ borderColor: '#D4C9B8', backgroundColor: 'white' }}>
            <span className="text-lg">🚪</span>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: '#DC2626' }}>Log Out</p>
              <p className="text-xs" style={{ color: '#8B7D6B' }}>Sign out of {household?.name}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Edit person modal */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleEditPerson} className="w-full max-w-sm p-6 rounded-2xl shadow-xl border border-amber-200/40 space-y-4" style={{ backgroundColor: '#F5F0E8' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1E4A4A' }}>Edit Profile</h2>
              <button type="button" onClick={() => setEditingPerson(null)} className="p-1" style={{ color: '#8B7D6B' }}>✕</button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4A3F32' }}>Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4A3F32' }}>Color</label>
              <div className="flex flex-wrap gap-2">
                {(colors.length > 0 ? colors : [{ hex: editColor, available: true }]).map((c) => {
                  const isUsed = !c.available && c.hex !== editingPerson.color;
                  return (
                    <button key={c.hex} type="button" disabled={isUsed} onClick={() => setEditColor(c.hex)}
                      className={`w-7 h-7 rounded-full transition-all ${editColor === c.hex ? 'ring-2 ring-offset-1 ring-amber-500 scale-110' : 'hover:scale-110'} ${isUsed ? 'opacity-30 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: c.hex }}>
                      {isUsed && <span className="flex items-center justify-center text-white text-[8px] font-bold">✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4A3F32' }}>
                Profile PIN <span className="font-normal" style={{ color: '#A89B88' }}>(leave blank to keep current)</span>
              </label>
              <input type="password" value={editPin} onChange={e => setEditPin(e.target.value)} placeholder="New PIN or blank" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: '#D4C9B8', backgroundColor: 'white', color: '#2D2A24' }} />
              {editingPerson.has_password && (
                <button type="button" onClick={() => handleRemovePin(editingPerson.id)} className="text-xs mt-1 underline" style={{ color: '#DC2626' }}>Remove PIN</button>
              )}
            </div>

            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl text-white font-medium disabled:opacity-40" style={{ backgroundColor: '#1E4A4A' }}>
              {busy ? '...' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
