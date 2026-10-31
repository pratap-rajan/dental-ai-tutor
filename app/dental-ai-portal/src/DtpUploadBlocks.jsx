import { useRef, useState } from "react";
import { MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, RECAPTCHA_SITE_KEY } from "./config.js";
import { requestUploadUrl, uploadFileToS3 } from "./api.js";
import { theme, fonts } from "./theme.js";

/**
 * Two-recording upload for DTP stations.
 *
 * A DTP case in CASE_CATALOG carries a `parts` array, e.g.
 *   parts: [
 *     { id: "case1a-dtp-bleeding-gums-history", label: "1A — History taking" },
 *     { id: "case1b-dtp-bleeding-gums-plan",    label: "1B — Diagnosis & treatment plan" }
 *   ]
 *
 * Each part is a normal, fully separate case in S3 (cases/{part.id}/...),
 * so each block uploads to its own caseId and the existing pipeline
 * (presigned URL -> Transcribe -> assessment -> email) runs unchanged,
 * producing one report per recording.
 *
 * Each block uploads independently, so a student can submit the history
 * recording now and the plan recording later. Once every part has been
 * uploaded in this session, onAllSubmitted() is called so the parent can
 * show the usual Confirmation screen.
 */
export default function DtpUploadBlocks({
  parts,
  groupLabel,
  email,
  reportType,
  validateCommon,   // () => "" | "error message"  (email etc., owned by UploadForm)
  getCaptchaToken,  // () => Promise<string|null>
  onAllSubmitted,   // ({ caseId, caseLabel, email, reportType, objectKey }) => void
  disabled,
  accentColor = theme.ctaMint  // UploadForm's selectionAccent (Google Green in light mode)
}) {
  const [done, setDone] = useState({}); // partId -> objectKey

  function handlePartDone(part, objectKey) {
    const next = { ...done, [part.id]: objectKey };
    setDone(next);
    if (parts.every((p) => next[p.id])) {
      onAllSubmitted({
        caseId: parts.map((p) => p.id).join(" + "),
        caseLabel: `${groupLabel} (history + treatment plan)`,
        email,
        reportType,
        objectKey
      });
    }
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.intro}>
        This DTP case has two recordings. Upload each one in its own box — you'll get a
        separate report for each.
      </p>
      {parts.map((part, i) => (
        <UploadBlock
          key={part.id}
          index={i}
          part={part}
          groupLabel={groupLabel}
          email={email}
          reportType={reportType}
          validateCommon={validateCommon}
          getCaptchaToken={getCaptchaToken}
          uploadedKey={done[part.id]}
          accent={accentColor}
          onDone={(objectKey) => handlePartDone(part, objectKey)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function UploadBlock({ index, part, groupLabel, email, reportType, validateCommon, getCaptchaToken, uploadedKey, onDone, disabled, accent }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const locked = disabled || submitting || !!uploadedKey;

  function validateFile() {
    if (!file) return "Add a recording to continue.";
    const extension = file.name.toLowerCase().split(".").pop();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      const allowedList = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(", ");
      return `Unsupported file type. Allowed formats: ${allowedList}.`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `That file is too large. Keep it under ${MAX_FILE_SIZE_MB}MB.`;
    }
    return "";
  }

  async function handleUpload() {
    const problem = validateCommon() || validateFile();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError("");
    setProgress(0);
    try {
      const captchaToken = await getCaptchaToken();
      if (RECAPTCHA_SITE_KEY && !captchaToken) {
        throw new Error("Could not verify you're human. Please try again.");
      }
      const { uploadUrl, objectKey } = await requestUploadUrl({
        caseId: part.id,
        email,
        fileName: file.name,
        contentType: file.type || "video/mp4",
        reportType,
        captchaToken
      });
      await uploadFileToS3(uploadUrl, file, setProgress);
      setSubmitting(false);
      onDone(objectKey);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...styles.block, borderColor: uploadedKey ? accent : theme.navyLighter }}>
      <div style={styles.blockHeader}>
        <span style={styles.stepBadge}>{index + 1}</span>
        <div>
          <div style={styles.blockTitle}>{part.label}</div>
          <div style={styles.blockSub}>{groupLabel}</div>
        </div>
        {uploadedKey && <span style={{ ...styles.doneBadge, color: accent, border: `1px solid ${accent}` }}>Uploaded ✓</span>}
      </div>

      {uploadedKey ? (
        <p style={styles.doneText}>
          Received — your feedback for this recording will arrive by email.
        </p>
      ) : (
        <>
          <div
            style={{
              ...styles.dropzone,
              borderColor: dragActive ? accent : theme.navyLighter,
              background: dragActive ? `color-mix(in srgb, ${accent} 6%, transparent)` : "rgba(255,255,255,0.015)",
              cursor: locked ? "not-allowed" : "pointer"
            }}
            onDragOver={(e) => { e.preventDefault(); if (!locked) setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (locked) return;
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) { setError(""); setFile(dropped); }
            }}
            onClick={() => !locked && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,.mp4,audio/ogg,.ogg,audio/wav,.wav"
              style={{ display: "none" }}
              onChange={(e) => { setError(""); setFile(e.target.files?.[0] || null); }}
              disabled={locked}
            />
            {file ? (
              <p style={styles.dropText}>{file.name}</p>
            ) : (
              <>
                <p style={styles.dropText}>Drag your {part.label} recording here or browse</p>
                <p style={styles.dropHint}>MP4, OGG, or WAV — up to {MAX_FILE_SIZE_MB}MB</p>
              </>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {submitting && (
            <div style={styles.progressWrap}>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.max(progress, 4)}%` }} />
              </div>
              <span style={styles.progressLabel}>{progress}%</span>
            </div>
          )}

          <button type="button" style={{ ...styles.button, opacity: locked ? 0.6 : 1 }} onClick={handleUpload} disabled={locked}>
            {submitting ? "Uploading…" : `Submit ${part.label}`}
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "relative", display: "flex", flexDirection: "column", gap: 14, marginBottom: "0.5rem" },
  intro: { fontSize: 13.5, color: theme.mint, opacity: 0.8, margin: 0, lineHeight: 1.5 },
  block: {
    border: "1px solid",
    borderRadius: 12,
    padding: "1rem",
    background: "rgba(255,255,255,0.02)",
    transition: "border-color 0.2s ease"
  },
  blockHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  stepBadge: {
    width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: `color-mix(in srgb, ${theme.accentPurple} 15%, transparent)`, color: theme.accentPurple, fontSize: 13, fontWeight: 700, fontFamily: fonts.mono, flexShrink: 0
  },
  blockTitle: { fontSize: 14.5, fontWeight: 700, color: theme.white, fontFamily: fonts.body },
  blockSub: { fontSize: 12, color: theme.slateLight, fontFamily: fonts.body },
  doneBadge: {
    marginLeft: "auto", fontSize: 11.5, fontWeight: 700,
    borderRadius: 20, padding: "2px 10px", fontFamily: fonts.body
  },
  doneText: { fontSize: 13.5, color: theme.mint, margin: 0 },
  dropzone: {
    border: "1.5px dashed", borderRadius: 10, padding: "1.25rem 1rem", textAlign: "center",
    marginBottom: "0.9rem", transition: "border-color 0.2s ease, background 0.2s ease"
  },
  dropText: { fontSize: 14, color: theme.white, margin: 0, fontWeight: 500, fontFamily: fonts.body },
  dropHint: { fontSize: 12.5, color: theme.slateLight, margin: "4px 0 0", fontFamily: fonts.body },
  error: { fontSize: 13.5, color: "#f87171", margin: "0 0 0.75rem", fontFamily: fonts.body },
  progressWrap: { display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem" },
  progressTrack: { flex: 1, height: 8, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" },
  progressFill: {
    height: "100%", borderRadius: 5,
    background: `linear-gradient(90deg, ${theme.heroGradientStart}, ${theme.heroGradientEnd})`,
    transition: "width 0.2s ease"
  },
  progressLabel: { fontSize: 12.5, fontFamily: fonts.mono, color: theme.mint, minWidth: 36, textAlign: "right" },
  button: {
    width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: theme.ctaMint,
    color: "#06231d", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: fonts.display
  }
};