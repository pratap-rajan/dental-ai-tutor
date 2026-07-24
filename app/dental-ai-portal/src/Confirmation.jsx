import { useEffect, useState } from "react";
import { theme, fonts } from "./theme.js";

export default function Confirmation({ submission, onReset }) {
  const [stage, setStage] = useState(1);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(2), 4000);
    return () => clearTimeout(t1);
  }, []);

  return (
    <section style={styles.section}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <CheckIcon />
        </div>
        <h3 style={styles.title}>Recording submitted</h3>
        <p style={styles.subtitle}>{submission.caseLabel}</p>

        <div style={styles.stepBox}>
          <Step done label="Recording uploaded" />
          <Step done={stage >= 2} inProgress={stage === 1} label="Transcribing your response" />
          <Step done={false} inProgress={stage >= 2} label="Generating feedback" />
        </div>

        <p style={styles.note}>
          We'll email your {submission.reportType} report to{" "}
          <span style={styles.emailHighlight}>{submission.email}</span> within
          a few minutes.
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
        <span style={{ ...styles.stepIcon, color: theme.success }}>
          <CheckIcon size={17} />
        </span>
      ) : inProgress ? (
        <span style={{ ...styles.stepIcon, color: theme.teal }}>
          <SpinIcon />
        </span>
      ) : (
        <span style={{ ...styles.stepIcon, color: theme.border }}>
          <DashedIcon />
        </span>
      )}
      <span style={{ fontSize: 15, color: done || inProgress ? theme.ink : theme.slateLight }}>
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
  section: { background: theme.white, padding: "4rem 1.5rem", fontFamily: fonts.body },
  card: {
    maxWidth: 480,
    margin: "0 auto",
    background: theme.surface,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    padding: "2rem",
    textAlign: "center"
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: theme.successBg,
    color: theme.success,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.1rem"
  },
  title: { fontFamily: fonts.display, margin: "0 0 6px", fontSize: 20, fontWeight: 600, color: theme.ink },
  subtitle: { fontSize: 15, color: theme.slate, margin: "0 0 1.4rem" },
  stepBox: {
    textAlign: "left",
    background: theme.white,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "1.1rem",
    marginBottom: "1.4rem"
  },
  stepRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  stepIcon: { display: "flex", alignItems: "center" },
  note: { fontSize: 15, color: theme.slate, margin: "0 0 1.4rem", lineHeight: 1.6 },
  emailHighlight: { color: theme.ink, fontWeight: 600 },
  button: {
    width: "100%",
    padding: "12px 0",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.white,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    color: theme.ink
  }
};
