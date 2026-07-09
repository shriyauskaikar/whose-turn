import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, signup as apiSignup, logout as apiLogout } from './api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'whose_turn_token';
const PERSON_KEY = 'whose_turn_person';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [person, setPerson] = useState(() => {
    const stored = localStorage.getItem(PERSON_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [household, setHousehold] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  // On mount, validate existing token
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((data) => {
        setHousehold(data.household);
        setPeople(data.people);
        // If stored person is no longer in the household, clear it
        if (person && !data.people.find((p) => p.id === person.id)) {
          setPerson(null);
          localStorage.removeItem(PERSON_KEY);
        }
      })
      .catch(() => {
        // Token invalid — clear everything
        setToken(null);
        setPerson(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PERSON_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const doLogin = useCallback(async (householdName, password) => {
    const data = await apiLogin(householdName, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setHousehold(data.household);
    setPeople(data.people);
    return data;
  }, []);

  const doSignup = useCallback(async (householdName, password, personName, personColor, personPassword) => {
    const data = await apiSignup(householdName, password, personName, personColor, personPassword);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setHousehold(data.household);
    setPeople(data.people);
    // Auto-select the first person
    const firstPerson = data.people[0];
    localStorage.setItem(PERSON_KEY, JSON.stringify(firstPerson));
    setPerson(firstPerson);
    return data;
  }, []);

  const selectPerson = useCallback((p) => {
    localStorage.setItem(PERSON_KEY, JSON.stringify(p));
    setPerson(p);
  }, []);

  const addPersonLocally = useCallback((p) => {
    setPeople((prev) => [...prev, p]);
  }, []);

  const doLogout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PERSON_KEY);
    setToken(null);
    setPerson(null);
    setHousehold(null);
    setPeople([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        person,
        household,
        people,
        loading,
        login: doLogin,
        signup: doSignup,
        selectPerson,
        addPersonLocally,
        logout: doLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
