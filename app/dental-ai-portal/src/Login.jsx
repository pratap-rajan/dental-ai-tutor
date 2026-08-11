import { useState } from "react";
import { theme, fonts } from "./theme.js";
import { buildAuthorizeUrl } from "./authConfig.js";
import { preparePkceChallenge } from "./AuthContext.jsx";

export default function Login({ pendingApproval, authError, errorDetail }) {
  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcPanelOpen, setTcPanelOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const [googleHovered, setGoogleHovered] = useState(false);
  const [msHovered, setMsHovered] = useState(false);
  const [tcTileHovered, setTcTileHovered] = useState(false);

  async function handleProvider(providerName) {
    if (!tcAccepted || starting) return;
    setStarting(true);
    const challenge = await preparePkceChallenge();
    window.location.href = buildAuthorizeUrl(providerName, challenge);
  }

  function handleAgree() {
    setTcAccepted(true);
    setTcPanelOpen(false);
  }

  function handleCheckboxToggle() {
    setTcAccepted((v) => !v);
  }

  const cardAccent = theme.accentPurple;

  if (pendingApproval) {
    return (
      <div style={styles.page}>
        <div style={styles.centerWrap}>
          <Brand />
          <div style={{ ...styles.card, borderColor: "rgba(99,209,230,0.4)", boxShadow: "0 0 60px -12px rgba(99,209,230,0.35)" }}>
            <div style={{ ...styles.iconBadge, background: "rgba(99,209,230,0.14)" }}>
              <i className="ti ti-circle-check" style={{ color: theme.tealGlow, fontSize: 22 }} />
            </div>
            <h1 style={{ ...styles.title, color: theme.tealGlow }}>Thanks for signing in!</h1>
            <p style={styles.subtitle}>
              We've received your request. Our admin will review and approve your
              access within 1-2 business days — thanks for your patience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.centerWrap}>
        <Brand />

        <div
          style={{
            ...styles.card,
            borderColor: cardHovered ? cardAccent : theme.navyLighter,
            boxShadow: cardHovered
              ? `0 0 0 1px ${cardAccent}44, 0 0 60px -10px ${cardAccent}99, 0 16px 40px rgba(0,0,0,0.4)`
              : "0 0 60px -14px rgba(162,143,243,0.28)"
          }}
          onMouseEnter={() => setCardHovered(true)}
          onMouseLeave={() => setCardHovered(false)}
        >
          <div
            style={{
              ...styles.cardBacklight,
              background: `radial-gradient(circle at 30% 10%, ${cardAccent}2e, transparent 65%)`,
              opacity: cardHovered ? 1 : 0
            }}
          />

          <div style={styles.cardInner}>
            <h1 style={styles.title}>Sign in to continue</h1>
            <p style={styles.subtitle}>Plan Ore Academy — ORE and LDS practice</p>

            {authError && (
              <div style={styles.errorBox}>
                <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
                <span>
                  Sign-in didn't go through. Please try again.
                  {errorDetail && (
                    <span style={{ display: "block", opacity: 0.75, fontSize: 11, marginTop: 3 }}>
                      {errorDetail}
                    </span>
                  )}
                </span>
              </div>
            )}

            <button
              style={{
                ...styles.providerButton,
                background: "#fff",
                color: "#1f1f1f",
                opacity: tcAccepted ? 1 : 0.5,
                cursor: tcAccepted ? "pointer" : "not-allowed",
                boxShadow: googleHovered && tcAccepted ? "0 0 24px -4px rgba(255,255,255,0.55)" : "none",
                transform: googleHovered && tcAccepted ? "translateY(-1px)" : "translateY(0)"
              }}
              onClick={() => handleProvider("Google")}
              onMouseEnter={() => setGoogleHovered(true)}
              onMouseLeave={() => setGoogleHovered(false)}
              disabled={!tcAccepted || starting}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              style={{
                ...styles.providerButton,
                background: theme.navyLighter,
                color: "#fff",
                border: `1px solid ${msHovered && tcAccepted ? theme.tealGlow : theme.navyLighter}`,
                opacity: tcAccepted ? 1 : 0.5,
                cursor: tcAccepted ? "pointer" : "not-allowed",
                boxShadow: msHovered && tcAccepted ? `0 0 24px -6px ${theme.tealGlow}88` : "none",
                transform: msHovered && tcAccepted ? "translateY(-1px)" : "translateY(0)"
              }}
              onClick={() => handleProvider("Microsoft")}
              onMouseEnter={() => setMsHovered(true)}
              onMouseLeave={() => setMsHovered(false)}
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
                type="button"
                aria-label={tcAccepted ? "Terms accepted" : "Accept terms and conditions"}
                aria-pressed={tcAccepted}
                onClick={handleCheckboxToggle}
                style={{
                  ...styles.checkbox,
                  borderColor: tcAccepted ? theme.lime : theme.navyLighter,
                  background: tcAccepted ? theme.lime : "transparent"
                }}
              >
                {tcAccepted && <span style={styles.checkboxTick}>✓</span>}
              </button>
              <p style={styles.tcText}>
                I have read and accept the{" "}
                <span
                  role="button"
                  tabIndex={0}
                  style={styles.tcLink}
                  onClick={() => setTcPanelOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setTcPanelOpen((v) => !v);
                  }}
                >
                  Terms and Conditions
                </span>{" "}
                for recording submission and assessment
              </p>
            </div>
            <p style={styles.tcHint}>Required to sign in</p>

            <button
              type="button"
              style={{
                ...styles.tcTile,
                borderColor: tcTileHovered ? theme.purpleGlow : theme.navyLighter,
                boxShadow: tcTileHovered ? `0 0 24px -8px ${theme.purpleGlow}99` : "none"
              }}
              onClick={() => setTcPanelOpen((v) => !v)}
              onMouseEnter={() => setTcTileHovered(true)}
              onMouseLeave={() => setTcTileHovered(false)}
            >
              <div style={styles.tcTileIcon}>
                <i className="ti ti-file-text" style={{ color: theme.purpleGlow, fontSize: 17 }} />
              </div>
              <div style={styles.tcTileContent}>
                <div style={styles.tcTileTitle}>Terms and Conditions</div>
                <div style={styles.tcTileSubtitle}>
                  {tcPanelOpen ? "Tap to collapse" : "Tap to view the full terms"}
                </div>
              </div>
              {tcAccepted && !tcPanelOpen ? (
                <span style={styles.acceptedBadge}>
                  <span style={styles.smallTick}>✓</span>
                  Accepted
                </span>
              ) : (
                <i className={`ti ti-chevron-${tcPanelOpen ? "up" : "down"}`} style={{ color: theme.slateLight, fontSize: 16 }} />
              )}
            </button>

            {/* Terms panel expands INLINE within the same card — no
                separate page, no detached floating overlay. */}
            {tcPanelOpen && (
              <div style={styles.tcInlinePanel}>
                <button
                  type="button"
                  onClick={() => setTcPanelOpen(false)}
                  style={styles.tcInlineClose}
                  aria-label="Close terms and conditions"
                >
                  <span style={styles.closeIcon}>✕</span>
                </button>

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
                  <button type="button" onClick={handleAgree} style={styles.tcAgreeButton}>
                    <span style={styles.agreeTick}>✓</span>
                    I agree
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div style={styles.brandRow}>
      <img src="/assets/planore_logo.png" alt="Plan Ore Academy" style={styles.brandLogo} />
      <span style={styles.brandWordmark}>PLAN ORE ACADEMY</span>
    </div>
  );
}

function TcSection({ n, title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
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
    background: [
      `radial-gradient(ellipse 900px 500px at 22% 10%, rgba(162,143,243,0.24), transparent 60%)`,
      `radial-gradient(ellipse 700px 500px at 78% 78%, rgba(99,209,230,0.20), transparent 55%)`,
      `linear-gradient(180deg, ${theme.pageBg} 0%, #0a0620 35%, #060a16 70%, ${theme.pageBg} 100%)`
    ].join(", "),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    fontFamily: fonts.body,
    position: "relative",
    overflow: "hidden"
  },
  centerWrap: { width: "100%", maxWidth: 400, position: "relative", zIndex: 1 },
  brandRow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22
  },
  brandLogo: { width: 34, height: 34, flexShrink: 0 },
  brandWordmark: {
    fontFamily: fonts.display, fontSize: 16, fontWeight: 600, letterSpacing: "0.03em", color: theme.teal
  },
  card: {
    position: "relative",
    width: "100%",
    background: "rgba(13,16,33,0.9)",
    backdropFilter: "blur(6px)",
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 16,
    overflow: "hidden",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
  },
  cardBacklight: {
    position: "absolute", inset: 0, pointerEvents: "none", transition: "opacity 0.25s ease"
  },
  cardInner: { position: "relative", padding: 32 },
  iconBadge: {
    width: 44, height: 44, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 14px"
  },
  title: { color: "#fff", fontSize: 20, fontWeight: 500, margin: "0 0 4px", textAlign: "center" },
  subtitle: { color: theme.slateLight, fontSize: 13, margin: "0 0 20px", textAlign: "center", lineHeight: 1.6 },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#e2434314", border: "1px solid #e2434344", borderRadius: 8,
    padding: "10px 12px", marginBottom: 16, color: "#f2a0a0", fontSize: 12.5
  },
  providerButton: {
    width: "100%", border: "none", borderRadius: 8, padding: 12,
    fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10, marginBottom: 10,
    transition: "box-shadow 0.2s ease, transform 0.2s ease"
  },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "18px 0" },
  dividerLine: { flex: 1, height: 1, background: theme.navyLighter },
  dividerText: { color: "#6b7280", fontSize: 11, whiteSpace: "nowrap" },
  infoBox: { background: theme.navyLighter, border: `1px solid ${theme.navyLighter}`, borderRadius: 8, padding: 12, marginBottom: 14 },
  infoText: { color: theme.slateLight, fontSize: 11.5, lineHeight: 1.5, margin: 0 },
  tcRow: { display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px", background: "#d4e15712", border: "1px solid #d4e15744", borderRadius: 8, marginBottom: 6 },
  checkbox: {
    width: 17, height: 17, minWidth: 17, borderRadius: 4, border: "1.5px solid",
    flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0, boxSizing: "border-box"
  },
  checkboxTick: { color: "#0d1021", fontSize: 13, fontWeight: 800, lineHeight: 1 },
  tcText: { color: "#eef2c8", fontSize: 11.5, lineHeight: 1.5, margin: 0 },
  tcLink: { color: theme.lime, textDecoration: "underline", cursor: "pointer", fontWeight: 500 },
  tcHint: { color: "#6b7280", fontSize: 10.5, margin: "0 0 10px 25px" },

  tcTile: {
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "11px 12px", background: "#11162a", border: "1px solid",
    borderRadius: 8, cursor: "pointer", textAlign: "left", boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
  },
  tcTileIcon: {
    width: 30, height: 30, borderRadius: 7, background: "#7c6cff14",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
  },
  tcTileContent: { flex: 1, minWidth: 0 },
  tcTileTitle: { color: "#fff", fontSize: 12, fontWeight: 500, marginBottom: 2 },
  tcTileSubtitle: { color: "#6b7280", fontSize: 10.5 },
  acceptedBadge: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#72d4c422", color: theme.ctaMint, fontSize: 10.5, fontWeight: 500,
    padding: "3px 7px", borderRadius: 20, whiteSpace: "nowrap"
  },
  smallTick: { fontSize: 12, fontWeight: 700, lineHeight: 1 },

  // Inline, same-card, same-page expanding panel — replaces the old
  // separate fixed-position overlay + backdrop entirely.
  tcInlinePanel: {
    position: "relative",
    marginTop: 12,
    background: "rgba(9,11,22,0.7)",
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 12,
    overflow: "hidden"
  },
  tcInlineClose: {
    position: "absolute", top: 10, right: 10, zIndex: 2,
    width: 26, height: 26, border: `1.5px solid ${theme.tealGlow}`, borderRadius: 7,
    background: "rgba(99,209,230,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer"
  },
  closeIcon: { color: theme.tealGlow, fontSize: 12, fontWeight: 700, lineHeight: 1 },
  tcPanelBody: { maxHeight: 260, overflowY: "auto", padding: "18px 44px 4px 16px" },
  tcPanelFooter: { padding: "12px 16px", borderTop: `1px solid ${theme.navyLighter}` },
  tcAgreeButton: {
    width: "100%", background: theme.navyLighter, border: `1px solid ${theme.lime}`, color: theme.lime,
    borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
  },
  agreeTick: { fontSize: 15, fontWeight: 700, lineHeight: 1 }
};