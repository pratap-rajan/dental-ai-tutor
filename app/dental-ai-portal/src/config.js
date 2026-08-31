// -----------------------------------------------------------------------
// EDIT THESE VALUES FOR YOUR DEPLOYMENT
// -----------------------------------------------------------------------

// The API Gateway endpoint that fronts your presigned-URL Lambda.
// Deployed to the $default stage, so there is no /prod suffix.
export const API_BASE_URL = "https://rc98xaw0tg.execute-api.eu-west-2.amazonaws.com";

// Station types shown as tabs above the case picker. "enabled: false"
// renders the tab visibly but disabled/unclickable — used to preview
// upcoming station types (e.g. DTP) before they're actually built out.
// Long-term, "enabled" here will be driven by the signed-in student's
// actual purchased entitlement rather than a hardcoded flag — this
// same STATION_TYPES/filter structure is what that future permission
// check will plug into, so no rebuild is needed when that lands.
export const STATION_TYPES = [
  { id: "OSCE", label: "OSCE", enabled: true },
  { id: "DTP", label: "DTP", enabled: false },
  { id: "SCR", label: "SCR", enabled: true }
];

export const DEFAULT_STATION_TYPE = "OSCE";

// Case catalog shown in the dropdown. Keep "id" identical to the
// caseId used in your S3 folder structure (cases/{id}/...), since
// that id is what gets embedded in the upload path. "stationType"
// must match one of the STATION_TYPES ids above — it's what the tabs
// filter on.
//
// This can later be swapped for a fetch() call to a
// cases/case-catalog.json file in S3 instead of hardcoding it here,
// once you don't want to redeploy the portal every time you add a case.
export const CASE_CATALOG = [
  {
    id: "case1-amalgam-highspot",
    label: "Case 1 — Amalgam high spot",
    stationType: "OSCE"
  },
  {
    id: "case2-amalgam-toxicity-filling",
    label: "Case 2 — Amalgam toxicity concerns",
    stationType: "OSCE"
  },
  {
    id: "case3-avulsed-tooth",
    label: "Case 3 — Avulsed tooth (telephone triage)",
    stationType: "OSCE"
  },
  {
    id: "case4-bleeding",
    label: "Case 4 — Post-extraction bleeding",
    stationType: "OSCE"
  },
  {
    id: "case5-bisphosphonates",
    label: "Case 5 — Bisphosphonates & ONJ risk",
    stationType: "OSCE"
  },
  {
    id: "case6-consent-extraction",
    label: "Case 6 — Consent for extraction of upper molar",
    stationType: "OSCE"
  },
  {
    id: "case7-oac",
    label: "Case 7 — Oro-antral communication",
    stationType: "OSCE"
  },
  {
    id: "case8-denture-hygiene-advice",
    label: "Case 8 — Denture hygiene advice",
    stationType: "OSCE"
  },
  {
    id: "case9-dietary-advice",
    label: "Case 9 — Dietary advice",
    stationType: "OSCE"
  },
  {
    id: "case10-dry-mouth",
    label: "Case 10 — Dry mouth",
    stationType: "OSCE"
  },
  {
    id: "case11-dry-socket",
    label: "Case 11 — Dry socket",
    stationType: "OSCE"
  },
  {
    id: "case12-impacted-tooth",
    label: "Case 12 — Impacted tooth",
    stationType: "OSCE"
  },
  {
    id: "case13-flabby-ridge",
    label: "Case 13 — Flabby ridge",
    stationType: "OSCE"
  },
  {
    id: "case14-fluoride-supplements",
    label: "Case 14 — Fluoride supplements",
    stationType: "OSCE"
  },
  {
    id: "case15-supernumerary-tooth",
    label: "Case 15 — Supernumerary tooth",
    stationType: "OSCE"
  },
  {
    id: "case16-sedation",
    label: "Case 16 — Sedation options",
    stationType: "OSCE"
  },
  {
    id: "case17-denture-stomatitis",
    label: "Case 17 — Denture stomatitis",
    stationType: "OSCE"
  },
  {
    id: "case18-halls-technique",
    label: "Case 18 — Hall technique",
    stationType: "OSCE"
  },
  {
    id: "case19-lipcut-lip-burns",
    label: "Case 19 — Lip cut / lip burns",
    stationType: "OSCE"
  },
  {
    id: "case20-mpds",
    label: "Case 20 — Myofascial pain dysfunction syndrome",
    stationType: "OSCE"
  },
  {
    id: "case1-scr-dental-trauma",
    label: "Case 1 — Dental trauma",
    stationType: "SCR"
  },
  {
    id: "case2-scr-impacted-third-molar",
    label: "Case 2 — Impacted third molar",
    stationType: "SCR"
  },
  {
    id: "case3-scr-periodontal-abscess",
    label: "Case 3 — Periodontal abscess",
    stationType: "SCR"
  },
  {
    id: "case4-scr-angular-cheilitis-reduced-vd-cracked-tooth",
    label: "Case 4 — Angular cheilitis, decreased VD & cracked tooth",
    stationType: "SCR"
  },
  {
    id: "case5-scr-periodontitis",
    label: "Case 5 — Periodontitis",
    stationType: "SCR"
  },
  {
    id: "case6-scr-ameloblastoma",
    label: "Case 6 — Ameloblastoma",
    stationType: "SCR"
  },
  {
    id: "case7-scr-denture-stomatitis",
    label: "Case 7 — Denture stomatitis & increased VD",
    stationType: "SCR"
  },
  {
    id: "case8-scr-periapical-cyst",
    label: "Case 8 — Periapical cyst & tooth wear",
    stationType: "SCR"
  },
  {
    id: "case9-scr-dry-socket-post-operative",
    label: "Case 9 — Dry socket",
    stationType: "SCR"
  },
  {
    id: "case10-scr-white-lesion",
    label: "Case 10 — White lesion (erosive lichen planus)",
    stationType: "SCR"
  },
  {
    id: "case11-scr-tmpds-attrition",
    label: "Case 11 — TMPDS & attrition",
    stationType: "SCR"
  },
  {
    id: "case12-scr-childhood-caries",
    label: "Case 12 — Early childhood caries",
    stationType: "SCR"
  },
  {
    id: "case13-scr-ras-irreversible-pulpitis",
    label: "Case 13 — RAS & irreversible pulpitis",
    stationType: "SCR"
  },
  {
    id: "case14-osmf-loose-denture",
    label: "Case 14 — OSMF & loose denture",
    stationType: "SCR"
  },
  {
    id: "case15-scr-necrotising-gum-condition",
    label: "Case 15 — Necrotising gum condition",
    stationType: "SCR"
  },
  {
    id: "case16-scr-downs-syndrome",
    label: "Case 16 — Down syndrome",
    stationType: "SCR"
  },
  {
    id: "case17-scr-median-rhomboidal-glossitis",
    label: "Case 17 — Median rhomboid glossitis",
    stationType: "SCR"
  },
  {
    id: "case18-scr-discoloured-teeth",
    label: "Case 18 — Discoloured teeth",
    stationType: "SCR"
  },
  {
    id: "case20-scr-suspicious-ulcer-benign-swelling",
    label: "Case 20 — Suspicious ulcer & benign swelling",
    stationType: "SCR"
  },
  {
    id: "case21-scr-perimplantmplantitis",
    label: "Case 21 — Peri-implantitis",
    stationType: "SCR"
  },
  {
    id: "case22-scr-thumb-sucking",
    label: "Case 22 — Thumb sucking",
    stationType: "SCR"
  },
  {
    id: "case23-scr-child-abuse",
    label: "Case 23 — Suspected non-accidental injury",
    stationType: "SCR"
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