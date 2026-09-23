import { useState } from "react";
import { AVATAR_CASE_CATALOG, AVATAR_PERSONAS } from "./config.js";
import { theme, fonts } from "./theme.js";
import CaseSelect from "./caseselect.jsx";

export default function AvatarSetup({ onStart, starting, error }) {
  const [caseId, setCaseId] = useState(AVATAR_CASE_CATALOG[0]?.id ?? "");
  const [personaId, setPersonaId] = useState(AVATAR_PERSONAS[0]?.id ?? "");

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

      <div style={styles.field}>
        <label style={styles.label}>Patient avatar</label>
        <div style={styles.personaRow}>
          {AVATAR_PERSONAS.map((p) => {
            const selected = p.id === personaId;
            return (
              <button
                key={p.id}
                type="button"
                style={{
                  ...styles.personaCard,
                  ...(selected ? styles.personaCardSelected : {})
                }}
                onClick={() => setPersonaId(p.id)}
              >
                <span style={{ ...styles.personaDot, background: personaGradient(p.id) }} />
                <span style={styles.personaLabel}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        style={{ ...styles.startButton, opacity: caseId && personaId && !starting ? 1 : 0.6 }}
        onClick={() => onStart(caseId, personaId)}
        disabled={!caseId || !personaId || starting}
      >
        {starting ? "Connecting…" : "Start session →"}
      </button>
      {error && <p style={styles.error}>{error}</p>}
      <p style={styles.hint}>Your microphone and camera will be requested when the call starts.</p>
    </div>
  );
}

function personaGradient(personaId) {
  if (personaId === "male") {
    return `linear-gradient(135deg, ${theme.heroGradientStart}, ${theme.heroGradientEnd})`;
  }
  if (personaId === "clinical") {
    return `linear-gradient(135deg, ${theme.ctaMint}, ${theme.purpleGlow})`;
  }
  return `linear-gradient(135deg, ${theme.purpleGlow}, ${theme.tealGlow})`;
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
  personaRow: { display: "flex", gap: 10 },
  personaCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "16px 8px",
    borderRadius: 12,
    border: `1.5px solid ${theme.navyLighter}`,
    background: "rgba(255,255,255,0.03)",
    cursor: "pointer",
    fontFamily: fonts.body,
    transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease"
  },
  personaCardSelected: {
    borderColor: theme.ctaMint,
    background: "rgba(114,212,196,0.08)",
    boxShadow: `0 0 24px -8px ${theme.ctaMint}88`
  },
  personaDot: { width: 42, height: 42, borderRadius: "50%", flexShrink: 0 },
  personaLabel: { fontSize: 12.5, fontWeight: 600, color: theme.white, textAlign: "center" },
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