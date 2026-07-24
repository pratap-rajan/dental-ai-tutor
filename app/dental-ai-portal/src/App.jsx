import { useRef } from "react";
import Hero from "./Hero.jsx";
import Features from "./Features.jsx";
import HowItWorks from "./HowItWorks.jsx";
import UploadForm from "./UploadForm.jsx";
import Confirmation from "./Confirmation.jsx";
import Footer from "./Footer.jsx";
import { useState } from "react";

export default function App() {
  const [submission, setSubmission] = useState(null);
  const formRef = useRef(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ background: "#293039" }}>
      <Hero onCtaClick={scrollToForm} />
      <Features />
      <HowItWorks />
      {submission ? (
        <Confirmation submission={submission} onReset={() => setSubmission(null)} />
      ) : (
        <UploadForm onSubmitted={setSubmission} formRef={formRef} />
      )}
      <Footer />
    </div>
  );
}
