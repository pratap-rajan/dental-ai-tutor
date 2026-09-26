import { useState } from "react";
import AvatarSetup from "./AvatarSetup.jsx";
import AvatarLiveSession from "./AvatarLiveSession.jsx";
import { requestAvatarConversation, endAvatarSession } from "./api.js";

/**
 * Maps each sample case to its Tavus PAL. Extend this as more cases
 * get their own PAL created via create-pal.sh.
 */
const CASE_PAL_MAP = {
  "case3-avulsed-tooth": "pc08ef5b4df3"
};

/**
 * Orchestrates the AI Avatar tab: pick a case -> real Tavus
 * conversation -> live call screen. No face/persona picker - every
 * case uses its PAL's own default face. The review report always
 * goes to the admin inbox (set server-side via ai-avatar-engine's
 * ADMIN_REVIEW_EMAIL env var), never directly to whoever is testing,
 * since the intent is admin review before sharing with the student.
 */
export default function AvatarPractice() {
  const [step, setStep] = useState("setup"); // "setup" | "starting" | "live"
  const [caseId, setCaseId] = useState("");
  const [conversationUrl, setConversationUrl] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);

  async function handleStart(selectedCaseId) {
    setCaseId(selectedCaseId);
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
        caseId: selectedCaseId
      });
      setConversationUrl(result.conversationUrl);
      setConversationId(result.conversationId);
      setStep("live");
    } catch (err) {
      setError(err.message || "Could not start the session.");
      setStep("setup");
    }
  }

  async function handleEnd() {
    // Best-effort: tell Tavus the call is over so it doesn't linger
    // as "active" and eat into the concurrent-conversation limit.
    // The UI moves on regardless of whether this call succeeds.
    if (conversationId) {
      try {
        await endAvatarSession({ conversationId });
      } catch (err) {
        console.error("Failed to end avatar session server-side:", err);
      }
    }
    setConversationUrl(null);
    setConversationId(null);
    setStep("setup");
  }

  if (step === "live" && conversationUrl) {
    return (
      <AvatarLiveSession
        caseId={caseId}
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