// Base identity colors extracted directly from the Plan Ore logo.
// Accent/interactive colors (heroGradientStart/End, accentPurple,
// pageBg) are a deep-navy + teal-to-cyan gradient + soft purple
// system, in the spirit of modern dark SaaS product sites, tuned to
// coordinate with the logo's existing teal rather than clash with it.
export const theme = {
  navy: "#293039",         // deep background (logo)
  navyLight: "#333c47",    // card / raised surface on navy
  navyLighter: "#3d4650",  // hover / border on navy
  mint: "#c3edef",         // soft mint text / accents (logo)
  teal: "#00c2cb",         // bright teal — primary accent (logo)
  tealDark: "#009aa1",     // teal hover state

  // Deep hero background + gradient accent system
  pageBg: "#04070f",         // near-black navy, deepest background tone
  pageBgLight: "#151726",    // slightly raised panel on pageBg
  purpleWash: "#181335",     // saturated purple wash for background gradients
  purpleGlow: "#a28ff3",     // bright purple glow accent
  tealGlow: "#63d1e6",       // bright teal-cyan glow accent
  heroGradientStart: "#5fd0c4", // teal end of the headline gradient
  heroGradientEnd: "#63c9ec",   // cyan-blue end of the headline gradient
  accentPurple: "#a28ff3",      // soft lavender-purple, secondary accent
  ctaMint: "#72d4c4",           // bright mint CTA button fill

  white: "#ffffff",
  ink: "#0f172a",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  surface: "#f8fafc",
  success: "#16a34a",
  successBg: "#dcfce7",
  danger: "#dc2626"
};

export const fonts = {
  display: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace"
};
