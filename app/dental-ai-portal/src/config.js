// -----------------------------------------------------------------------
// EDIT THESE VALUES FOR YOUR DEPLOYMENT
// -----------------------------------------------------------------------

// The API Gateway endpoint that fronts your presigned-URL Lambda.
// Deployed to the $default stage, so there is no /prod suffix.
export const API_BASE_URL = "https://rc98xaw0tg.execute-api.eu-west-2.amazonaws.com";

// Case catalog shown in the dropdown. Keep "id" identical to the
// caseId used in your S3 folder structure (cases/{id}/...), since
// that id is what gets embedded in the upload path.
//
// This can later be swapped for a fetch() call to a
// cases/case-catalog.json file in S3 instead of hardcoding it here,
// once you don't want to redeploy the portal every time you add a case.
export const CASE_CATALOG = [
  {
    id: "case1-amalgam-highspot",
    label: "Case 1 — Amalgam high spot"
  },
  {
    id: "case2-amalgam-toxicity-filling",
    label: "Case 2 — Amalgam toxicity concerns"
  },
  {
    id: "case3-avulsed-tooth",
    label: "Case 3 — Avulsed tooth (telephone triage)"
  },
  {
    id: "case4-bleeding",
    label: "Case 4 — Post-extraction bleeding"
  },
  {
    id: "case5-bisphosphonates",
    label: "Case 5 — Bisphosphonates & ONJ risk"
  },
  {
    id: "case6-consent",
    label: "Case 6 — Consent for extraction of upper molar"
  },
  {
    id: "case7-oac",
    label: "Case 7 — Oro-antral communication"
  },
  {
    id: "case8-denture-hygiene-advice",
    label: "Case 8 — Denture hygiene advice"
  },
  {
    id: "case9-dietary-advice",
    label: "Case 9 — Dietary advice"
  },
  {
    id: "case10-dry-mouth",
    label: "Case 10 — Dry mouth"
  },
  {
    id: "case11-dry-socket",
    label: "Case 11 — Dry socket"
  },
  {
    id: "case12-impacted-tooth",
    label: "Case 12 — Impacted tooth"
  },
  {
    id: "case13-flabby-ridge",
    label: "Case 13 — Flabby ridge"
  },
  {
    id: "case14-fluoride-supplements",
    label: "Case 14 — Fluoride supplements"
  },
  {
    id: "case15-supernumerary-tooth",
    label: "Case 15 — Supernumerary tooth"
  }
];

// Max upload size, matches whatever limit you enforce server-side too.
export const MAX_FILE_SIZE_MB = 200;

// Recording formats accepted end-to-end. Must stay in sync with
// ALLOWED_EXTENSIONS in presigned_url_lambda.py and MEDIA_FORMATS in
// transcribe_trigger_lambda.py — Amazon Transcribe supports all three
// natively for batch jobs, so adding a new one here just needs the
// matching addition on both Lambdas (and the delete-processed-recording
// Lambda's ALLOWED_EXTENSIONS, so cleanup can still find the file).
export const ALLOWED_EXTENSIONS = ["mp4", "ogg", "wav"];

// Google reCAPTCHA v3 site key. Get this from
// https://www.google.com/recaptcha/admin — register a v3 site for
// your Amplify domain. Leave as "" to disable CAPTCHA entirely (e.g.
// for local development) — the form and backend both treat an empty
// key as "no CAPTCHA required".
export const RECAPTCHA_SITE_KEY = "";
