import { useEffect, useRef } from "react";
import Daily from "@daily-co/daily-js";
import { AVATAR_CASE_CATALOG } from "./config.js";
import { theme, fonts } from "./theme.js";

export default function AvatarLiveSession({ caseId, conversationUrl, onEnd }) {
  const iframeRef = useRef(null);
  const callFrameRef = useRef(null);
  const hasEndedRef = useRef(false); // guards against onEnd firing twice

  const caseLabel = AVATAR_CASE_CATALOG.find((c) => c.id === caseId)?.label ?? "Selected case";

  useEffect(() => {
    if (!iframeRef.current || !conversationUrl) return;

    // Wrap our own iframe element rather than letting Daily create one,
    // so we keep the layout/styling below - then join programmatically
    // (not via the iframe's src attribute) so the wrapped instance is
    // the one actually driving the call and can hear its events.
    const callFrame = Daily.wrap(iframeRef.current);
    callFrameRef.current = callFrame;
    callFrame.join({ url: conversationUrl });

    // Fires the moment the student leaves for ANY reason - Tavus/Daily's
    // own in-call leave control, closing the tab, a dropped connection,
    // or our own "End session" button below. This is what actually
    // frees the Tavus conversation slot immediately, instead of relying
    // on Tavus's own participant-left timeout.
    function handleLeftOrError() {
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;
      onEnd();
    }

    callFrame.on("left-meeting", handleLeftOrError);
    callFrame.on("error", handleLeftOrError);

    return () => {
      callFrame.off("left-meeting", handleLeftOrError);
      callFrame.off("error", handleLeftOrError);
      callFrame.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationUrl]);

  function handleEndClick() {
    // Triggers Daily's own "left-meeting" event, which calls onEnd via
    // the listener above - handleEndClick itself doesn't call onEnd
    // directly, so there's exactly one path that fires it either way.
    callFrameRef.current?.leave();
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.liveTag}>
          <span style={styles.liveDot} />
          Live · {caseLabel}
        </div>
      </div>

      <div style={styles.videoArea}>
        <iframe
          ref={iframeRef}
          title="AI patient avatar call"
          allow="camera; microphone; autoplay; fullscreen; display-capture"
          style={styles.iframe}
        />
      </div>

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