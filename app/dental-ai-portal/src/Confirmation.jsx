import { useEffect, useState } from "react";
import { theme, fonts } from "./theme.js";

export default function Confirmation({ submission, onReset }) {
  const [stage, setStage] = useState(1);

  useEffect(() => {
    // Purely cosmetic staged progress — the real completion signal is
    // the email that eventually lands, not this component. These timers
    // just avoid leaving the student staring at a spinner forever.
    const t1 = setTimeout(() => setStage(2), 15000);  // ~15s: move to "Generating feedback"
    const t2 = setTimeout(() => setStage(3), 60000);  // ~60s: settle into "done" state
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <section style={styles.section}>
      <div style={styles.card}>
        <div style={styles.backlight} />

        <div style={styles.iconCircle}>
          <CheckIcon />
        </div>
        <h3 style={styles.title}>Recording submitted</h3>
        <p style={styles.subtitle}>{submission.caseLabel}</p>

        <div style={styles.stepBox}>
          <Step done label="Recording uploaded" />
          <Step done={stage >= 2} inProgress={stage === 1} label="Transcribing your response" />
          <Step done={stage >= 3} inProgress={stage === 2} label="Generating feedback" />
        </div>

        <p style={styles.note}>
          {stage >= 3 ? (
            <>
              Your {submission.reportType} report should be on its way to{" "}
              <span style={styles.emailHighlight}>{submission.email}</span>.
              Not seeing it? Check your spam folder, or get in touch with the academy.
            </>
          ) : (
            <>
              We'll email your {submission.reportType} report to{" "}
              <span style={styles.emailHighlight}>{submission.email}</span> within
              a few minutes.
            </>
          )}
        </p>

        <button style={styles.button} onClick={onReset}>
          Submit another case
        </button>
      </div>
    </section>
  );
}

function Step({ done, inProgress, label }) {
  return (
    <div style={styles.stepRow}>
      {done ? (
        <span style={{ ...styles.stepIcon, color: theme.ctaMint }}>
          <CheckIcon size={17} />
        </span>
      ) : inProgress ? (
        <span style={{ ...styles.stepIcon, color: theme.tealGlow }}>
          <SpinIcon />
        </span>
      ) : (
        <span style={{ ...styles.stepIcon, color: theme.navyLighter }}>
          <DashedIcon />
        </span>
      )}
      <span style={{ fontSize: 14.5, color: done || inProgress ? theme.white : theme.slateLight }}>
        {label}
      </span>
    </div>
  );
}

function CheckIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <style>{`.spin { animation: spin 1s linear infinite; transform-origin: center; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path className="spin" d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
    </svg>
  );
}

function DashedIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    </svg>
  );
}

const styles = {
  section: {
    background: [
      `radial-gradient(ellipse 700px 400px at 90% 10%, rgba(99,209,230,0.14), transparent 55%)`,
      `radial-gradient(ellipse 700px 450px at 5% 90%, rgba(162,143,243,0.14), transparent 55%)`,
      theme.pageBg
    ].join(", "),
    padding: "4rem 1.5rem",
    fontFamily: fonts.body
  },
  card: {
    position: "relative",
    overflow: "hidden",
    maxWidth: 480,
    margin: "0 auto",
    background: "#0d1021",
    borderRadius: 16,
    border: `1px solid ${theme.ctaMint}55`,
    boxShadow: `0 0 0 1px ${theme.ctaMint}22, 0 0 60px -10px ${theme.tealGlow}66, 0 16px 40px rgba(0,0,0,0.4)`,
    padding: "2rem",
    textAlign: "center"
  },
  backlight: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `radial-gradient(circle at 30% 10%, ${theme.tealGlow}22, transparent 60%)`
  },
  iconCircle: {
    position: "relative",
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "rgba(114,212,196,0.14)",
    color: theme.ctaMint,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.1rem"
  },
  title: { position: "relative", fontFamily: fonts.display, margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: theme.white },
  subtitle: { position: "relative", fontSize: 14.5, color: theme.mint, opacity: 0.8, margin: "0 0 1.4rem" },
  stepBox: {
    position: "relative",
    textAlign: "left",
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 10,
    padding: "1.1rem",
    marginBottom: "1.4rem"
  },
  stepRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  stepIcon: { display: "flex", alignItems: "center" },
  note: { position: "relative", fontSize: 14.5, color: theme.mint, opacity: 0.8, margin: "0 0 1.4rem", lineHeight: 1.6 },
  emailHighlight: { color: theme.ctaMint, fontWeight: 700 },
  button: {
    position: "relative",
    width: "100%",
    padding: "12px 0",
    borderRadius: 8,
    border: `1px solid ${theme.navyLighter}`,
    background: "rgba(255,255,255,0.03)",
    fontSize: 14.5,
    fontWeight: 600,
    cursor: "pointer",
    color: theme.white,
    fontFamily: fonts.body
  }
};
