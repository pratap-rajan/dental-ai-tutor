import { useState, useRef } from "react";
import { CASE_CATALOG, MAX_FILE_SIZE_MB } from "./config.js";
import { requestUploadUrl, uploadFileToS3 } from "./api.js";
import { theme, fonts } from "./theme.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UploadForm({ onSubmitted, formRef }) {
  const [caseId, setCaseId] = useState("");
  const [email, setEmail] = useState("");
  const [reportType, setReportType] = useState("detailed");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  function validate() {
    if (!caseId) return "Select a case to continue.";
    if (!email || !EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
    if (!file) return "Add a recording to continue.";
    if (!file.name.toLowerCase().endsWith(".mp4")) return "Only MP4 recordings are supported.";
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `That file is too large. Keep it under ${MAX_FILE_SIZE_MB}MB.`;
    }
    return "";
  }

  function handleFileChange(selected) {
    setError("");
    setFile(selected || null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileChange(dropped);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");
    setProgress(0);

    try {
      const { uploadUrl, objectKey } = await requestUploadUrl({
        caseId,
        email,
        fileName: file.name,
        contentType: file.type || "video/mp4"
      });

      await uploadFileToS3(uploadUrl, file, setProgress);

      onSubmitted({
        caseId,
        caseLabel: CASE_CATALOG.find((c) => c.id === caseId)?.label ?? caseId,
        email,
        reportType,
        objectKey
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section id="upload-portal" ref={formRef} style={styles.section}>
      <div style={styles.sectionInner}>
        <div style={styles.eyebrow}>Free for enrolled students</div>
        <h2 style={styles.heading}>Submit a practice case</h2>
        <p style={styles.subhead}>
          Upload your recording and get examiner-style feedback by email
          within minutes.
        </p>

        <form onSubmit={handleSubmit} style={styles.card}>
          <label style={styles.label} htmlFor="case-select">Case</label>
          <select
            id="case-select"
            style={styles.input}
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Select a case</option>
            {CASE_CATALOG.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <label style={styles.label} htmlFor="email-input">Email</label>
          <input
            id="email-input"
            type="email"
            style={styles.input}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />

          <label style={styles.label}>Report type</label>
          <div style={styles.toggleRow}>
            <button
              type="button"
              style={reportType === "detailed" ? styles.toggleActive : styles.toggle}
              onClick={() => setReportType("detailed")}
              disabled={submitting}
            >
              Detailed
            </button>
            <button
              type="button"
              style={reportType === "basic" ? styles.toggleActive : styles.toggle}
              onClick={() => setReportType("basic")}
              disabled={submitting}
            >
              Basic
            </button>
          </div>

          <div
            style={{
              ...styles.dropzone,
              borderColor: dragActive ? theme.teal : theme.border,
              background: dragActive ? "rgba(0,194,203,0.05)" : theme.surface
            }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              disabled={submitting}
            />
            <UploadIcon />
            {file ? (
              <p style={styles.dropText}>{file.name}</p>
            ) : (
              <>
                <p style={styles.dropText}>Drag your recording here or browse</p>
                <p style={styles.dropHint}>MP4, up to {MAX_FILE_SIZE_MB}MB</p>
              </>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {submitting && (
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          )}

          <button type="submit" style={styles.submitButton} disabled={submitting}>
            {submitting ? `Uploading… ${progress}%` : "Submit for feedback"}
          </button>
        </form>
      </div>
    </section>
  );
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={theme.slateLight} strokeWidth="1.8" style={{ marginBottom: 8 }}>
      <path d="M4 14.9A5 5 0 0 1 6 5.3a6 6 0 0 1 11.4 2.6A4.5 4.5 0 0 1 19 16.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  section: { background: theme.white, padding: "4rem 1.5rem", fontFamily: fonts.body },
  sectionInner: { maxWidth: 520, margin: "0 auto", textAlign: "center" },
  eyebrow: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.tealDark,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: "clamp(24px, 4vw, 30px)",
    fontWeight: 600,
    color: theme.ink,
    margin: "0 0 10px"
  },
  subhead: { fontSize: 16, color: theme.slate, margin: "0 0 2rem", lineHeight: 1.6 },
  card: {
    textAlign: "left",
    background: theme.surface,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    padding: "1.75rem"
  },
  label: { fontSize: 14, fontWeight: 500, color: theme.slate, display: "block", marginBottom: 6 },
  input: {
    width: "100%",
    marginBottom: "1.1rem",
    padding: "11px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    fontSize: 16,
    boxSizing: "border-box",
    background: theme.white
  },
  toggleRow: { display: "flex", gap: 8, marginBottom: "1.25rem" },
  toggle: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.white,
    fontSize: 15,
    cursor: "pointer",
    color: theme.slate
  },
  toggleActive: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: `1.5px solid ${theme.teal}`,
    background: "rgba(0,194,203,0.08)",
    color: theme.tealDark,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer"
  },
  dropzone: {
    border: "1.5px dashed",
    borderRadius: 10,
    padding: "1.75rem 1rem",
    textAlign: "center",
    marginBottom: "1.25rem",
    cursor: "pointer"
  },
  dropText: { fontSize: 15, color: theme.ink, margin: 0, fontWeight: 500 },
  dropHint: { fontSize: 13, color: theme.slateLight, margin: "4px 0 0" },
  error: { fontSize: 14, color: theme.danger, margin: "0 0 1rem" },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    background: theme.border,
    marginBottom: "1rem",
    overflow: "hidden"
  },
  progressFill: { height: "100%", background: theme.teal, transition: "width 0.2s ease" },
  submitButton: {
    width: "100%",
    padding: "13px 0",
    borderRadius: 8,
    border: "none",
    background: theme.navy,
    color: theme.white,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: fonts.display
  }
};
