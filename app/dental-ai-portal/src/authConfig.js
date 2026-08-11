// Cognito Hosted OAuth configuration. These values are NOT secret —
// they're safe to ship in the built frontend bundle, same as any public
// OAuth client ID (there is no client secret for a browser-based SPA
// client, by design).
export const COGNITO_DOMAIN = "https://eu-west-2dkcktuhbh.auth.eu-west-2.amazoncognito.com";
export const COGNITO_CLIENT_ID = "qu9cshab6t3rodq4t63jvtapl";
// IMPORTANT: must be the www subdomain, not the bare root domain.
// planoreacademy.co.uk (no www) is only reachable via GoDaddy's domain
// forwarding (a browser redirect) to www.planoreacademy.co.uk, since
// GoDaddy has no ANAME/ALIAS record type for the apex domain. The two
// are DIFFERENT ORIGINS as far as sessionStorage is concerned — if the
// PKCE verifier or session gets written on one and the app later loads
// on the other, sessionStorage will always appear empty. Keeping every
// auth URL consistently on www avoids that origin mismatch entirely.
export const COGNITO_REDIRECT_URI = "https://www.planoreacademy.co.uk/";
export const COGNITO_LOGOUT_REDIRECT_URI = "https://www.planoreacademy.co.uk/";

// Where session tokens are cached in the browser between page loads.
// sessionStorage (not localStorage) is used deliberately — it clears
// when the tab/browser closes, so a shared/public computer doesn't
// leave a student logged in indefinitely.
export const SESSION_STORAGE_KEY = "planore_auth_session";

/**
 * Builds the URL that redirects the browser to Cognito's OAuth
 * authorize endpoint for a specific identity provider, bypassing
 * Cognito's own generic Hosted UI page entirely — this is what lets
 * the portal show its own themed login screen with a "Continue with
 * Google" button that goes straight to Google's real consent screen,
 * rather than showing Cognito's default page first.
 *
 * codeChallenge must be generated via preparePkceChallenge() in
 * AuthContext.jsx immediately before calling this — Cognito requires
 * PKCE for this app client since it's a public (SPA) client with no
 * client secret.
 */
export function buildAuthorizeUrl(identityProvider, codeChallenge) {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: "code",
    scope: "email openid profile",
    redirect_uri: COGNITO_REDIRECT_URI,
    identity_provider: identityProvider, // "Google" or the exact OIDC provider name set in Cognito, e.g. "Microsoft"
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    // Forces the account chooser to show every time, rather than
    // silently reusing an existing browser session. Google shows this
    // by default already; Microsoft does NOT — without this, Microsoft
    // sign-in skips straight to whichever account is already active in
    // the browser, giving no way to pick a different one (e.g. testing
    // as admin vs. a non-admin account). Cognito forwards this param
    // through to the underlying identity provider's own auth endpoint.
    prompt: "select_account"
  });
  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export function buildLogoutUrl() {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: COGNITO_LOGOUT_REDIRECT_URI
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export function buildTokenExchangeUrl() {
  return `${COGNITO_DOMAIN}/oauth2/token`;
}
