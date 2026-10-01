import { useThemeMode } from "./themecontext.jsx";
import { theme, fonts } from "./theme.js";

export default function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();
  const isLight = mode === "light";

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
      style={styles.button}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  button: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: `1px solid ${theme.navyLighter}`,
    background: "transparent",
    color: theme.mint,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: fonts.body,
    flexShrink: 0
  }
};