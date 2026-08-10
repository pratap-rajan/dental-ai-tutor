import { theme, fonts } from "./theme.js";

export default function Header({ onCtaClick, studentName, onSignOut }) {
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
              <button style={styles.signOutButton} onClick={onSignOut}>Sign out</button>
            </div>
          )}
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
    color: theme.slateLight,
    fontSize: 13,
    whiteSpace: "nowrap",
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  signOutButton: {
    background: "none",
    border: `1px solid ${theme.navyLighter}`,
    color: theme.slateLight,
    fontSize: 12,
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: fonts.body,
    whiteSpace: "nowrap"
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
