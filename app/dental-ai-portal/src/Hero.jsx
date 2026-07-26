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
          Upload your OSCE or DTP practice recording and get structured,
          examiner-style feedback within minutes — no waiting for a tutor
          slot, no scheduling required.
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

        <DemoCard />
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

function DemoCard() {
  return (
    <div style={styles.demoCard}>
      <div style={styles.demoHeader}>
        <div style={styles.demoHeaderLeft}>
          <span style={styles.demoDotRow}>
            <span style={{ ...styles.demoDot, background: "#f87171" }} />
            <span style={{ ...styles.demoDot, background: "#fbbf24" }} />
            <span style={{ ...styles.demoDot, background: "#4ade80" }} />
          </span>
          <span style={styles.demoTitle}>Case 2 · Amalgam toxicity concerns</span>
        </div>
        <span style={styles.demoStatus}>Feedback ready</span>
      </div>

      <div style={styles.demoBody}>
        <div style={styles.demoScoreRow}>
          <div>
            <div style={styles.demoScoreNum}>75%</div>
            <div style={styles.demoScoreLabel}>Overall score</div>
          </div>
          <div style={styles.demoGradeChip}>Meets standard</div>
        </div>

        <div style={styles.demoDivider} />

        <div style={styles.demoFeedbackRow}>
          <span style={styles.demoFeedbackDot} />
          <div>
            <div style={styles.demoFeedbackTitle}>WHO safe limits &amp; statistics</div>
            <div style={styles.demoFeedbackText}>
              Correctly cited 30 mcg/day vs 7.4 mcg/day — clear, patient-friendly comparison.
            </div>
          </div>
        </div>
        <div style={styles.demoFeedbackRow}>
          <span style={{ ...styles.demoFeedbackDot, background: theme.mint, opacity: 0.5 }} />
          <div>
            <div style={styles.demoFeedbackTitle}>FDA guidance &amp; clinical evidence</div>
            <div style={styles.demoFeedbackText}>
              Partial coverage — the full four-point FDA position should be stated.
            </div>
          </div>
        </div>
      </div>
    </div>
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
  },
  demoCard: {
    width: "100%",
    maxWidth: 460,
    background: theme.pageBgLight,
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 16,
    overflow: "hidden",
    textAlign: "left",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)"
  },
  demoHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    borderBottom: `1px solid ${theme.navyLighter}`
  },
  demoHeaderLeft: { display: "flex", alignItems: "center", gap: 10 },
  demoDotRow: { display: "flex", gap: 4 },
  demoDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  demoTitle: { fontSize: 13, color: theme.mint, fontWeight: 500, fontFamily: fonts.mono },
  demoStatus: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.ctaMint,
    background: "rgba(114, 212, 196, 0.12)",
    padding: "4px 10px",
    borderRadius: 999,
    fontFamily: fonts.mono
  },
  demoBody: { padding: "18px" },
  demoScoreRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  demoScoreNum: { fontSize: 32, fontWeight: 700, color: theme.white, fontFamily: fonts.display, lineHeight: 1 },
  demoScoreLabel: { fontSize: 12, color: theme.mint, opacity: 0.7, marginTop: 4 },
  demoGradeChip: {
    fontSize: 12,
    fontWeight: 600,
    color: "#06231d",
    background: theme.ctaMint,
    padding: "6px 12px",
    borderRadius: 999
  },
  demoDivider: { height: 1, background: theme.navyLighter, margin: "0 0 16px" },
  demoFeedbackRow: { display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  demoFeedbackDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: theme.accentPurple,
    marginTop: 6,
    flexShrink: 0
  },
  demoFeedbackTitle: { fontSize: 13, fontWeight: 600, color: theme.white, marginBottom: 2 },
  demoFeedbackText: { fontSize: 12.5, color: theme.mint, opacity: 0.75, lineHeight: 1.5 }
};
