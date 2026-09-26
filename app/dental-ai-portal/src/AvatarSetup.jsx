import { useState } from "react";
import { AVATAR_CASE_CATALOG } from "./config.js";
import { theme, fonts } from "./theme.js";
import CaseSelect from "./caseselect.jsx";

export default function AvatarSetup({ onStart, starting, error }) {
  const [caseId, setCaseId] = useState(AVATAR_CASE_CATALOG[0]?.id ?? "");

  return (
    <div style={styles.wrap}>
      <div style={styles.field}>
        <label style={styles.label} htmlFor="avatar-case-select">Case</label>
        <CaseSelect
          options={AVATAR_CASE_CATALOG}
          value={caseId}
          onChange={setCaseId}
        />
      </div>

      <button
        type="button"
        style={{ ...styles.startButton, opacity: caseId && !starting ? 1 : 0.6 }}
        onClick={() => onStart(caseId)}
        disabled={!caseId || starting}
      >
        {starting ? "Connecting…" : "Start session →"}
      </button>
      {error && <p style={styles.error}>{error}</p>}
      <p style={styles.hint}>Your microphone and camera will be requested when the call starts.</p>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column" },
  field: { position: "relative", marginBottom: "1.1rem" },
  label: {
    display: "block",
    fontSize: 13,
    color: theme.slateLight,
    fontFamily: fonts.body,
    marginBottom: 7
  },
  startButton: {
    marginTop: 6,
    padding: "13px",
    borderRadius: 10,
    border: "none",
    background: theme.ctaMint,
    color: theme.pageBg,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: fonts.body,
    cursor: "pointer"
  },
  hint: {
    marginTop: 14,
    fontSize: 12.5,
    color: theme.slateLight,
    textAlign: "center",
    fontFamily: fonts.body
  },
  error: {
    marginTop: 10,
    fontSize: 12.5,
    color: theme.danger,
    textAlign: "center",
    fontFamily: fonts.body
  }
};