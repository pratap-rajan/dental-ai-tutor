import { useRef, useState, useEffect } from "react";
import Header from "./Header.jsx";
import Hero from "./Hero.jsx";
import HowItWorks from "./HowItWorks.jsx";
import UploadForm from "./UploadForm.jsx";
import Confirmation from "./Confirmation.jsx";
import Footer from "./Footer.jsx";
import Login from "./Login.jsx";
import MyReports from "./MyReports.jsx";
import { useAuth } from "./AuthContext.jsx";
import { theme } from "./theme.js";

const STORAGE_KEY = "planore_pending_submission";
const COOLDOWN_MS = 90000; // matches Confirmation.jsx's "settle" timer

export default function App() {
  const [submission, setSubmission] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const formRef = useRef(null);

  // Restore an in-progress submission after a page refresh, so a
  // student can't bypass the cooldown just by reloading the page.
  // If the cooldown window has already elapsed since they submitted,
  // clear it and let them submit again normally.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      const elapsed = Date.now() - saved.submittedAt;
      if (elapsed < COOLDOWN_MS) {
        setSubmission(saved);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmitted(data) {
    const withTimestamp = { ...data, submittedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
    setSubmission(withTimestamp);
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    setSubmission(null);
  }

  const { status, name, email, error, signOut, session } = useAuth();

  // Still checking for a stored/callback session on first load.
  if (status === "loading") {
    return (
      <div style={{ background: theme.pageBg, minHeight: "100vh" }} />
    );
  }

  // No valid session, or the OAuth callback errored — show the themed
  // login screen instead of the portal. A disabled (not-yet-approved)
  // account fails here too: presigned-upload-url independently
  // validates the token server-side and will reject a disabled
  // account's requests even if a stale token is still held client-side,
  // so this gate is a UX convenience, not the actual security boundary.
  if (status === "pending_approval") {
    return <Login pendingApproval />;
  }

  if (status === "unauthenticated" || status === "error") {
    return <Login authError={status === "error"} errorDetail={error} />;
  }

  if (showReports) {
    return (
      <div style={{ background: theme.pageBg, minHeight: "100vh" }}>
        <Header
          onCtaClick={scrollToForm}
          studentName={name}
          onSignOut={signOut}
          onShowReports={() => setShowReports(true)}
        />
        <MyReports idToken={session?.idToken} onBack={() => setShowReports(false)} />
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ background: theme.pageBg }}>
      <Header
        onCtaClick={scrollToForm}
        studentName={name}
        onSignOut={signOut}
        onShowReports={() => setShowReports(true)}
      />
      <Hero onCtaClick={scrollToForm} />
      <HowItWorks />
      {submission ? (
        <Confirmation submission={submission} onReset={handleReset} />
      ) : (
        <UploadForm onSubmitted={handleSubmitted} formRef={formRef} studentEmail={email} />
      )}
      <Footer />
    </div>
  );
}