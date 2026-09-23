import { useState } from "react";
import AvatarSetup from "./AvatarSetup.jsx";
import AvatarLiveSession from "./AvatarLiveSession.jsx";
import { requestAvatarConversation } from "./api.js";

/**
 * Maps each sample case to its Tavus PAL. Extend this as more cases
 * get their own PAL created via create-pal.sh.
 */
const CASE_PAL_MAP = {
  "case3-avulsed-tooth": "pc08ef5b4df3"
};

/**
 * Maps each local persona selection to a real Tavus faceId, once you've
 * created/chosen one per persona. Leaving a value as null means that
 * persona falls back to the PAL's own default_face_id for now.
 */
const PERSONA_FACE_MAP = {
  female: null,
  male: null,
  clinical: null
};

/**
 * Orchestrates the AI Avatar tab: setup screen -> real Tavus
 * conversation -> live call screen. This now makes a real backend
 * call on "Start session" (via create-tavus-conversation), rather
 * than showing a static sample.
 */
export default function AvatarPractice() {
  const [step, setStep] = useState("setup"); // "setup" | "starting" | "live"
  const [caseId, setCaseId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [conversationUrl, setConversationUrl] = useState(null);
  const [error, setError] = useState(null);

  async function handleStart(selectedCaseId, selectedPersonaId) {
    setCaseId(selectedCaseId);
    setPersonaId(selectedPersonaId);
    setError(null);

    const palId = CASE_PAL_MAP[selectedCaseId];
    if (!palId) {
      setError("No Tavus PAL is configured for this case yet.");
      return;
    }

    setStep("starting");
    try {
      const result = await requestAvatarConversation({
        palId,
        faceId: PERSONA_FACE_MAP[selectedPersonaId] ?? undefined,
        caseId: selectedCaseId
      });
      setConversationUrl(result.conversationUrl);
      setStep("live");
    } catch (err) {
      setError(err.message || "Could not start the session.");
      setStep("setup");
    }
  }

  function handleEnd() {
    setConversationUrl(null);
    setStep("setup");
  }

  if (step === "live" && conversationUrl) {
    return (
      <AvatarLiveSession
        caseId={caseId}
        personaId={personaId}
        conversationUrl={conversationUrl}
        onEnd={handleEnd}
      />
    );
  }

  return (
    <AvatarSetup
      onStart={handleStart}
      starting={step === "starting"}
      error={error}
    />
  );
}