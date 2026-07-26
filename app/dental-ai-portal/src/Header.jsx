import { theme, fonts } from "./theme.js";

export default function Header({ onCtaClick }) {
  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <img src="/assets/planore_logo.png" alt="Plan Ore Academy" style={styles.logo} />
          <span style={styles.wordmark}>PLAN ORE ACADEMY</span>
        </div>

        <button style={styles.cta} onClick={onCtaClick}>
          Try it now
        </button>
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
