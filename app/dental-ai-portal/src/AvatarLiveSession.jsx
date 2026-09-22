import { AVATAR_CASE_CATALOG, AVATAR_PERSONAS } from "./config.js";
import { theme, fonts } from "./theme.js";

export default function AvatarLiveSession({ caseId, personaId, onEnd }) {
  const caseLabel = AVATAR_CASE_CATALOG.find((c) => c.id === caseId)?.label ?? "Selected case";
  const personaLabel = AVATAR_PERSONAS.find((p) => p.id === personaId)?.label ?? "Patient";

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.liveTag}>
          <span style={styles.liveDot} />
          Live · {caseLabel}
        </div>
        <span style={styles.timer}>00:00</span>
      </div>

      <div style={styles.videoArea}>
        <div style={styles.avatarCircle} />
        <span style={styles.personaBadge}>{personaLabel}</span>
        <div style={styles.captionStrip}>
          Sample caption — live transcript will appear here once a provider is connected.
        </div>
      </div>

      <div style={styles.controls}>
        <button type="button" style={styles.ctrlButton} aria-label="Mute microphone">
          <MicIcon />
        </button>
        <button type="button" style={styles.ctrlButton} aria-label="Toggle camera">
          <CameraIcon />
        </button>
        <button type="button" style={styles.endButton} onClick={onEnd}>
          <EndCallIcon />
          End session
        </button>
      </div>

      <p style={styles.sampleNote}>
        Sample UI — this call isn't connected to a live avatar provider yet.
      </p>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.white} strokeWidth="2">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.white} strokeWidth="2">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" />
    </svg>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", fontFamily: fonts.body },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  liveTag: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: theme.white
  },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: theme.danger },
  timer: {
    fontSize: 13,
    color: theme.slateLight,
    fontVariantNumeric: "tabular-nums"
  },
  videoArea: {
    position: "relative",
    borderRadius: 16,
    border: `1px solid ${theme.navyLighter}`,
    background: `linear-gradient(160deg, ${theme.purpleWash}, #0c2b30)`,
    minHeight: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${theme.purpleGlow}, ${theme.tealGlow})`
  },
  personaBadge: {
    position: "absolute",
    left: 16,
    bottom: 16,
    fontSize: 12,
    color: theme.white,
    background: "rgba(0,0,0,0.45)",
    padding: "5px 10px",
    borderRadius: 7
  },
  captionStrip: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 54,
    background: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 13,
    lineHeight: 1.5,
    color: theme.white
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12
  },
  ctrlButton: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: `1px solid ${theme.navyLighter}`,
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  endButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 20px",
    height: 44,
    borderRadius: 22,
    border: "none",
    background: theme.danger,
    color: theme.white,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: "pointer"
  },
  sampleNote: {
    fontSize: 12,
    color: theme.slateLight,
    textAlign: "center",
    margin: 0
  }
};
