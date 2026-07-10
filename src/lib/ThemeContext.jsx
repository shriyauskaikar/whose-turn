import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const colors = {
  light: {
    bg: '#F5F0E8',
    card: 'rgba(255,255,255,0.7)',
    cardBorder: 'rgba(217,119,6,0.1)',
    text: '#2D2A24',
    textSecondary: '#6B5E4A',
    textMuted: '#8B7D6B',
    textLight: '#A89B88',
    heading: '#1E4A4A',
    accent: '#D97706',
    border: '#D4C9B8',
    borderLight: '#C8BBA8',
    inputBg: 'white',
    barBg: '#E0D8CC',
    navBg: 'rgba(245,240,232,0.95)',
    danger: '#DC2626',
    success: '#0D9488',
  },
  dark: {
    bg: '#1A1A2E',
    card: 'rgba(30,30,50,0.85)',
    cardBorder: 'rgba(217,119,6,0.15)',
    text: '#E8E0D8',
    textSecondary: '#B8AFA0',
    textMuted: '#8B7D6B',
    textLight: '#6B5E4A',
    heading: '#E8D5B0',
    accent: '#F0B040',
    border: '#3A3A50',
    borderLight: '#4A4A60',
    inputBg: '#2A2A40',
    barBg: '#3A3A50',
    navBg: 'rgba(26,26,46,0.95)',
    danger: '#FF6B6B',
    success: '#4DB8A8',
  },
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('whose_turn_dark');
    return stored === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('whose_turn_dark', isDark);
  }, [isDark]);

  const toggle = useCallback(() => setIsDark(p => !p), []);

  const theme = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggle, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
