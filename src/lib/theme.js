// Semantic style helpers — returns inline style objects referencing CSS variables.
// Swap these out if you ever want JS-based theming instead.

export const s = {
  bg: { backgroundColor: 'var(--bg)' },
  card: { backgroundColor: 'var(--card)' },
  cardBorder: { borderColor: 'var(--card-border)' },
  heading: { color: 'var(--heading)' },
  text: { color: 'var(--text)' },
  textSecondary: { color: 'var(--text-secondary)' },
  textMuted: { color: 'var(--text-muted)' },
  textLight: { color: 'var(--text-light)' },
  accent: { color: 'var(--accent)' },
  accentBg: { backgroundColor: 'var(--accent)' },
  border: { borderColor: 'var(--border)' },
  borderLight: { borderColor: 'var(--border-light)' },
  inputBg: { backgroundColor: 'var(--input-bg)' },
  barBg: { backgroundColor: 'var(--bar-bg)' },
  navBg: { backgroundColor: 'var(--nav-bg)' },
  headingFont: { fontFamily: "'Fraunces', Georgia, serif" },
};

// Combine multiple style objects
export function mergeStyles(...styles) {
  return Object.assign({}, ...styles);
}
