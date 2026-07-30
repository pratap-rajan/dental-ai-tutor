import { useRef, useState, useEffect } from "react";
import Header from "./Header.jsx";
import Hero from "./Hero.jsx";
import HowItWorks from "./HowItWorks.jsx";
import UploadForm from "./UploadForm.jsx";
import Confirmation from "./Confirmation.jsx";
import Footer from "./Footer.jsx";

const STORAGE_KEY = "planore_pending_submission";
const COOLDOWN_MS = 200000; // matches Confirmation.jsx's "settle" timer

export default function App() {
  const [submission, setSubmission] = useState(null);
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

  return (
    <div style={{ background: "#04070f" }}>
      <Header onCtaClick={scrollToForm} />
      <Hero onCtaClick={scrollToForm} />
      <HowItWorks />
      {submission ? (
        <Confirmation submission={submission} onReset={handleReset} />
      ) : (
        <UploadForm onSubmitted={handleSubmitted} formRef={formRef} />
      )}
      <Footer />
    </div>
  );
}
