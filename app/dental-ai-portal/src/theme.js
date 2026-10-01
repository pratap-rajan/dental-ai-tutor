// Base identity colors extracted directly from the Plan Ore logo.
// Every value below is a CSS custom property reference, not a literal
// hex - see ThemeContext.jsx for the actual light/dark hex values and
// the mode-toggle logic. Every component keeps importing `theme`
// exactly as before; switching light/dark just updates what these
// variables resolve to, so no consuming file needs any structural
// change for the toggle to work.
export const theme = {
  navy: "var(--po-navy)",
  navyLight: "var(--po-navy-light)",
  navyLighter: "var(--po-navy-lighter)",
  mint: "var(--po-mint)",
  teal: "var(--po-teal)",
  tealDark: "var(--po-teal-dark)",

  pageBg: "var(--po-page-bg)",
  pageBgLight: "var(--po-page-bg-light)",
  pageBgDeep1: "var(--po-page-bg-deep-1)",
  pageBgDeep2: "var(--po-page-bg-deep-2)",
  purpleWash: "var(--po-purple-wash)",
  purpleGlow: "var(--po-purple-glow)",
  tealGlow: "var(--po-teal-glow)",
  heroGradientStart: "var(--po-hero-gradient-start)",
  heroGradientEnd: "var(--po-hero-gradient-end)",
  accentPurple: "var(--po-accent-purple)",
  ctaMint: "var(--po-cta-mint)",
  lime: "var(--po-lime)",
  cardBg: "var(--po-card-bg)",

  white: "var(--po-white)",
  ink: "var(--po-ink)",
  slate: "var(--po-slate)",
  slateLight: "var(--po-slate-light)",
  border: "var(--po-border)",
  surface: "var(--po-surface)",
  success: "var(--po-success)",
  successBg: "var(--po-success-bg)",
  danger: "var(--po-danger)"
};

export const fonts = {
  display: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace"
};