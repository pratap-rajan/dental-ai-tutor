import { useState, useRef, useEffect } from "react";
import { CASE_CATALOG, MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, RECAPTCHA_SITE_KEY } from "./config.js";
import { requestUploadUrl, uploadFileToS3 } from "./api.js";
import { theme, fonts } from "./theme.js";
import CaseSelect from "./CaseSelect.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UploadForm({ onSubmitted, formRef }) {
  const [caseId, setCaseId] = useState("");
  const [email, setEmail] = useState("");
  const [reportType, setReportType] = useState("detailed");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Load the reCAPTCHA v3 script once, on mount. v3 is invisible — no
  // checkbox, no puzzle — it silently scores each interaction and we
  // fetch a fresh token right before submit. The actual score check
  // happens server-side (in the presigned-URL Lambda), since a bot can
  // trivially skip any check that only happens in the browser.
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (document.getElementById("recaptcha-script")) return;

    const script = document.createElement("script");
    script.id = "recaptcha-script";
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  async function getCaptchaToken() {
    if (!RECAPTCHA_SITE_KEY || !window.grecaptcha) return null;
    return new Promise((resolve) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action: "submit_case" })
          .then(resolve)
          .catch(() => resolve(null));
      });
    });
  }

  function validate() {
    if (!caseId) return "Select a case to continue.";
    if (!email || !EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
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
      const captchaToken = await getCaptchaToken();

      if (RECAPTCHA_SITE_KEY && !captchaToken) {
        throw new Error("Could not verify you're human. Please try again.");
      }

      const { uploadUrl, objectKey } = await requestUploadUrl({
        caseId,
        email,
        fileName: file.name,
        contentType: file.type || "video/mp4",
        reportType,
        captchaToken
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

  const cardAccent = submitting ? theme.tealGlow : theme.purpleGlow;

  return (
    <section id="upload-portal" ref={formRef} style={styles.section}>
      <div style={styles.sectionInner}>
        <div style={styles.eyebrow}>Free for enrolled students</div>
        <h2 style={styles.heading}>Submit a practice case</h2>
        <p style={styles.subhead}>
          Upload your recording and get examiner-style feedback by email
          within minutes.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            ...styles.card,
            borderColor: cardHovered || submitting ? cardAccent : theme.navyLighter,
            boxShadow:
              cardHovered || submitting
                ? `0 0 0 1px ${cardAccent}44, 0 0 60px -10px ${cardAccent}88, 0 16px 40px rgba(0,0,0,0.4)`
                : "0 4px 20px rgba(0,0,0,0.25)"
          }}
          onMouseEnter={() => setCardHovered(true)}
          onMouseLeave={() => setCardHovered(false)}
        >
          <div
            style={{
              ...styles.backlight,
              background: `radial-gradient(circle at 25% 15%, ${cardAccent}2e, transparent 60%)`,
              opacity: cardHovered || submitting ? 1 : 0
            }}
          />

          <div style={styles.field}>
            <label style={styles.label} htmlFor="case-select">Case</label>
            <CaseSelect
              options={CASE_CATALOG}
              value={caseId}
              onChange={setCaseId}
              disabled={submitting}
            />
          </div>

          <div style={styles.field}>
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
          </div>

          <div style={styles.field}>
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
          </div>

          <div
            style={{
              ...styles.dropzone,
              borderColor: dragActive ? theme.ctaMint : theme.navyLighter,
              background: dragActive ? "rgba(114,212,196,0.06)" : "rgba(255,255,255,0.015)"
            }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4,audio/ogg,.ogg,audio/wav,.wav"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              disabled={submitting}
            />
            <UploadIcon active={!!file} />
            {file ? (
              <p style={styles.dropText}>{file.name}</p>
            ) : (
              <>
                <p style={styles.dropText}>Drag your recording here or browse</p>
                <p style={styles.dropHint}>MP4, OGG, or WAV — up to {MAX_FILE_SIZE_MB}MB</p>
              </>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {submitting && (
            <div style={styles.progressWrap}>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${Math.max(progress, 4)}%`
                  }}
                />
              </div>
              <span style={styles.progressLabel}>{progress}%</span>
            </div>
          )}

          <button type="submit" style={styles.submitButton} disabled={submitting}>
            {submitting ? (
              <span style={styles.submitButtonContent}>
                <Spinner />
                Uploading…
              </span>
            ) : (
              "Submit for feedback"
            )}
          </button>

          {RECAPTCHA_SITE_KEY && (
            <p style={styles.captchaNotice}>
              Protected by reCAPTCHA —{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={styles.captchaLink}>Privacy</a>
              {" · "}
              <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" style={styles.captchaLink}>Terms</a>
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

function UploadIcon({ active }) {
  const color = active ? theme.ctaMint : theme.slateLight;
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" style={{ marginBottom: 8 }}>
      <path d="M4 14.9A5 5 0 0 1 6 5.3a6 6 0 0 1 11.4 2.6A4.5 4.5 0 0 1 19 16.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06231d" strokeWidth="2.5">
      <style>{`
        .ufspin { animation: ufspinKF 0.8s linear infinite; transform-origin: center; }
        @keyframes ufspinKF { to { transform: rotate(360deg); } }
      `}</style>
      <path className="ufspin" d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  section: {
    background: [
      `radial-gradient(ellipse 700px 400px at 90% 10%, rgba(162,143,243,0.14), transparent 55%)`,
      `radial-gradient(ellipse 700px 450px at 5% 90%, rgba(99,209,230,0.14), transparent 55%)`,
      theme.pageBg
    ].join(", "),
    padding: "4rem 1.5rem",
    fontFamily: fonts.body
  },
  sectionInner: { maxWidth: 520, margin: "0 auto", textAlign: "center" },
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
    fontSize: "clamp(24px, 4vw, 30px)",
    fontWeight: 700,
    color: theme.white,
    margin: "0 0 10px"
  },
  subhead: { fontSize: 16, color: theme.mint, opacity: 0.8, margin: "0 0 2rem", lineHeight: 1.6 },
  card: {
    position: "relative",
    overflow: "hidden",
    textAlign: "left",
    background: "#0d1021",
    borderRadius: 16,
    border: "1px solid",
    padding: "1.75rem",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease"
  },
  backlight: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    transition: "opacity 0.3s ease"
  },
  field: { position: "relative", marginBottom: "1.1rem" },
  label: { fontSize: 13.5, fontWeight: 600, color: theme.mint, opacity: 0.85, display: "block", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.navyLighter}`,
    fontSize: 15,
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.03)",
    color: theme.white,
    fontFamily: fonts.body,
    colorScheme: "dark"
  },
  option: {
    background: "#0d1021",
    color: theme.white
  },
  toggleRow: { position: "relative", display: "flex", gap: 8 },
  toggle: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: `1px solid ${theme.navyLighter}`,
    background: "rgba(255,255,255,0.02)",
    fontSize: 14.5,
    cursor: "pointer",
    color: theme.mint,
    opacity: 0.75,
    fontFamily: fonts.body
  },
  toggleActive: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: `1.5px solid ${theme.ctaMint}`,
    background: "rgba(114,212,196,0.10)",
    color: theme.ctaMint,
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: fonts.body
  },
  dropzone: {
    position: "relative",
    border: "1.5px dashed",
    borderRadius: 10,
    padding: "1.75rem 1rem",
    textAlign: "center",
    marginBottom: "1.25rem",
    cursor: "pointer",
    transition: "border-color 0.2s ease, background 0.2s ease"
  },
  dropText: { fontSize: 14.5, color: theme.white, margin: 0, fontWeight: 500 },
  dropHint: { fontSize: 12.5, color: theme.slateLight, margin: "4px 0 0" },
  error: { position: "relative", fontSize: 14, color: "#f87171", margin: "0 0 1rem" },
  progressWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: "1rem"
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 5,
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    background: `linear-gradient(90deg, ${theme.heroGradientStart}, ${theme.heroGradientEnd})`,
    boxShadow: `0 0 12px ${theme.tealGlow}99`,
    transition: "width 0.2s ease"
  },
  progressLabel: {
    fontSize: 12.5,
    fontFamily: fonts.mono,
    color: theme.mint,
    minWidth: 36,
    textAlign: "right"
  },
  submitButton: {
    position: "relative",
    width: "100%",
    padding: "13px 0",
    borderRadius: 8,
    border: "none",
    background: theme.ctaMint,
    color: "#06231d",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: fonts.display,
    opacity: 1,
    transition: "opacity 0.2s ease"
  },
  submitButtonContent: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8
  },
  captchaNotice: {
    position: "relative",
    fontSize: 11,
    color: theme.slateLight,
    textAlign: "center",
    margin: "0.75rem 0 0"
  },
  captchaLink: {
    color: theme.slateLight,
    textDecoration: "underline"
  }
};
