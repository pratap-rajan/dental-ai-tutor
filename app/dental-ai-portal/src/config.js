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
  { id: "SCR", label: "SCR", enabled: true },
  { id: "AVATAR", label: "AI Avatar", enabled: true }
];

// Case catalog for the AI Avatar practice tab (admin-only). Kept
// separate from CASE_CATALOG above since this isn't wired into the
// OSCE/SCR/DTP recording pipeline. No persona/face picker — each
// case's PAL uses its own default face.
export const AVATAR_CASE_CATALOG = [
  { id: "case3-avulsed-tooth", label: "Case 3 — Avulsed tooth (telephone triage)" }
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
    id: "case21-fractured-anterior-tooth",
    label: "Case 21 — Fractured anterior tooth",
    stationType: "OSCE"
  },
  {
    id: "case22-needlestick-injury",
    label: "Case 22 — Needlestick injury",
    stationType: "OSCE"
  },
  {
    id: "case23-drunken-nurse",
    label: "Case 23 — Nurse under the influence at work",
    stationType: "OSCE"
  },
  {
    id: "case24-nurse-doing-scale",
    label: "Case 24 — Nurse performing scaling",
    stationType: "OSCE"
  },
  {
    id: "case25-nursing-bottle-caries",
    label: "Case 25 — Nursing bottle caries",
    stationType: "OSCE"
  },
  {
    id: "case26-oralhygiene-instructions",
    label: "Case 26 — Oral hygiene instructions",
    stationType: "OSCE"
  },
  {
    id: "case27-oral-submucous-fibrosis",
    label: "Case 27 — Oral submucous fibrosis",
    stationType: "OSCE"
  },
  {
    id: "case28-periapical-abscess",
    label: "Case 28 — Periapical abscess",
    stationType: "OSCE"
  },
  {
    id: "case29-periodontitis",
    label: "Case 29 — Periodontitis: breaking bad news",
    stationType: "OSCE"
  },
  {
    id: "case30-pit-and-fissure",
    label: "Case 30 — Pit and fissure sealants",
    stationType: "OSCE"
  },
  {
    id: "case31-pos-ops-instruction",
    label: "Case 31 — Post-operative extraction instructions",
    stationType: "OSCE"
  },
  {
    id: "case32-recurrent-ulcers",
    label: "Case 32 — Recurrent aphthous ulcers",
    stationType: "OSCE"
  },
  {
    id: "case33-repeat-radiograph",
    label: "Case 33 — Repeat radiograph",
    stationType: "OSCE"
  },
  {
    id: "case34-smoking-cessation",
    label: "Case 34 — Smoking cessation",
    stationType: "OSCE"
  },
  {
    id: "case35-smoking-implant",
    label: "Case 35 — Smoking and implant treatment",
    stationType: "OSCE"
  },
  {
    id: "case36-tooth-wear",
    label: "Case 36 — Tooth wear",
    stationType: "OSCE"
  },
  {
    id: "case37-extraction-warfarin",
    label: "Case 37 — Extraction in a patient taking warfarin",
    stationType: "OSCE"
  },
  {
    id: "case38-broken-file",
    label: "Case 38 — Broken endodontic file",
    stationType: "OSCE"
  },
  {
    id: "case39-discolouration",
    label: "Case 39 — Tooth discolouration",
    stationType: "OSCE"
  },
  {
    id: "case40-white-patch",
    label: "Case 40 — White patch (lichenoid reaction)",
    stationType: "OSCE"
  },
  {
    id: "case41-consent-third-molar",
    label: "Case 41 — Consent for lower third molar extraction",
    stationType: "OSCE"
  },
  {
    id: "case42-child-anxiety-control",
    label: "Case 42 — Child anxiety control",
    stationType: "OSCE"
  },
  {
    id: "case43-lost-biopsy",
    label: "Case 43 — Lost biopsy report",
    stationType: "OSCE"
  },
  {
    id: "case44-radiotheerapy-three-weeks",
    label: "Case 44 — Pre-radiotherapy dental assessment",
    stationType: "OSCE"
  },
  {
    id: "case45-trigeminal-neuralgia",
    label: "Case 45 — Trigeminal neuralgia",
    stationType: "OSCE"
  },
  {
    id: "case46-child-abuse-neglect",
    label: "Case 46 — Suspected child abuse and neglect",
    stationType: "OSCE"
  },
  {
    id: "case47-incapiciated-patient",
    label: "Case 47 — Consent for an incapacitated adult",
    stationType: "OSCE"
  },
  {
    id: "case48-poking-wire",
    label: "Case 48 — Poking orthodontic wire",
    stationType: "OSCE"
  },
  {
    id: "case49-xray-audit",
    label: "Case 49 — X-ray quality audit",
    stationType: "OSCE"
  },
  {
    id: "case50-extraction-wrong-tooth",
    label: "Case 50 — Extraction of wrong tooth",
    stationType: "OSCE"
  },
  {
    id: "case51-intrusion",
    label: "Case 51 — Intrusive luxation of a primary tooth",
    stationType: "OSCE"
  },
  {
    id: "case52-decayed-primary-molar",
    label: "Case 52 — Decayed, non-vital primary molar",
    stationType: "OSCE"
  },
  {
    id: "case53-treatment-anterior-tooth",
    label: "Case 53 — Treatment of missing anterior tooth",
    stationType: "OSCE"
  },
  {
    id: "case54-loose-crown",
    label: "Case 54 — Loose crown",
    stationType: "OSCE"
  },
  {
    id: "case55-dislodged-bridge",
    label: "Case 55 — Dislodged bridge",
    stationType: "OSCE"
  },
  {
    id: "case56-bridge-retainer",
    label: "Case 56 — Bridge retainer with periapical pathology",
    stationType: "OSCE"
  },
  {
    id: "case57-confidentiality",
    label: "Case 57 — Confidentiality breach",
    stationType: "OSCE"
  },
  {
    id: "case58-extraoral-sinus",
    label: "Case 58 — Extraoral sinus",
    stationType: "OSCE"
  },
  {
    id: "case59-mucocele",
    label: "Case 59 — Mucocele",
    stationType: "OSCE"
  },
  {
    id: "case60-fibroma",
    label: "Case 60 — Fibroma",
    stationType: "OSCE"
  },
  {
    id: "case61-restoration-options",
    label: "Case 61 — Restoration options for reversible pulpitis",
    stationType: "OSCE"
  },
  {
    id: "case62-blood-thinner",
    label: "Case 62 — Extraction on rivaroxaban (blood thinner)",
    stationType: "OSCE"
  },
  {
    id: "case63-compliant-policies",
    label: "Case 63 — Complaint policy",
    stationType: "OSCE"
  },
  {
    id: "case64-facial-nerve-paralysis",
    label: "Case 64 — Transient facial nerve paralysis",
    stationType: "OSCE"
  },
  {
    id: "case65-invisalign",
    label: "Case 65 — Invisalign",
    stationType: "OSCE"
  },
  {
    id: "case66-learning-disability",
    label: "Case 66 — Consent and capacity: learning disability",
    stationType: "OSCE"
  },
  {
    id: "case67-hypoplastic-molar",
    label: "Case 67 — Hypoplastic molar: balancing and compensating extraction",
    stationType: "OSCE"
  },
  {
    id: "case68-ohi",
    label: "Case 68 — Oral hygiene instructions for fixed appliances",
    stationType: "OSCE"
  },
  {
    id: "case69-thumb-sucking",
    label: "Case 69 — Thumb sucking: open bite and incompetent lips",
    stationType: "OSCE"
  },
  {
    id: "case70-temp-crown",
    label: "Case 70 — Temporary crown aftercare",
    stationType: "OSCE"
  },
  {
    id: "case71-polic-enquiries",
    label: "Case 71 — Police enquiries",
    stationType: "OSCE"
  },
  {
    id: "case72-infective-endocarditis",
    label: "Case 72 — Infective endocarditis and antibiotic prophylaxis",
    stationType: "OSCE"
  },
  {
    id: "case73-antibiotic-audit",
    label: "Case 73 — Antibiotic prescribing audit",
    stationType: "OSCE"
  },
  {
    id: "case74-concussion-of-tooth",
    label: "Case 74 — Concussion of the tooth",
    stationType: "OSCE"
  },
  {
    id: "case75-scope-of-practice",
    label: "Case 75 — Scope of practice: referral to dental therapist",
    stationType: "OSCE"
  },
  {
    id: "case76-root-fracture",
    label: "Case 76 — Root fracture",
    stationType: "OSCE"
  },
  {
    id: "case77-icp",
    label: "Case 77 — Infection control policy",
    stationType: "OSCE"
  },
  {
    id: "case78-leison-on-lip",
    label: "Case 78 — Lesion on the lip",
    stationType: "OSCE"
  },
  {
    id: "case79-periapical-leison",
    label: "Case 79 — Describing periapical lesions",
    stationType: "OSCE"
  },
  {
    id: "case80-broken-retainer",
    label: "Case 80 — Broken retainer",
    stationType: "OSCE"
  },
  {
    id: "case81-broken-denture",
    label: "Case 81 — Broken denture",
    stationType: "OSCE"
  },
  {
    id: "case82-fractured-cusp",
    label: "Case 82 — Fractured cusp",
    stationType: "OSCE"
  },
  {
    id: "case83-postop-sensitivity-filling",
    label: "Case 83 — Sensitivity post composite filling",
    stationType: "OSCE"
  },
  {
    id: "case84-postop-sensitivity-bleaching",
    label: "Case 84 — Post-operative sensitivity from bleaching",
    stationType: "OSCE"
  },
  {
    id: "case85-methotrexate",
    label: "Case 85 — Patient on methotrexate",
    stationType: "OSCE"
  },
  {
    id: "case86-tongue-piercing",
    label: "Case 86 — Tongue piercing",
    stationType: "OSCE"
  },
  {
    id: "case87-papilloma-on-roof",
    label: "Case 87 — Papilloma on roof of the mouth",
    stationType: "OSCE"
  },
  {
    id: "case88-necro-ulcer-gingivitis",
    label: "Case 88 — Necrotising ulcerative gingivitis",
    stationType: "OSCE"
  },
  {
    id: "case89-perforation-rct",
    label: "Case 89 — Perforation during RCT",
    stationType: "OSCE"
  },
  {
    id: "case90-bitewing",
    label: "Case 90 — Necessity of taking a bitewing",
    stationType: "OSCE"
  },
  {
    id: "case91-facial-swelling",
    label: "Case 91 — Mandibular facial swelling",
    stationType: "OSCE"
  },
  {
    id: "case92-appraisal",
    label: "Case 92 — Appraisal",
    stationType: "OSCE"
  },
  {
    id: "case93-antibiotic-stewardship",
    label: "Case 93 — Antibiotic stewardship",
    stationType: "OSCE"
  },
  {
    id: "case94-worried-hiv",
    label: "Case 94 — Patient worried about HIV",
    stationType: "OSCE"
  },
  {
    id: "case95-medicolegal",
    label: "Case 95 — Medicolegal concerns and duty of candour (nerve injury)",
    stationType: "OSCE"
  },
  {
    id: "case96-denture-care",
    label: "Case 96 — Denture care advice for a care worker",
    stationType: "OSCE"
  },
  {
    id: "case97-ozempic",
    label: "Case 97 — “Ozempic teeth”: GLP-1 medication and oral health",
    stationType: "OSCE"
  },
  {
    id: "case98-poor-hygiene",
    label: "Case 98 — Orthodontic referral with poor oral hygiene",
    stationType: "OSCE"
  },
  {
    id: "case99-professional-boundary",
    label: "Case 99 — Colleague who crossed a professional boundary",
    stationType: "OSCE"
  },
  {
    id: "case100-steroids-patient",
    label: "Case 100 — Extraction in a patient taking steroids",
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
  },
  {
    id: "case24-scr-complaint",
    label: "Case 24 — Complaint",
    stationType: "SCR"
  },
  {
    id: "case25-scr-molar-incisor-hypomineralisation",
    label: "Case 25 — Molar incisor hypomineralisation",
    stationType: "SCR"
  },
  {
    id: "case26-scr-dental-extraction-rivaroxaban",
    label: "Case 26 — Extraction on rivaroxaban",
    stationType: "SCR"
  },
  {
    id: "case39-scr-mih",
    label: "Case 39 — MIH (Jun-Case1)",
    stationType: "SCR"
  },
  {
    id: "case40-scr-implant-ul1-edentulous",
    label: "Case 40 — Implant and UL1 Edentulous Space, Generalised Gingivitis (Jun-Case2)",
    stationType: "SCR"
  },
  {
    id: "case41-scr-radicular-cyst",
    label: "Case 41 — Radicular Cyst (Jun-Case3)",
    stationType: "SCR"
  },
  {
    id: "case42-scr-down-syndrome",
    label: "Case 42 — Down Syndrome, Epilepsy, Learning Disability (Jun-Case4)",
    stationType: "SCR"
  },
  {
    id: "case43-scr-periapical-abscess",
    label: "Case 43 — Periapical Abscess, Generalised Periodontitis (Jun-Case5)",
    stationType: "SCR"
  },
  {
    id: "case44-scr-oscc",
    label: "Case 44 — Suspected Oral Squamous Cell Carcinoma (OSCC) (Jun-Case6)",
    stationType: "SCR"
  },
  {
    id: "case36-scr-colleague-issues",
    label: "Case 36 — Colleague Issues (Jul-Case1)",
    stationType: "SCR"
  },
  {
    id: "case37-scr-carious-molars",
    label: "Case 37 — Carious Molars in 8 Year Old (Jul-Case2)",
    stationType: "SCR"
  },
  {
    id: "case38-scr-kickboxer",
    label: "Case 38 — Kickboxer Trauma Tooth (Jul-Case3)",
    stationType: "SCR"
  },
  {
    id: "case33-scr-sugar-tax",
    label: "Case 33 — Sugar Tax (Jul-Case4)",
    stationType: "SCR"
  },
  {
    id: "case34-scr-mronj",
    label: "Case 34 — MRONJ (Jul-Case5)",
    stationType: "SCR"
  },
  {
    id: "case35-scr-gum-disease",
    label: "Case 35 — Gum Disease (Jul-Case6)",
    stationType: "SCR"
  },
  {
    id: "case27-scr-multiple-dental-caries",
    label: "Case 27 — Multiple dental caries (Jul-Case7)",
    stationType: "SCR"
  },
  {
    id: "case28-scr-ul2-periapical-abscess",
    label: "Case 28 — UL2 periapical abscess (Jul-Case8)",
    stationType: "SCR"
  },
  {
    id: "case29-scr-discoloured-crown",
    label: "Case 29 — Discoloured crown (Jul-Case9)",
    stationType: "SCR"
  },
  {
    id: "case30-scr-dental-radiograph-audit",
    label: "Case 30 — Dental radiograph audit (Jul-Case10)",
    stationType: "SCR"
  },
  {
    id: "case31-scr-adult-dental-trauma",
    label: "Case 31 — Adult dental trauma, 31–41 (Jul-Case11)",
    stationType: "SCR"
  },
  {
    id: "case32-scr-child-with-mih",
    label: "Case 32 — Child with MIH and posterior caries (Jul-Case12)",
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