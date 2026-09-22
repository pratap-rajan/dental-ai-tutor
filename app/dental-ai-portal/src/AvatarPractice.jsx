import { useState } from "react";
import AvatarSetup from "./AvatarSetup.jsx";
import AvatarLiveSession from "./AvatarLiveSession.jsx";

/**
 * Renders inside the "AI Avatar" station tab. This is a UI-only sample
 * for admin testing right now: AvatarSetup lets the admin pick a case
 * and a patient persona, "Start session" moves to AvatarLiveSession — a
 * static mock of the live call screen. Neither step calls a real avatar
 * provider (Tavus/Simli) or the scoring pipeline yet; that wiring is a
 * separate, later piece of work.
 */
export default function AvatarPractice() {
  const [step, setStep] = useState("setup"); // "setup" | "live"
  const [caseId, setCaseId] = useState("");
  const [personaId, setPersonaId] = useState("");

  function handleStart(selectedCaseId, selectedPersonaId) {
    setCaseId(selectedCaseId);
    setPersonaId(selectedPersonaId);
    setStep("live");
  }

  function handleEnd() {
    setStep("setup");
  }

  if (step === "live") {
    return <AvatarLiveSession caseId={caseId} personaId={personaId} onEnd={handleEnd} />;
  }

  return <AvatarSetup onStart={handleStart} />;
}
