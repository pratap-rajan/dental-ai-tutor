import { useState } from "react";
import { theme, fonts } from "./theme.js";

const STEPS = [
  {
    n: "01",
    title: "Choose your case",
    body: "Select an ORE or LDS OSCE station or DTP case based on the topic you want to strengthen.",
    tags: ["Case library", "OSCE & DTP"],
    accent: theme.tealGlow
  },
  {
    n: "02",
    title: "Record your response",
    body: "Answer as you would in the real exam, then upload your recording along with your email.",
    tags: ["Any device", "Under 5 minutes"],
    accent: theme.purpleGlow
  },
  {
    n: "03",
    title: "Get structured feedback",
    body: "Receive an examiner-style scorecard by email (Basic & Detailed) — what you got right, what to improve, and how.",
    tags: ["Detailed report", "Basic Report"],
    accent: theme.ctaMint
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={styles.section}>
      <div style={styles.inner}>
        <div style={styles.eyebrow}>Simple, fast, repeatable</div>
        <h2 style={styles.heading}>How it works</h2>
        <p style={styles.subhead}>
          Start in minutes and get a clear, structured path to improve after
          every attempt.
        </p>

        <div style={styles.stepsGrid}>
          {STEPS.map((s) => (
            <StepCard key={s.n} step={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.stepCard,
        borderColor: hovered ? step.accent : theme.navyLighter,
        boxShadow: hovered
          ? `0 0 0 1px ${step.accent}55, 0 0 48px -8px ${step.accent}88, 0 12px 32px rgba(0,0,0,0.35)`
          : "0 4px 16px rgba(0,0,0,0.2)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)"
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Radial backlight behind the card content, only visible on hover */}
      <div
        style={{
          ...styles.backlight,
          background: `radial-gradient(circle at 30% 20%, ${step.accent}33, transparent 65%)`,
          opacity: hovered ? 1 : 0
        }}
      />

      <div style={styles.cardHeader}>
        <h3 style={{ ...styles.stepTitle, color: hovered ? step.accent : theme.white }}>
          {step.title}
        </h3>
        <span style={styles.stepNumber}>{step.n}</span>
      </div>

      <p style={styles.stepBody}>{step.body}</p>

      <div style={styles.divider} />

      <div style={styles.tagRow}>
        {step.tags.map((tag) => (
          <span key={tag} style={{ ...styles.tag, borderColor: hovered ? step.accent : theme.navyLighter }}>
            <span style={{ ...styles.tagDot, background: step.accent }} />
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  section: {
    background: [
      `radial-gradient(ellipse 800px 400px at 85% 0%, rgba(99,209,230,0.16), transparent 55%)`,
      `radial-gradient(ellipse 700px 400px at 10% 100%, rgba(162,143,243,0.18), transparent 55%)`,
      theme.pageBg
    ].join(", "),
    padding: "4rem 1.5rem",
    fontFamily: fonts.body
  },
  inner: { maxWidth: 1040, margin: "0 auto", textAlign: "center" },
  eyebrow: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.accentPurple,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: fonts.mono,
    marginBottom: 10
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: "clamp(26px, 4vw, 34px)",
    fontWeight: 600,
    color: theme.white,
    margin: "0 0 12px"
  },
  subhead: {
    fontSize: 16,
    color: theme.mint,
    opacity: 0.8,
    maxWidth: 480,
    margin: "0 auto 3rem"
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 24,
    textAlign: "left"
  },
  stepCard: {
    position: "relative",
    overflow: "hidden",
    background: "#0d1021",
    border: "1px solid",
    borderRadius: 16,
    padding: "1.75rem 1.75rem 1.5rem",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease",
    cursor: "default"
  },
  backlight: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    transition: "opacity 0.3s ease"
  },
  cardHeader: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10
  },
  stepTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    fontWeight: 700,
    margin: 0,
    transition: "color 0.25s ease"
  },
  stepNumber: {
    fontFamily: fonts.mono,
    fontSize: 30,
    fontWeight: 700,
    color: theme.navyLighter,
    lineHeight: 1
  },
  stepBody: {
    position: "relative",
    fontSize: 14.5,
    lineHeight: 1.6,
    color: theme.mint,
    opacity: 0.75,
    margin: "0 0 1.25rem"
  },
  divider: {
    position: "relative",
    height: 1,
    background: theme.navyLighter,
    marginBottom: "1.1rem"
  },
  tagRow: {
    position: "relative",
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: theme.mint,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid",
    padding: "5px 12px",
    borderRadius: 999,
    fontFamily: fonts.mono,
    transition: "border-color 0.25s ease"
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    flexShrink: 0
  }
};
