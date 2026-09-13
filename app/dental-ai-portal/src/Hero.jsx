import { theme, fonts } from "./theme.js";

export default function Hero({ onCtaClick }) {
  return (
    <section style={styles.section}>
      <div style={styles.inner}>
        <img src="/assets/planore_logo.png" alt="Plan Ore" style={styles.logo} />

        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          New · AI feedback for ORE &amp; LDS candidates
        </div>

        <h1 style={styles.headline}>
          Practice faster with your own
          <br />
          <span style={styles.headlineGradient}>ORE Buddy</span> — AI Study Pal
        </h1>

        <p style={styles.subhead}>
          Upload your OSCE, SCR, or DTP practice recording and get
          structured, examiner-style feedback within minutes — no waiting
          for a tutor slot, no scheduling required. Every report is saved
          to your portal, so you can come back and view it anytime.
        </p>

        <div style={styles.ctaRow}>
          <button style={styles.ctaPrimary} onClick={onCtaClick}>
            Try it now →
          </button>
          <a href="#how-it-works" style={styles.ctaSecondary}>
            See how it works
          </a>
        </div>

        <p style={styles.microcopy}>No sign-up required. Free for enrolled students.</p>

        <div style={styles.pillRow}>
          <Pill>Case-based ORE &amp; LDS practice</Pill>
          <Pill>Examiner-style scorecards</Pill>
          <Pill>Feedback by email</Pill>
        </div>
      </div>
    </section>
  );
}

function Pill({ children }) {
  return (
    <span style={styles.pill}>
      <CheckMark />
      {children}
    </span>
  );
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.teal} strokeWidth="2.5" style={{ flexShrink: 0 }}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  section: {
    background: [
      `radial-gradient(ellipse 900px 500px at 22% 10%, rgba(162,143,243,0.32), transparent 60%)`,
      `radial-gradient(ellipse 700px 500px at 78% 78%, rgba(99,209,230,0.28), transparent 55%)`,
      `radial-gradient(ellipse 600px 450px at 15% 85%, rgba(162,143,243,0.22), transparent 55%)`,
      `linear-gradient(180deg, ${theme.pageBg} 0%, #0a0620 35%, #060a16 70%, ${theme.pageBg} 100%)`
    ].join(", "),
    padding: "3.5rem 1.5rem 4rem",
    fontFamily: fonts.body
  },
  inner: {
    maxWidth: 720,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center"
  },
  logo: { width: 132, height: 132, marginBottom: "1.25rem" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(162, 143, 243, 0.10)",
    border: `1px solid ${theme.accentPurple}`,
    color: theme.mint,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontFamily: fonts.mono,
    padding: "6px 16px",
    borderRadius: 999,
    marginBottom: "1.5rem"
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: theme.ctaMint,
    display: "inline-block"
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: "clamp(32px, 5vw, 52px)",
    fontWeight: 700,
    lineHeight: 1.12,
    color: theme.white,
    margin: "0 0 1.25rem"
  },
  headlineGradient: {
    background: `linear-gradient(90deg, ${theme.heroGradientStart}, ${theme.heroGradientEnd})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text"
  },
  subhead: {
    fontSize: 18,
    lineHeight: 1.6,
    color: theme.mint,
    opacity: 0.8,
    maxWidth: 560,
    margin: "0 0 2rem"
  },
  ctaRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "0.75rem"
  },
  ctaPrimary: {
    background: theme.ctaMint,
    color: "#06231d",
    border: "none",
    fontSize: 16,
    fontWeight: 700,
    padding: "14px 28px",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: fonts.display
  },
  ctaSecondary: {
    display: "inline-flex",
    alignItems: "center",
    color: theme.mint,
    fontSize: 16,
    fontWeight: 500,
    padding: "14px 20px",
    textDecoration: "none",
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 10
  },
  microcopy: {
    fontSize: 13,
    color: theme.slateLight,
    margin: "0 0 2rem"
  },
  pillRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "3rem"
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: theme.mint,
    background: "rgba(195, 237, 239, 0.06)",
    border: `1px solid ${theme.navyLighter}`,
    padding: "6px 14px",
    borderRadius: 999
  }
};