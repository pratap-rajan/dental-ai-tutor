import { theme, fonts } from "./theme.js";

// Extend this alongside CASE_PAL_MAP in AvatarPractice.jsx as more
// cases get their own PAL.
const CASE_LABELS = {
  "case3-avulsed-tooth": "Case 3 — Avulsed tooth (telephone triage)"
};

/**
 * The deliberate "about to start" screen between case selection and
 * the live Tavus call. Nothing Tavus-related has happened yet when
 * this screen is shown - onJoin() is the only thing that creates the
 * conversation. This is also what makes the exam clock in
 * AvatarLiveSession meaningful: it starts a few seconds after this
 * screen's Join button is clicked, not after case selection.
 */
export default function AvatarReady({ caseId, onJoin, onBack, joining, error }) {
  const caseLabel = CASE_LABELS[caseId] ?? "Selected case";

  return (
    <div style={styles.wrap}>
      <h2 style={styles.heading}>{caseLabel}</h2>
      <p style={styles.note}>
        You're about to start a live timed call with the AI patient. The
        5-minute exam clock begins a few seconds after you click Join -
        make sure your mic and camera are ready first.
      </p>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        <button type="button" style={styles.backButton} onClick={onBack} disabled={joining}>
          Back
        </button>
        <button type="button" style={styles.joinButton} onClick={onJoin} disabled={joining}>
          {joining ? "Starting…" : "Join"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: fonts.body,
    padding: "40px 20px",
    textAlign: "center"
  },
  heading: { color: theme.white, fontSize: 20, marginBottom: 12 },
  note: { color: theme.slateLight, fontSize: 14, maxWidth: 440, marginBottom: 24 },
  error: { color: theme.danger, fontSize: 13, marginBottom: 16 },
  actions: { display: "flex", gap: 12 },
  backButton: {
    padding: "0 20px",
    height: 44,
    borderRadius: 22,
    border: `1px solid ${theme.navyLighter}`,
    background: "transparent",
    color: theme.white,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: "pointer"
  },
  joinButton: {
    padding: "0 28px",
    height: 44,
    borderRadius: 22,
    border: "none",
    background: theme.lime,
    color: theme.pageBg,
    fontSize: 13.5,
    fontWeight: 700,
    fontFamily: fonts.body,
    cursor: "pointer"
  }
};