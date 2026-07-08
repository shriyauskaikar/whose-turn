import { createContext, useContext, useState, useEffect } from 'react';

const IdentityContext = createContext(null);

const STORAGE_KEY = 'whose_turn_identity';

export function IdentityProvider({ children }) {
  const [person, setPerson] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(false);

  const identify = (p) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setPerson(p);
  };

  const clearIdentity = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPerson(null);
  };

  return (
    <IdentityContext.Provider value={{ person, identify, clearIdentity, loading }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
