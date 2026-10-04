import { useState } from "react";
import { theme, fonts } from "./theme.js";
import ThemeToggle from "./themetoggle.jsx";

export default function Header({ onCtaClick, studentName, onSignOut, onShowReports }) {
  const [signOutHovered, setSignOutHovered] = useState(false);
  const [reportsHovered, setReportsHovered] = useState(false);

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <img src="/assets/planore_logo.png" alt="Plan Ore Academy" style={styles.logo} />
          <span style={styles.wordmark}>PLAN ORE ACADEMY</span>
        </div>

        <div style={styles.right}>
          {studentName && (
            <div style={styles.identity}>
              <span style={styles.studentName}>{studentName}</span>
              <button
                style={{
                  ...styles.reportsButton,
                  borderColor: reportsHovered ? theme.tealGlow : `color-mix(in srgb, ${theme.tealGlow} 53%, transparent)`,
                  color: theme.tealGlow,
                  background: reportsHovered ? "rgba(99,209,230,0.14)" : "rgba(99,209,230,0.06)",
                  boxShadow: reportsHovered ? `0 0 18px -4px color-mix(in srgb, ${theme.tealGlow} 60%, transparent)` : "none"
                }}
                onMouseEnter={() => setReportsHovered(true)}
                onMouseLeave={() => setReportsHovered(false)}
                onClick={onShowReports}
              >
                My Reports
              </button>
              <button
                style={{
                  ...styles.signOutButton,
                  borderColor: signOutHovered ? theme.tealGlow : `color-mix(in srgb, ${theme.tealGlow} 53%, transparent)`,
                  color: theme.tealGlow,
                  background: signOutHovered ? "rgba(99,209,230,0.14)" : "rgba(99,209,230,0.06)",
                  boxShadow: signOutHovered ? `0 0 18px -4px color-mix(in srgb, ${theme.tealGlow} 60%, transparent)` : "none"
                }}
                onMouseEnter={() => setSignOutHovered(true)}
                onMouseLeave={() => setSignOutHovered(false)}
                onClick={onSignOut}
              >
                Sign out
              </button>
            </div>
          )}
          <ThemeToggle />
          <button style={styles.cta} onClick={onCtaClick}>
            Try it now
          </button>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(13, 14, 26, 0.85)",
    backdropFilter: "blur(10px)",
    borderBottom: `1px solid ${theme.navyLighter}`,
    fontFamily: fonts.body
  },
  inner: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  logo: {
    width: 34,
    height: 34,
    flexShrink: 0
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: "0.03em",
    color: theme.teal,
    whiteSpace: "nowrap"
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 14
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  studentName: {
    // Fixed light color, NOT theme.mint — the header's own background
    // (rgba(13,14,26,0.85) below) is a hardcoded dark glass bar that
    // stays dark in both light and dark mode (by design, like a
    // floating navbar), but theme.mint flips to a dark gray in light
    // mode, which made the name unreadable against this always-dark
    // bar. This fixes it in both modes without touching dark mode's
    // already-correct appearance.
    color: "#e8eaed",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  signOutButton: {
    border: "1.5px solid",
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: fonts.body,
    whiteSpace: "nowrap",
    transition: "background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
  },
  reportsButton: {
    // Base shape now matches signOutButton exactly (border color/
    // background/text color are supplied per-instance at the JSX call
    // site, same as signOutButton already does) — this is the "in
    // sync with Sign out" fix: both buttons now read as one matched
    // teal-accented pair instead of Reports looking like a plain
    // gray outline until hovered.
    border: "1.5px solid",
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: fonts.body,
    whiteSpace: "nowrap",
    transition: "background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease"
  },
  cta: {
    background: theme.ctaMint,
    color: "#06231d",
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    padding: "9px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: fonts.display,
    whiteSpace: "nowrap"
  }
};