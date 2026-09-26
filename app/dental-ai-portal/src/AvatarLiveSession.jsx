import { useEffect, useRef, useState } from "react";
import Daily from "@daily-co/daily-js";
import { AVATAR_CASE_CATALOG } from "./config.js";
import { theme, fonts } from "./theme.js";

// Exam clock configuration for this station. Adjust here if a future
// case needs a different time budget - these aren't wired to
// per-case config yet (single-case setup, see AvatarPractice.jsx).
const TOTAL_SESSION_SECONDS = 300; // 5 min, matching the real exam time
const START_DELAY_SECONDS = 5;     // grace period after joining before the clock starts
const AMBER_AT_SECONDS = 240;      // 4:00 elapsed (1:00 remaining) - beep + amber
const RED_AT_SECONDS = 280;        // 4:40 elapsed (0:20 remaining) - red
const CLOSING_GRACE_SECONDS = 12;  // time allowed for closing remarks after the clock hits zero

export default function AvatarLiveSession({ caseId, conversationUrl, onEnd }) {
  const iframeRef = useRef(null);
  const callFrameRef = useRef(null);
  const hasEndedRef = useRef(false);   // guards against onEnd firing twice
  const hasBeepedRef = useRef(false);  // guards against the beep firing more than once
  const tickIntervalRef = useRef(null);
  const startDelayTimeoutRef = useRef(null);
  const closingTimeoutRef = useRef(null);

  // "waiting" (call not joined yet) -> "starting" (5s grace period) ->
  // "running" (clock ticking) -> "time-up" (closing-remarks window) -> ended
  const [clockPhase, setClockPhase] = useState("waiting");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const caseLabel = AVATAR_CASE_CATALOG.find((c) => c.id === caseId)?.label ?? "Selected case";

  useEffect(() => {
    if (!iframeRef.current || !conversationUrl) return;

    // Load the call the proven way (the iframe's own src loads Tavus's
    // room directly) - Daily.wrap() is used only to listen for events
    // on that same iframe, not to drive the join itself.
    const callFrame = Daily.wrap(iframeRef.current);
    callFrameRef.current = callFrame;

    function clearAllTimers() {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (startDelayTimeoutRef.current) clearTimeout(startDelayTimeoutRef.current);
      if (closingTimeoutRef.current) clearTimeout(closingTimeoutRef.current);
    }

    function handleJoined() {
      setClockPhase("starting");
      startDelayTimeoutRef.current = setTimeout(() => {
        setClockPhase("running");
        tickIntervalRef.current = setInterval(() => {
          setElapsedSeconds((prev) => {
            const next = prev + 1;

            if (next === AMBER_AT_SECONDS && !hasBeepedRef.current) {
              hasBeepedRef.current = true;
              playBeep();
            }

            if (next >= TOTAL_SESSION_SECONDS) {
              clearInterval(tickIntervalRef.current);
              setClockPhase("time-up");
              closingTimeoutRef.current = setTimeout(() => {
                if (hasEndedRef.current) return;
                hasEndedRef.current = true;
                onEnd();
              }, CLOSING_GRACE_SECONDS * 1000);
            }

            return next;
          });
        }, 1000);
      }, START_DELAY_SECONDS * 1000);
    }

    function handleLeftOrError() {
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;
      clearAllTimers();
      onEnd();
    }

    callFrame.on("joined-meeting", handleJoined);
    callFrame.on("left-meeting", handleLeftOrError);
    callFrame.on("error", handleLeftOrError);

    return () => {
      clearAllTimers();
      callFrame.off("joined-meeting", handleJoined);
      callFrame.off("left-meeting", handleLeftOrError);
      callFrame.off("error", handleLeftOrError);
      callFrame.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationUrl]);

  function handleEndClick() {
    callFrameRef.current?.leave();
  }

  const remainingSeconds = Math.max(0, TOTAL_SESSION_SECONDS - elapsedSeconds);
  const clockColor =
    elapsedSeconds >= RED_AT_SECONDS ? theme.danger :
    elapsedSeconds >= AMBER_AT_SECONDS ? AMBER_COLOR :
    theme.lime;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.liveTag}>
          <span style={styles.liveDot} />
          Live · {caseLabel}
        </div>
        {(clockPhase === "running" || clockPhase === "time-up") && (
          <div style={{ ...styles.clockPill, background: `${clockColor}22`, color: clockColor, borderColor: clockColor }}>
            {clockPhase === "time-up" ? "Time's up" : formatClock(remainingSeconds)}
          </div>
        )}
      </div>

      <div style={styles.videoArea}>
        <iframe
          ref={iframeRef}
          title="AI patient avatar call"
          src={conversationUrl}
          allow="camera; microphone; autoplay; fullscreen; display-capture"
          style={styles.iframe}
        />
      </div>

      {clockPhase === "time-up" && (
        <p style={styles.timeUpNote}>Give your closing remarks now — the session will end shortly.</p>
      )}

      <div style={styles.controls}>
        <button type="button" style={styles.endButton} onClick={handleEndClick}>
          <EndCallIcon />
          End session
        </button>
      </div>

      <p style={styles.note}>
        Mic, camera, and mute controls are inside the call window above —
        this embeds Tavus's own call UI directly.
      </p>
    </div>
  );
}

// Not part of theme.js's design system (no amber token defined there) -
// a literal choice for this one warning state.
const AMBER_COLOR = "#f2b134";

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 880; // a simple, gentle tone - not an alarm
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    console.error("Could not play timer beep:", err);
  }
}

function EndCallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" />
    </svg>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", fontFamily: fonts.body },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  liveTag: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: theme.white
  },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: theme.danger },
  clockPill: {
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 999,
    border: "1.5px solid",
    letterSpacing: 0.5
  },
  videoArea: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${theme.navyLighter}`,
    background: theme.pageBg,
    aspectRatio: "16 / 9",
    marginBottom: 18
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block"
  },
  timeUpNote: {
    fontSize: 13,
    color: theme.danger,
    textAlign: "center",
    fontWeight: 600,
    marginBottom: 12
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 12
  },
  endButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 20px",
    height: 44,
    borderRadius: 22,
    border: "none",
    background: theme.danger,
    color: theme.white,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: "pointer"
  },
  note: {
    fontSize: 12,
    color: theme.slateLight,
    textAlign: "center",
    margin: 0
  }
};