import { createContext, useContext, useEffect, useState } from "react";

// Brand/accent colors (teal, ctaMint, purpleGlow, tealGlow, lime,
// danger, and the hero gradient) are IDENTICAL in both modes on
// purpose - only backgrounds, surfaces, and body text invert. This is
// what keeps every tile highlight, button fill, and glow effect
// reading as the same "Plan Ore" brand regardless of light/dark mode.
//
// --po-lime was the old yellow accent (#d4e157) - swapped to Google
// Blue (#4285F4) in both modes, same reasoning as above: kept
// identical across light/dark so the T&C checkbox fill and "resend"
// button in Login.jsx (the only consumers of theme.lime) don't flip
// color when the mode toggles.
const DARK_VALUES = {
  "--po-navy": "#293039",
  "--po-navy-light": "#333c47",
  "--po-navy-lighter": "#3d4650",
  "--po-mint": "#c3edef",
  "--po-teal": "#00c2cb",
  "--po-teal-dark": "#009aa1",

  "--po-page-bg": "#04070f",
  "--po-page-bg-light": "#151726",
  "--po-page-bg-deep-1": "#0a0620",
  "--po-page-bg-deep-2": "#060a16",
  "--po-purple-wash": "#181335",
  "--po-purple-glow": "#a28ff3",
  "--po-teal-glow": "#63d1e6",
  "--po-hero-gradient-start": "#5fd0c4",
  "--po-hero-gradient-end": "#63c9ec",
  "--po-accent-purple": "#a28ff3",
  "--po-cta-mint": "#72d4c4",
  "--po-lime": "#4285f4",
  "--po-card-bg": "#0d1021",

  "--po-white": "#ffffff",
  "--po-ink": "#0f172a",
  "--po-slate": "#64748b",
  "--po-slate-light": "#94a3b8",
  "--po-border": "#3d4650",
  "--po-surface": "#151726",
  "--po-success": "#16a34a",
  "--po-success-bg": "#0f2e1a",
  "--po-danger": "#dc2626"
};

// Neutrals/text/borders use Google's standard Material surface
// palette (the same grays behind Gmail/Search/Docs). Brand accents
// (teal, ctaMint, purpleGlow) are left untouched; lime is now also
// Google Blue (#4285F4), matching DARK_VALUES above.
const LIGHT_VALUES = {
  "--po-navy": "#ffffff",
  "--po-navy-light": "#f1f3f4",
  "--po-navy-lighter": "#dadce0",
  "--po-mint": "#5f6368",
  "--po-teal": "#00c2cb",
  "--po-teal-dark": "#009aa1",

  "--po-page-bg": "#f8f9fa",
  "--po-page-bg-light": "#ffffff",
  "--po-page-bg-deep-1": "#f1f3f4",
  "--po-page-bg-deep-2": "#f8f9fa",
  "--po-purple-wash": "#f1edfd",
  "--po-purple-glow": "#a28ff3",
  "--po-teal-glow": "#63d1e6",
  "--po-hero-gradient-start": "#5fd0c4",
  "--po-hero-gradient-end": "#63c9ec",
  "--po-accent-purple": "#a28ff3",
  "--po-cta-mint": "#72d4c4",
  "--po-lime": "#4285f4",
  "--po-card-bg": "#ffffff",

  "--po-white": "#202124",
  "--po-ink": "#202124",
  "--po-slate": "#5f6368",
  "--po-slate-light": "#5f6368",
  "--po-border": "#dadce0",
  "--po-surface": "#f8f9fa",
  "--po-success": "#34a853",
  "--po-success-bg": "#e6f4ea",
  "--po-danger": "#ea4335"
};

const STORAGE_KEY = "planore-theme-mode";

function applyMode(mode) {
  const values = mode === "light" ? LIGHT_VALUES : DARK_VALUES;
  const root = document.documentElement;
  Object.entries(values).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
  root.style.colorScheme = mode;
}

const ThemeModeContext = createContext({ mode: "dark", toggleMode: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem(STORAGE_KEY) || "dark";
  });

  useEffect(() => {
    applyMode(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable (private browsing, etc.) - the mode
      // just won't persist across reloads, not worth blocking on.
    }
  }, [mode]);

  function toggleMode() {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
} 