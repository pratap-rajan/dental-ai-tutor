import { useState } from "react";
import { theme, fonts } from "./theme.js";
import { buildAuthorizeUrl } from "./authConfig.js";
import { preparePkceChallenge } from "./AuthContext.jsx";

export default function Login({ pendingApproval, authError }) {
  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcPanelOpen, setTcPanelOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  async function handleProvider(providerName) {
    if (!tcAccepted || starting) return;
    setStarting(true);
    const challenge = await preparePkceChallenge();
    window.location.href = buildAuthorizeUrl(providerName, challenge);
  }

  if (pendingApproval) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, borderColor: "#d4e15755", boxShadow: "0 0 50px -10px #d4e15733" }}>
          <div style={{ ...styles.iconBadge, background: "#d4e15722" }}>
            <i className="ti ti-clock-hour-4" style={{ color: theme.lime, fontSize: 20 }} />
          </div>
          <h1 style={styles.title}>Account pending approval</h1>
          <p style={styles.subtitle}>
            Thanks — we've received your details. Access is usually granted within 1-2 business days.
            You'll be able to sign in with the same account once approved, no new password needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", width: "100%", maxWidth: 820, justifyContent: "center" }}>
        <div style={styles.card}>
          <div style={styles.iconBadge}>
            <i className="ti ti-tooth" style={{ color: theme.tealGlow, fontSize: 20 }} />
          </div>
          <h1 style={styles.title}>Sign in to continue</h1>
          <p style={styles.subtitle}>Plan Ore Academy — ORE and LDS practice</p>

          {authError && (
            <div style={styles.errorBox}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
              <span>Sign-in didn't go through. Please try again.</span>
            </div>
          )}

          <button
            style={{ ...styles.providerButton, background: "#fff", color: "#1f1f1f", opacity: tcAccepted ? 1 : 0.5, cursor: tcAccepted ? "pointer" : "not-allowed" }}
            onClick={() => handleProvider("Google")}
            disabled={!tcAccepted || starting}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            style={{ ...styles.providerButton, background: theme.navyLighter, color: "#fff", border: `1px solid ${theme.navyLighter}`, opacity: tcAccepted ? 1 : 0.5, cursor: tcAccepted ? "pointer" : "not-allowed" }}
            onClick={() => handleProvider("Microsoft")}
            disabled={!tcAccepted || starting}
          >
            <MicrosoftIcon />
            Continue with Microsoft
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>your name is your enrollment check</span>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              We use your Google or Microsoft account to verify who you are — we never see or store your password.
            </p>
          </div>

          <div style={styles.tcRow}>
            <button
              aria-label={tcAccepted ? "Terms accepted" : "Accept terms and conditions"}
              onClick={() => setTcAccepted((v) => !v)}
              style={{ ...styles.checkbox, borderColor: tcAccepted ? theme.lime : theme.navyLighter }}
            >
              {tcAccepted && <i className="ti ti-check" style={{ color: theme.lime, fontSize: 11 }} />}
            </button>
            <p style={styles.tcText}>
              I have read and accept the{" "}
              <span style={styles.tcLink} onClick={() => setTcPanelOpen(true)}>Terms and Conditions</span>{" "}
              for recording submission and assessment
            </p>
          </div>
          <p style={styles.tcHint}>Required to sign in</p>
        </div>

        {tcPanelOpen && <TermsPanel onAgree={() => { setTcAccepted(true); setTcPanelOpen(false); }} onClose={() => setTcPanelOpen(false)} />}
      </div>
    </div>
  );
}

function TermsPanel({ onAgree, onClose }) {
  return (
    <div style={styles.tcPanel}>
      <div style={styles.tcPanelHeader}>
        <i className="ti ti-file-text" style={{ color: theme.purpleGlow, fontSize: 17 }} />
        <p style={styles.tcPanelTitle}>Terms and Conditions</p>
        <button onClick={onClose} aria-label="Close" style={styles.tcPanelClose}>
          <i className="ti ti-x" style={{ fontSize: 16 }} />
        </button>
      </div>
      <div style={styles.tcPanelBody}>
        <TcSection n="1" title="What we collect and why">
          Your name, email, your practice recording, and the case selected — used solely to generate examiner-style feedback against the relevant marking criteria.
        </TcSection>
        <TcSection n="2" title="How your recording is processed">
          Your recording is transcribed to text, then assessed using Anthropic's Claude (Sonnet) via Amazon Bedrock, against your case's official marking matrix. All processing takes place in the UK AWS region, even if you submit from outside the UK.
        </TcSection>
        <TcSection n="3" title="What we keep, and for how long">
          Your original recording is deleted once your assessment is generated. The text transcript, a small metadata record, and your report are retained so your feedback history stays available. You can request deletion at any time.
        </TcSection>
        <TcSection n="4" title="Where your data is stored">
          Secure, encrypted AWS cloud infrastructure, UK region, with industry-standard access controls.
        </TcSection>
        <TcSection n="5" title="Who sees your data">
          Not shared with third parties for their own purposes. Processed only by automated systems, and by AWS and Anthropic strictly as needed to run this service.
        </TcSection>
        <TcSection n="6" title="Accuracy and limitations">
          AI-generated feedback supports exam preparation only and is not an official result. Always refer to your course provider's official guidance.
        </TcSection>
      </div>
      <div style={styles.tcPanelFooter}>
        <button onClick={onAgree} style={styles.tcAgreeButton}>
          <i className="ti ti-check" style={{ fontSize: 15 }} />
          I agree
        </button>
      </div>
    </div>
  );
}

function TcSection({ n, title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ color: theme.mint, fontSize: 12, fontWeight: 500, margin: "0 0 6px" }}>{n}. {title}</p>
      <p style={{ color: theme.slateLight, fontSize: 11.5, lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21">
      <rect x="0" y="0" width="10" height="10" fill="#f25022" />
      <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
      <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
      <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: theme.pageBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    fontFamily: fonts.body
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#0d1021",
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 16,
    padding: 32
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: 10,
    background: "#00c2cb22",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 12px"
  },
  title: { color: "#fff", fontSize: 20, fontWeight: 500, margin: "0 0 4px", textAlign: "center" },
  subtitle: { color: theme.slateLight, fontSize: 13, margin: "0 0 20px", textAlign: "center" },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#e2434314", border: "1px solid #e2434344", borderRadius: 8,
    padding: "10px 12px", marginBottom: 16, color: "#f2a0a0", fontSize: 12.5
  },
  providerButton: {
    width: "100%", border: "none", borderRadius: 8, padding: 12,
    fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, marginBottom: 10
  },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "18px 0" },
  dividerLine: { flex: 1, height: 1, background: theme.navyLighter },
  dividerText: { color: "#6b7280", fontSize: 11 },
  infoBox: { background: theme.navyLighter, border: `1px solid ${theme.navyLighter}`, borderRadius: 8, padding: 12, marginBottom: 14 },
  infoText: { color: theme.slateLight, fontSize: 11.5, lineHeight: 1.5, margin: 0 },
  tcRow: { display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px", background: "#d4e15712", border: "1px solid #d4e15744", borderRadius: 8, marginBottom: 6 },
  checkbox: { width: 16, height: 16, borderRadius: 4, border: "1.5px solid", background: "none", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 },
  tcText: { color: "#eef2c8", fontSize: 11.5, lineHeight: 1.5, margin: 0 },
  tcLink: { color: theme.lime, textDecoration: "underline", cursor: "pointer" },
  tcHint: { color: "#6b7280", fontSize: 10.5, margin: "0 0 0 25px" },
  tcPanel: {
    width: "100%", maxWidth: 380, background: "#0d1021", border: `1px solid ${theme.navyLighter}`,
    borderRadius: 16, display: "flex", flexDirection: "column", maxHeight: 520
  },
  tcPanelHeader: { padding: "16px 20px", borderBottom: `1px solid ${theme.navyLighter}`, display: "flex", alignItems: "center", gap: 9 },
  tcPanelTitle: { color: "#fff", fontSize: 13.5, fontWeight: 500, margin: 0, flex: 1 },
  tcPanelClose: { background: "none", border: "none", color: theme.slateLight, cursor: "pointer", padding: 4 },
  tcPanelBody: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  tcPanelFooter: { padding: "12px 20px", borderTop: `1px solid ${theme.navyLighter}` },
  tcAgreeButton: {
    width: "100%", background: theme.navyLighter, border: `1px solid ${theme.lime}`, color: theme.lime,
    borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
  }
};
