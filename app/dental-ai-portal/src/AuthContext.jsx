import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  COGNITO_CLIENT_ID,
  COGNITO_REDIRECT_URI,
  SESSION_STORAGE_KEY,
  buildTokenExchangeUrl,
  buildLogoutUrl
} from "./authConfig.js";

const AuthContext = createContext(null);

/**
 * Decodes a JWT's payload without verifying the signature. This is safe
 * here specifically because we only ever read claims for DISPLAY
 * purposes (name/email) and to check basic expiry for UI state — the
 * actual security boundary is enforced server-side, since every real
 * action (uploading a recording) goes through presigned-upload-url,
 * which independently validates the token against Cognito itself
 * rather than trusting anything decoded client-side.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(payload) {
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

const PKCE_VERIFIER_KEY = "planore_pkce_verifier";

function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => ("0" + b.toString(16)).slice(-2)).join("").slice(0, length);
}

async function sha256Base64Url(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  let binary = "";
  hashArray.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates and stores a PKCE code_verifier, returning its
 * code_challenge — required because this app client is an SPA
 * ("public client", no client secret), and Cognito requires PKCE for
 * the Authorization Code grant on public clients. Called right before
 * redirecting to Cognito's /oauth2/authorize endpoint.
 */
export async function preparePkceChallenge() {
  const verifier = generateRandomString(64);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  const challenge = await sha256Base64Url(verifier);
  return challenge;
}

function consumePkceVerifier() {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  return verifier;
}

function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const payload = decodeJwtPayload(session.idToken);
    if (!payload || isExpired(payload)) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return { ...session, claims: payload };
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

async function exchangeCodeForTokens(code) {
  const codeVerifier = consumePkceVerifier();
  if (!codeVerifier) {
    throw new Error("Missing PKCE code_verifier — the sign-in link must be started from this app, not visited directly");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: COGNITO_REDIRECT_URI,
    code_verifier: codeVerifier
  });

  const response = await fetch(buildTokenExchangeUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) {
    // Surface Cognito's actual error body — token-exchange failures
    // (e.g. disabled account, expired code, PKCE mismatch) return a
    // JSON body explaining exactly why, and that detail is essential
    // for diagnosing a failure that otherwise just looks like "bounced
    // back to login" with no explanation.
    let detail = "";
    try {
      const errBody = await response.json();
      detail = errBody.error_description || errBody.error || JSON.stringify(errBody);
    } catch {
      detail = await response.text().catch(() => "");
    }
    console.error(`Token exchange failed (${response.status}):`, detail);
    throw new Error(`Token exchange failed: ${response.status}${detail ? " — " + detail : ""}`);
  }

  return response.json(); // { id_token, access_token, refresh_token, ... }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | unauthenticated | error
  const [error, setError] = useState(null);

  const completeSignIn = useCallback((tokens) => {
    const payload = decodeJwtPayload(tokens.id_token);
    const stored = {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
    setSession({ ...stored, claims: payload });
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    // Guards against React 18 StrictMode's deliberate double-invocation
    // of effects in development, and against this effect somehow
    // re-running before the async exchange settles. Both the
    // authorization code and the PKCE verifier are single-use — a
    // second exchange attempt with the same code fails at Cognito
    // (invalid_grant), which otherwise looks just like "sign-in
    // silently didn't work."
    let cancelled = false;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const oauthError = url.searchParams.get("error");

    if (oauthError) {
      setError(oauthError);
      setStatus("error");
      window.history.replaceState({}, "", COGNITO_REDIRECT_URI);
      return;
    }

    if (code) {
      exchangeCodeForTokens(code)
        .then((tokens) => {
          if (cancelled) return;
          completeSignIn(tokens);
          window.history.replaceState({}, "", COGNITO_REDIRECT_URI);
        })
        .catch((ex) => {
          if (cancelled) return;
          console.error("Token exchange failed:", ex);
          setError(ex.message || "sign_in_failed");
          setStatus("error");
          // Strip ?code=... even on failure — a stale/consumed code
          // left in the URL would otherwise be resubmitted on refresh
          // and fail again with the same confusing result.
          window.history.replaceState({}, "", COGNITO_REDIRECT_URI);
        });
      return () => {
        cancelled = true;
      };
    }

    const restored = loadStoredSession();
    if (restored) {
      setSession(restored);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }
  }, [completeSignIn]);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setStatus("unauthenticated");
    window.location.href = buildLogoutUrl();
  }, []);

  const value = {
    status,          // "loading" | "authenticated" | "unauthenticated" | "error"
    session,          // { idToken, accessToken, refreshToken, claims } | null
    error,
    signOut,
    // Convenience accessors for the common fields the rest of the app needs
    email: session?.claims?.email ?? null,
    name: session?.claims?.name ?? session?.claims?.email ?? null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}