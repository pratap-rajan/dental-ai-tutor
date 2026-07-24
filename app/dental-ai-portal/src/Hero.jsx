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
          Pass faster with your
          <br />
          <span style={styles.headlineAccent}>AI study buddy</span>
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
    background: `linear-gradient(180deg, ${theme.navy} 0%, #1d232b 100%)`,
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
    background: "rgba(0, 194, 203, 0.12)",
    border: `1px solid ${theme.teal}`,
    color: theme.mint,
    fontSize: 14,
    fontWeight: 500,
    padding: "6px 16px",
    borderRadius: 999,
    marginBottom: "1.5rem"
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: theme.teal,
    display: "inline-block"
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: "clamp(32px, 5vw, 48px)",
    fontWeight: 600,
    lineHeight: 1.15,
    color: theme.white,
    margin: "0 0 1.25rem"
  },
  headlineAccent: { color: theme.teal },
  subhead: {
    fontSize: 18,
    lineHeight: 1.6,
    color: theme.mint,
    opacity: 0.85,
    maxWidth: 560,
    margin: "0 0 2rem"
  },
  ctaRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "2rem"
  },
  ctaPrimary: {
    background: theme.teal,
    color: theme.navy,
    border: "none",
    fontSize: 16,
    fontWeight: 600,
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
    background: theme.navyLight,
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 16,
    overflow: "hidden",
    textAlign: "left",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)"
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
  demoTitle: { fontSize: 13, color: theme.mint, fontWeight: 500 },
  demoStatus: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.teal,
    background: "rgba(0, 194, 203, 0.12)",
    padding: "4px 10px",
    borderRadius: 999
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
    color: theme.navy,
    background: theme.teal,
    padding: "6px 12px",
    borderRadius: 999
  },
  demoDivider: { height: 1, background: theme.navyLighter, margin: "0 0 16px" },
  demoFeedbackRow: { display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  demoFeedbackDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#00c2cb",
    marginTop: 6,
    flexShrink: 0
  },
  demoFeedbackTitle: { fontSize: 13, fontWeight: 600, color: theme.white, marginBottom: 2 },
  demoFeedbackText: { fontSize: 12.5, color: theme.mint, opacity: 0.75, lineHeight: 1.5 }
};
