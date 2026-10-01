import { createContext, useContext, useEffect, useState } from "react";

// Brand/accent colors (teal, ctaMint, purpleGlow, tealGlow, lime,
// danger, and the hero gradient) are IDENTICAL in both modes on
// purpose - only backgrounds, surfaces, and body text invert. This is
// what keeps every tile highlight, button fill, and glow effect
// reading as the same "Plan Ore" brand regardless of light/dark mode.
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
  "--po-lime": "#d4e157",
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

const LIGHT_VALUES = {
  "--po-navy": "#ffffff",
  "--po-navy-light": "#f3f5f7",
  "--po-navy-lighter": "#dde3e8",
  "--po-mint": "#3d6b70",
  "--po-teal": "#00c2cb",
  "--po-teal-dark": "#009aa1",

  "--po-page-bg": "#f7f9fb",
  "--po-page-bg-light": "#ffffff",
  "--po-page-bg-deep-1": "#eee9fb",
  "--po-page-bg-deep-2": "#eaf2f7",
  "--po-purple-wash": "#f1edfd",
  "--po-purple-glow": "#a28ff3",
  "--po-teal-glow": "#63d1e6",
  "--po-hero-gradient-start": "#5fd0c4",
  "--po-hero-gradient-end": "#63c9ec",
  "--po-accent-purple": "#a28ff3",
  "--po-cta-mint": "#72d4c4",
  "--po-lime": "#d4e157",
  "--po-card-bg": "#ffffff",

  "--po-white": "#12151c",
  "--po-ink": "#0f172a",
  "--po-slate": "#64748b",
  "--po-slate-light": "#5b6472",
  "--po-border": "#e2e8f0",
  "--po-surface": "#f8fafc",
  "--po-success": "#16a34a",
  "--po-success-bg": "#dcfce7",
  "--po-danger": "#dc2626"
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