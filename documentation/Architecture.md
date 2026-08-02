# Architecture — Current Implementation

This document describes the **as-built** architecture of the Dental AI Tutor assessment pipeline, as deployed in the `planore-ai-tutor` AWS account. It supplements the main [README](https://github.com/pratap-rajan/dental-ai-tutor/blob/main/README.md).

**This is a living document.** The pipeline has gone through four distinct stages since the project started — manual Step Functions invocation → fully automated EventBridge chaining (2 rules) → a live React portal in front of it → automated recording deletion for Terms & Conditions compliance (3rd EventBridge rule) — and this file reflects the current, fourth stage. Earlier revisions of this document (Step Functions as the trigger, no portal, no recording cleanup) are now historical and should not be relied on.

---

## Table of Contents

- [Evolution Summary](#evolution-summary)
- [Component Overview](#component-overview)
- [Trigger Flow](#trigger-flow)
- [S3 Bucket Structure](#s3-bucket-structure)
- [Case Configuration](#case-configuration)
- [Transcribe Trigger Lambda](#transcribe-trigger-lambda)
- [Assessment Lambda](#assessment-lambda)
- [Presigned-URL Lambda](#presigned-url-lambda)
- [Recording Cleanup Lambda](#recording-cleanup-lambda)
- [React Portal](#react-portal)
- [Bot Protection — CAPTCHA and Crawling](#bot-protection--captcha-and-crawling)
- [Terms & Conditions and Data Handling](#terms--conditions-and-data-handling)
- [Report Generation](#report-generation)
- [Email Delivery](#email-delivery)
- [IAM Permissions](#iam-permissions)
- [Adding a New Case](#adding-a-new-case)
- [Deployment Notes](#deployment-notes)
- [Reliability Notes — EventBridge & DLQs](#reliability-notes--eventbridge--dlqs)
- [Deployment Gotchas — Amplify & CORS](#deployment-gotchas--amplify--cors)
- [Scaling Path — RAG / Knowledge Bases](#scaling-path--rag--knowledge-bases)
- [Content Freshness — Planned, Not Yet Built](#content-freshness--planned-not-yet-built)
- [Cognito Authentication — Planned, Not Yet Built](#cognito-authentication--planned-not-yet-built)

---

## Evolution Summary

| Area | Original (Step Functions era) | **Current implementation** |
|---|---|---|
| Trigger | AWS Step Functions, manual event payload | **Three EventBridge rules**, fully automatic — S3 upload triggers the whole chain with zero manual invocation, including cleanup |
| Transcription | Manual/external — transcript assumed to already exist | **Automated** — `assessment-transcribe` Lambda starts the Transcribe job the moment an mp4 lands in S3 |
| Assessment trigger | Step Functions invokes the Lambda directly | **EventBridge Rule 2**, fired when the transcript JSON is written |
| Recording retention | Recordings kept indefinitely, no cleanup | **EventBridge Rule 3** deletes the original mp4 once Transcribe reports `COMPLETED` — required for T&C compliance |
| Student intake | None — files uploaded manually to S3 via console/CLI | **Live React portal** on AWS Amplify — case dropdown, email, report type, drag-and-drop upload, T&C acceptance, CAPTCHA |
| Email/report-type per student | Passed explicitly in the Step Functions event | **Metadata sidecar** written by the presigned-URL Lambda at upload time, read back by the Assessment Lambda once the transcript is ready |
| Email service | Amazon SES | Amazon SES (unchanged) |
| Prompt | Per-case `prompt-template.txt` in S3 | Per-case `prompt-template.txt` in S3 (unchanged), now includes an explicit deduplication rule and a case-relevance pre-check in every case |
| Bot protection | None | reCAPTCHA v3 on the upload form (server-verified), `robots.txt` + `noindex` meta tag against crawler indexing |
| Failure visibility | None | **SQS dead-letter queue** on Rule 1's target, capturing failed EventBridge→Lambda invocations |
| Cases live | 1 (case1) | **3** (case1-amalgam-highspot, case2-amalgam-toxicity-filling, case3-avulsed-tooth) |

The pipeline no longer requires any manual step at all, from the moment a student submits the form to the moment their report email arrives and their recording is deleted.

---

## Component Overview

| Service | Role in this implementation |
|---|---|
| **AWS Amplify** | Hosts the React portal — build/deploy on push to `main`, using a monorepo build spec since the app lives at `app/dental-ai-portal/`, not the repo root |
| **Amazon API Gateway** (HTTP API, `orebuddy`) | Fronts the presigned-URL Lambda — single route, `POST /upload-url` |
| **AWS Lambda — `presigned-upload-url`** | Generates a scoped S3 PUT URL for the browser, writes the per-student metadata sidecar (email, report type), and verifies the reCAPTCHA v3 token server-side |
| **AWS Lambda — `assessment-transcribe`** | Starts an Amazon Transcribe job when an mp4 lands under `student-uploads/`. Name is historical — it only handles transcription, not assessment |
| **Amazon Transcribe** | Speech-to-text |
| **AWS Lambda — `dental-ai-assessment`** | Loads case assets + the student transcript + the metadata sidecar from S3, runs a case-relevance pre-check, builds the prompt, calls Bedrock, generates the HTML report, uploads it, sends the email |
| **AWS Lambda — `delete-processed-recording`** | Deletes the original mp4 once its Transcribe job reports `COMPLETED` — enforces the platform's data-retention promise |
| **Amazon Bedrock (Claude)** | Scores the student transcript against the case's marking matrix and reference answer; also runs the lightweight relevance-check call |
| **Amazon EventBridge** | Three rules chain the pipeline stages together — see [Trigger Flow](#trigger-flow) |
| **Amazon S3** | Stores case assets, student uploads (transient), metadata sidecars, transcripts, and generated reports |
| **Amazon SQS** | Dead-letter queue on EventBridge rule targets, capturing failed invocations for debugging |
| **Amazon SES** | Sends the HTML report as an email attachment |
| **Google reCAPTCHA v3** | Bot protection on the upload form — free tier, server-verified against Google's `siteverify` endpoint |
| **Amazon CloudWatch** | Logs for all four Lambdas; EventBridge `Invocations`/`FailedInvocations` metrics per rule |

---

## Trigger Flow

The entire pipeline is event-driven, with three EventBridge rules chaining every stage automatically. There is no Step Functions state machine in the current build — it was replaced entirely by EventBridge once the pipeline was proven reliable enough to run unattended.

### Stage 1 — Student submits via the portal

1. Student fills in the form (case, email, report type, mp4), accepts the Terms & Conditions, and clicks submit
2. A reCAPTCHA v3 token is generated invisibly in the browser
3. Browser calls `POST /upload-url` on the API Gateway endpoint, including the token
4. `presigned-upload-url` Lambda:
   - Verifies the reCAPTCHA token server-side against Google's `siteverify` endpoint; rejects with `403` if missing, invalid, or below the minimum score
   - Builds a unique, collision-safe key: `student-uploads/{caseId}/{sanitizedName}-{timestamp}.mp4`
   - Returns a presigned S3 PUT URL
   - Synchronously writes `student-uploads/{caseId}/{sanitizedName}-{timestamp}.metadata.json` containing `{"emailId": "...", "reportType": "..."}`
5. Browser PUTs the mp4 directly to S3 using the presigned URL — the file never passes through a Lambda

### Stage 2 — Rule 1: upload → transcription

**Event pattern:**
```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": { "name": ["planore-ai-tutor"] },
    "object": { "key": [{ "prefix": "student-uploads/" }] }
  }
}
```

Fires on any upload under `student-uploads/`, regardless of case — `caseId` is derived at invocation time from the object key, so no case-specific rule changes are ever needed. Invokes `assessment-transcribe`, which parses the real S3 key from the event, starts a Transcribe job, and writes the result to `transcripts/{caseId}/{studentName}.json`.

A DLQ (`eventbridge-transcribe-dlq`) is attached to this rule's target — see [Reliability Notes](#reliability-notes--eventbridge--dlqs).

### Stage 3 — Rule 3: transcription complete → recording deleted

**Event pattern:**
```json
{
  "source": ["aws.transcribe"],
  "detail-type": ["Transcribe Job State Change"],
  "detail": {
    "TranscriptionJobStatus": ["COMPLETED"]
  }
}
```

Fires when Transcribe itself reports a job as `COMPLETED` — a different event source entirely from Rules 1 and 2 (Transcribe's own job-status events, not an S3 object-creation event). Invokes `delete-processed-recording`, which deletes only the original mp4. See [Recording Cleanup Lambda](#recording-cleanup-lambda) for the full safety design.

This runs independently of, and in parallel with, Rule 2 — recording deletion is not gated on assessment success, since the T&C promise is specifically "deleted once transcription is complete," not "deleted once scoring succeeds."

### Stage 4 — Rule 2: transcript ready → assessment

**Event pattern:**
```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": { "name": ["planore-ai-tutor"] },
    "object": { "key": [{ "wildcard": "transcripts/*.json" }] }
  }
}
```

Fires when Transcribe writes the transcript JSON. Invokes `dental-ai-assessment`, which derives `caseId` and the student name from the key, reads the matching metadata sidecar, runs the case-relevance pre-check, scores the transcript via Bedrock, generates the report, and emails it.

**Manual invocation is still fully supported** for testing or one-off re-runs, bypassing the portal and EventBridge entirely:

```bash
aws lambda invoke \
  --function-name dental-ai-assessment \
  --payload '{"caseId":"case1-amalgam-highspot","student_json_key":"transcripts/case1-amalgam-highspot/student1.json","emailId":"academy@planore.co.uk","reportType":"basic"}' \
  --cli-binary-format raw-in-base64-out \
  response.json
```

The Lambda's `resolve_input()` function distinguishes between this explicit-payload shape and the raw S3/EventBridge event shape automatically — same function handles both invocation styles.

---

## S3 Bucket Structure

```
planore-ai-tutor/

cases/
├── case1-amalgam-highspot/
│   ├── case-study.jpeg
│   ├── case-evaluation-matrix-extracted.txt
│   ├── reference-knowledge.json
│   └── prompt-template.txt
│
├── case2-amalgam-toxicity-filling/
│   ├── case-study.txt              ← text-only case, no image
│   ├── case-evaluation-matrix-extracted.txt
│   ├── reference-knowledge.json
│   └── prompt-template.txt
│
├── case3-avulsed-tooth/
│   ├── case-study.txt
│   ├── case-evaluation-matrix-extracted.txt
│   ├── reference-knowledge.json
│   └── prompt-template.txt
│
└── caseN-.../                      ← same 4-file pattern for every new case

student-uploads/
├── case1-amalgam-highspot/
│   ├── janedoe-1784980001.mp4             ← TRANSIENT — deleted by Rule 3 after transcription completes
│   └── janedoe-1784980001.metadata.json   ← { emailId, reportType } — written at upload time, RETAINED
│
transcripts/
├── case1-amalgam-highspot/
│   └── janedoe-1784980001.json     ← Amazon Transcribe output format, RETAINED
│
reports/
├── case1-amalgam-highspot/
│   └── janedoe-1784980001-report.html   ← RETAINED
```

Every case folder under `cases/` is self-contained. The Assessment Lambda never hardcodes anything case-specific — it only knows the fixed filenames it expects inside `cases/{caseId}/`.

**Filename convention that matters:** the prompt file must always be named exactly `prompt-template.txt`, never a case-prefixed variant like `case2-prompt-template.txt` — the Lambda constructs the path purely from `caseId`, so a mismatched filename fails with `NoSuchKey`.

**Retention pattern:** the mp4 is the only file in this structure that is deliberately transient. The metadata sidecar, transcript, and report all persist — this asymmetry is intentional and matches the platform's stated Terms & Conditions (see [Terms & Conditions and Data Handling](#terms--conditions-and-data-handling)).

---

## Case Configuration

Each case is fully defined by its four files:

| File | Purpose |
|---|---|
| `case-study.jpeg` **or** `case-study.txt` | The clinical scenario. Image tried first; falls back to text automatically if no image exists — some cases (2 and 3) are text-only |
| `case-evaluation-matrix-extracted.txt` | The official marking rubric — criteria, points |
| `reference-knowledge.json` | Amazon Transcribe-format JSON containing the model/reference answer transcript |
| `prompt-template.txt` | The full examiner prompt, with `{marking_matrix}`, `{reference_answer}`, `{student_answer}` placeholders (and optionally `{case_study}` for text-only cases) |

Because the prompt lives in S3 rather than in code, each case can have its own examiner persona, scoring philosophy, sample JSON structure, and criteria — all without touching `lambda_function.py`.

**Every current prompt template includes three standard blocks:**

1. **A deduplication rule** — an explicit ownership model assigning each type of observation (criterion feedback, areas for improvement, confidence/delivery notes, final summary) to exactly one section, with a worked example demonstrating it. Added after students reported the same feedback point appearing three times across a single report.
2. **A patient/caller identification exclusion** — instructs the model never to assess, flag, or mention name/gender mismatches, and to refer to the candidate only as "the Student."
3. **A case-relevance boundary** — enforced separately from the scoring prompt itself; see [Assessment Lambda](#assessment-lambda) below for why this is a distinct pre-check rather than a prompt instruction.

---

## Transcribe Trigger Lambda

`assessment-transcribe` (name is historical — contains only transcription-start logic):

1. Reads the real S3 key from the triggering event — supports both direct S3 Event Notification (`Records[0].s3.object.key`) and EventBridge-wrapped (`detail.object.key`) shapes
2. Falls back to scanning `INPUT_PREFIX` for the first `.mp4` **only** when no real event is present (manual console test invocations) — explicitly not relied on for production traffic, since it can't distinguish between concurrent uploads for different students
3. Validates the key has the expected `student-uploads/{caseId}/{student}.mp4` shape before indexing into it, to avoid an unhandled `IndexError` on a malformed path
4. Starts the Transcribe job (`en-GB`, mp4) with a job name of `{caseId}-{studentName}-{timestamp}`, and output written to `transcripts/{caseId}/{studentName}.json`

**Environment variables:** `INPUT_BUCKET`, `OUTPUT_BUCKET`, `INPUT_PREFIX` (`student-uploads`), `OUTPUT_PREFIX` (`transcripts`), `REGION`.

The job-name format here is what [Recording Cleanup Lambda](#recording-cleanup-lambda) later parses to safely identify which mp4 to delete.

---

## Assessment Lambda

`dental-ai-assessment`:

1. Calls `resolve_input(event)`, which determines `caseId`, `student_json_key`, `emailId`, and `reportType` from whichever event shape it received (manual payload vs. automated S3/EventBridge event)
2. For automated invocations, reads the metadata sidecar at `student-uploads/{caseId}/{studentName}.metadata.json`; falls back to `DEFAULT_NOTIFY_EMAIL` / `DEFAULT_REPORT_TYPE` env vars if the sidecar doesn't exist (e.g. a manually-uploaded file with no portal submission behind it)
3. Reads the four case files from `cases/{caseId}/` — tries the image first, falls back to text
4. Reads the student transcript from `student_json_key`
5. **Runs a case-relevance pre-check** — a separate, narrow Bedrock call asking only "does this transcript describe an attempt at this case's scenario, even a poor one, or is it clearly a different scenario?" If the check fails (e.g. a case3 recording was uploaded under case1 by mistake), the Lambda generates a short rejection report explaining the mismatch, emails it, and returns early — the expensive full-scoring call is never made
6. Fills the prompt template with the marking matrix, reference answer, student answer, and case study text
7. Calls `bedrock-runtime.invoke_model` — with the case image if one exists, text-only otherwise
8. Strips markdown fences from the response and parses it as JSON
9. Renders the assessment JSON into a styled HTML report, honoring `reportType`:
   - `detailed` — full report, including the criteria breakdown table and confidence/delivery section
   - `basic` — score, grade, strengths, areas for improvement, and final summary only
10. Uploads the report to `reports/{caseId}/{studentFile}-report.html`
11. Sends the HTML report as an email attachment via SES to the resolved `emailId`
12. Returns a structured success/failure response (`statusCode` 200 or 500)

**Environment variables:** `BUCKET_NAME`, `MODEL_ID`, `REGION`, `SES_SENDER`, `DEFAULT_NOTIFY_EMAIL`, `DEFAULT_REPORT_TYPE`.

### Why the relevance check is a separate call, not a prompt instruction

The scoring prompt is deliberately lenient — it's instructed to award partial credit and frame gaps as "areas for improvement" rather than failures. A completely mismatched transcript (e.g. case3's tooth-avulsion phone call scored against case1's high-spot marking matrix) was found in practice to still produce a "Meets Standard" result, with the mismatch content simply read as an extremely poor but gradeable attempt. The fix is a dedicated, narrow relevance check with no scoring incentive, run **before** the real scoring call — not a stronger instruction inside the same prompt that already has leniency built in.

---

## Presigned-URL Lambda

`presigned-upload-url` — the component connecting the React portal to the existing pipeline:

1. Validates `caseId`, `email`, `fileName` (must end `.mp4`), `reportType` (defaults to `detailed` if missing/invalid)
2. **Verifies the reCAPTCHA v3 token server-side** against Google's `siteverify` endpoint, using a secret key that only ever lives in this Lambda's environment variables — rejects with `403` if the token is missing, invalid, or scores below the configured minimum. See [Bot Protection](#bot-protection--captcha-and-crawling).
3. Builds a collision-safe key from a sanitized version of the original filename plus a timestamp suffix
4. Generates a presigned S3 PUT URL (5-minute default expiry)
5. Writes the metadata sidecar **synchronously**, before returning — guaranteed to exist before the browser even starts uploading
6. Handles CORS preflight (`OPTIONS`) explicitly in code, in addition to API Gateway's own CORS configuration
7. Returns `{uploadUrl, objectKey}` to the browser

If the metadata write fails for any reason, the request still succeeds — the Assessment Lambda's `DEFAULT_` fallback absorbs that failure gracefully rather than blocking the student's submission. CAPTCHA verification, by contrast, is fail-closed: if Google's endpoint can't be reached at all, no upload URL is issued.

**Environment variables:** `BUCKET_NAME`, `REGION`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_MIN_SCORE` (default `0.5`). **IAM:** `s3:PutObject` scoped to `student-uploads/*`.

---

## Recording Cleanup Lambda

`delete-processed-recording` — the newest component, added specifically to make the platform's Terms & Conditions retention promise actually true rather than aspirational.

1. Triggered only by **Rule 3**, on `TranscriptionJobStatus: COMPLETED` — never on `FAILED` or `IN_PROGRESS`, so a source recording is never deleted before a failed job can be investigated or retried
2. Parses the Transcribe job name (`{caseId}-{studentName}-{timestamp}`) to reconstruct the original mp4's S3 key:
   - Strips the trailing timestamp segment (always a plain integer)
   - Tries progressively shorter prefixes of the remaining hyphen-joined segments as candidate `caseId` values, checking each against real `cases/{candidate}/` folders in S3, since both `caseId` and `studentName` can themselves contain hyphens (e.g. `case2-amalgam-toxicity-filling`) and a naive split would be ambiguous
3. Confirms the target mp4 actually exists (`head_object`) before attempting deletion, so logs clearly distinguish "already gone" from "deleted now"
4. Deletes only the exact reconstructed `student-uploads/{caseId}/{studentName}.mp4` key — never the metadata sidecar, never anything in `transcripts/`
5. Fails safe throughout: if the job name can't be confidently parsed, or the S3 calls error, it logs clearly and exits without raising — a delete failure must never retry-storm or block the rest of the pipeline

**Environment variables:** `BUCKET_NAME`, `REGION`, `INPUT_PREFIX` (`student-uploads`).

**IAM:** `s3:DeleteObject`, `s3:GetObject` scoped to `student-uploads/*`; `s3:ListBucket` scoped via condition to `cases/*` and `student-uploads/*` prefixes only (used by the `case_exists()` check during job-name parsing).

This Lambda runs independently of the Assessment Lambda — deletion happens the moment transcription completes, regardless of whether scoring later succeeds, fails, or is rejected by the relevance check.

---

## React Portal

Built with Vite + React, deployed on AWS Amplify, source at `app/dental-ai-portal/` in the same repo as the Lambdas.

**Pages/sections:**
- Sticky header — logo + "PLAN ORE ACADEMY" wordmark
- Hero — headline ("Practice faster with your own *ORE Buddy* — AI Study Pal"), animated scorecard preview, primary CTA
- "How it works" — three bordered cards (choose case, record response, get feedback), each with its own accent color and a hover backlight effect
- Upload form — case dropdown (`CASE_CATALOG` in `src/config.js`), email field, detailed/basic toggle, drag-and-drop mp4 upload with an animated gradient progress bar, Terms & Conditions acceptance (mandatory checkbox), invisible reCAPTCHA v3
- Confirmation screen — staged progress indicator (uploaded → transcribing → generating feedback) computed from real elapsed time since submission (persisted to `localStorage`, so a page refresh resumes correctly rather than resetting); resubmission is blocked with an explanatory note until the staged timer completes, to discourage rapid repeat uploads

**Note:** the earlier standalone "Features" section (practice under exam conditions / think like the examiner / repeat until it sticks) was removed — its content is now implicitly covered by "How it works," and the section was judged redundant.

**Theme:** originally sampled directly from the Plan Ore logo PNG (`#293039` navy, `#00c2cb` teal, `#c3edef` mint). Since redesigned to a higher-contrast dark palette, colors pixel-sampled from a reference site's screenshots (not code copied, to avoid IP concerns) and extended with a fourth semantic color:

| Color | Hex | Role |
|---|---|---|
| Near-black base | `#04070f` | Page/card background |
| Teal | `#63d1e6` | Info, in-progress states, login screen |
| Purple | `#a28ff3` | Secondary accent, sign-up screen, hover default |
| Mint | `#72d4c4` | Primary CTA, success/"meets standard" |
| Lime | `#d4e157` | Needs-attention / pending states (planned for the "My Reports" dashboard, not yet built) |

Every card in the portal uses a consistent hover-backlight pattern: a `1px` border in the section's accent color, a soft `radial-gradient` glow behind the content, and a matching outer `box-shadow` bloom — applied identically across the "How it works" cards, the upload form card, and the confirmation card.

**Case catalog** is currently a static array in `config.js` — adding a case to the portal means editing that file and redeploying, separate from adding the case's S3 assets. A future improvement (not yet built) would fetch this from a `cases/case-catalog.json` file in S3 instead, so the portal picks up new cases without a redeploy — likely to become necessary before the case count reaches the point where a plain dropdown is unusable (see the case-selector scaling note under Roadmap in the README).

---

## Bot Protection — CAPTCHA and Crawling

Two distinct, unrelated protections, addressing two different problems:

### CAPTCHA — stopping automated form submission

**Google reCAPTCHA v3** (free tier — up to 1M assessments/month; explicitly not the paid Enterprise product) on the upload form:
- The frontend loads Google's script and generates an invisible token just before submit — no visible challenge/puzzle
- The token is sent to `presigned-upload-url` as `captchaToken`
- **The Lambda verifies it server-side** against Google's `siteverify` endpoint, using a secret key that never reaches the browser — this is the part that actually matters, since a client-side-only check does nothing to stop a bot that simply skips calling the token generator and calls the API directly
- Requests with a missing, invalid, or low-scoring (`< RECAPTCHA_MIN_SCORE`, default `0.5`) token are rejected with `403` before any presigned URL is issued

### robots.txt and noindex — stopping search engine indexing

`public/robots.txt` (disallow all) and a `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` tag in `index.html`. This does **not** stop malicious/scraping bots (they ignore `robots.txt` by design) — it only stops well-behaved crawlers (Google, Bing) from indexing the student portal and surfacing it in search results.

### Known limitation, and the planned resolution

CAPTCHA on the upload form is a stopgap. Once [Cognito authentication](#cognito-authentication--planned-not-yet-built) is built (Option B — self-signup with manual admin approval, per the current plan), the primary anti-bot boundary moves to the signup form instead, since an approved, logged-in account is a much stronger signal than a per-request CAPTCHA score. CAPTCHA will very likely be added to the signup form at that point; whether it remains on the upload form afterward is an open question, since a logged-in user scripting their own submissions is a materially smaller and lower-priority risk than an anonymous public form.

---

## Terms & Conditions and Data Handling

A dedicated Terms & Conditions covers recording processing, retention, and third-party data sharing — required given the platform processes personal audio/video recordings. Key points, all of which are enforced by the architecture described above, not just stated in policy:

- **Recordings are transcribed then deleted** — enforced by [Rule 3 / Recording Cleanup Lambda](#recording-cleanup-lambda), not a manual or occasional process
- **Transcripts and reports are retained**, to support the student's assessment history
- **All processing occurs in the UK AWS region** (`eu-west-2`), regardless of where the student is physically located when submitting
- **Processing uses Anthropic's Claude (Sonnet) via Amazon Bedrock**
- **No data is shared with third parties** for their own purposes; AWS and Anthropic process data only as strictly necessary to run the service
- **T&C acceptance is mandatory** on the sign-up/upload flow — presented as an in-page scrollable side panel (not a popup), with an explicit "I agree" action

The T&C is presented to the user in a dedicated panel component in the portal, distinct from the marketing/landing content. As of this document, the full T&C legal text has been drafted but **has not undergone formal legal review** — this is a known gap to close before Stage 2's paid launch, given the increased stakes of a commercial offering.

---

## Report Generation

The HTML report structure is fully generic — it iterates over whatever `criteria`, `strengths`, `areas_for_improvement`, and `confidence_assessment` fields Claude returns, regardless of case. Only the prompt (and therefore Claude's output content) is case-specific.

`reportType` controls which sections render from the same underlying assessment JSON — the model always generates the full assessment either way; the toggle only changes what gets rendered into HTML:

| Section | `detailed` | `basic` |
|---|---|---|
| Score & grade | ✅ | ✅ |
| Criteria breakdown table | ✅ | ❌ |
| Confidence & delivery | ✅ | ❌ |
| Key strengths | ✅ | ✅ |
| Areas for improvement | ✅ | ✅ |
| Final summary | ✅ | ✅ |

A separate, short rejection-report template is used when the case-relevance pre-check fails — score/grade fields are omitted entirely rather than showing a misleading result.

---

## Email Delivery

- **Service:** Amazon SES (`send_raw_email`), MIME multipart with the HTML report as an attachment
- **From:** fixed academy sender (`SES_SENDER` env var)
- **To:** the student's own email from the metadata sidecar, or `DEFAULT_NOTIFY_EMAIL` for manual/sidecar-less runs
- **Subject:** the `caseId`

**Sandbox mode note:** while SES is in sandbox mode, both the sender and every recipient address must be individually verified under **SES → Identities**. This is fine for internal testing but **must** be resolved (request production access) before opening the portal to real students with arbitrary email addresses.

---

## IAM Permissions

**`dental-ai-assessment` execution role:**
- `s3:GetObject`, `s3:PutObject` on the case/transcript/report/metadata prefixes
- `bedrock:InvokeModel`
- `ses:SendRawEmail`

**`assessment-transcribe` execution role:**
- `s3:GetObject`, `s3:PutObject`
- `transcribe:StartTranscriptionJob`, `transcribe:GetTranscriptionJob`

**`presigned-upload-url` execution role:**
- `s3:PutObject` scoped to `student-uploads/*`
- (Outbound HTTPS to Google's `siteverify` endpoint requires no additional IAM permission — standard Lambda internet egress)

**`delete-processed-recording` execution role:**
- `s3:DeleteObject`, `s3:GetObject` scoped to `student-uploads/*`
- `s3:ListBucket` scoped via condition to `cases/*` and `student-uploads/*` prefixes only

**EventBridge rule execution roles (all three rules):**
- `lambda:InvokeFunction` scoped to the specific target Lambda's ARN — granted via `aws lambda add-permission` with `principal=events.amazonaws.com` and a `SourceArn` condition matching the rule

---

## Adding a New Case

No code changes required anywhere in the pipeline. To onboard `caseN`:

1. Create `cases/caseN-<slug>/` in S3
2. Upload `case-evaluation-matrix-extracted.txt` and `reference-knowledge.json`
3. Upload either `case-study.jpeg` or `case-study.txt`
4. Write `prompt-template.txt` — copy an existing case's as a starting point, keeping the deduplication rule and patient-identification exclusion blocks, then adjust the case context, marking breakdown, and sample JSON
5. Add the case to `CASE_CATALOG` in `app/dental-ai-portal/src/config.js` and redeploy the portal (push to `main`)
6. Test with a real portal submission — see [Deployment Gotchas](#deployment-gotchas--amplify--cors) for why a CLI/curl test alone isn't sufficient proof it works end-to-end
7. Confirm the recording cleanup Lambda correctly parses the new case's job names — the `case_exists()` check relies on the case folder already existing in S3, so cases must be created (step 1) before any student uploads against them

---

## Deployment Notes

- **Lambda environment variables:**
  - `dental-ai-assessment`: `BUCKET_NAME`, `MODEL_ID`, `REGION`, `SES_SENDER`, `DEFAULT_NOTIFY_EMAIL`, `DEFAULT_REPORT_TYPE`
  - `assessment-transcribe`: `INPUT_BUCKET`, `OUTPUT_BUCKET`, `INPUT_PREFIX`, `OUTPUT_PREFIX`, `REGION`
  - `presigned-upload-url`: `BUCKET_NAME`, `REGION`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_MIN_SCORE`
  - `delete-processed-recording`: `BUCKET_NAME`, `REGION`, `INPUT_PREFIX`
- The Bedrock model ID must be enabled for the account/region in **Bedrock → Model access** — use the exact inference-profile ID from `aws bedrock list-inference-profiles`, never a marketing/product name (a past incident: `MODEL_ID` was set to an invalid ARN referencing "claude-sonnet-5," which is not a real Bedrock model ID, breaking generation until reverted to the working `claude-sonnet-4-6` profile)
- SES sender identity must be verified before any email will send, regardless of sandbox/production status
- **Amazon EventBridge notifications must be explicitly enabled on the S3 bucket** (S3 → Properties → Amazon EventBridge → On) — without this, none of the three rules ever fire, with no error surfaced anywhere
- A reCAPTCHA v3 site must be registered at google.com/recaptcha/admin (type: v3, not Enterprise) before `RECAPTCHA_SITE_KEY` (frontend) and `RECAPTCHA_SECRET_KEY` (backend) have real values

---

## Reliability Notes — EventBridge & DLQs

During development, a confirmed instance occurred where EventBridge Rule 2 reported a successful `Invocations` metric with **zero corresponding Lambda log stream** — permissions, target ARN, event pattern, concurrency limits, and deploy timing were all individually verified clean, and CloudTrail did not capture the invoke attempt at all. The issue self-resolved on retry.

Given this, an SQS dead-letter queue is attached to Rule 1's target (`eventbridge-transcribe-dlq`), capturing the original event payload if EventBridge's invoke attempt to the Lambda fails. **The same DLQ pattern should be extended to Rules 2 and 3** if not already done — this is the reliable way to capture the actual failure detail if this pattern recurs, since neither CloudWatch metrics nor CloudTrail proved sufficient on their own during the original investigation.

A separate, unrelated Lambda deployment gotcha surfaced during this build: creating an EventBridge rule and target **before** the target Lambda function actually exists fails cleanly at the `add-permission` step (`ResourceNotFoundException: Function not found`) — the rule and target themselves are created successfully, but the permission grant (and therefore any real invocation) cannot succeed until the function is deployed. Always deploy and directly test a new Lambda before wiring any EventBridge rule to it, not after.

---

## Deployment Gotchas — Amplify & CORS

Worth documenting since each of these cost real debugging time and will likely resurface for anyone extending this project:

1. **Amplify monorepo detection is all-or-nothing.** Once the React app isn't at the repo root (it's nested at `app/dental-ai-portal/`), Amplify requires the wrapped `applications:` YAML format with an explicit `appRoot` — a flat single-app spec fails immediately with `Monorepo spec provided without "applications" key`, even if the flat spec is otherwise perfectly valid.

2. **`npm ci` requires a committed `package-lock.json`.** Unlike `npm install`, it will not generate one on the fly — run `npm install` locally once and commit the resulting lockfile.

3. **A missing `.gitignore` for `node_modules` breaks pushes, not just bloats them.** A large enough uncommitted `node_modules` tree pushed to GitHub can hit `HTTP 400` / unexpected-disconnect errors well before any documented repository size limit.

4. **Stale Amplify build configuration can outlive an apparently-correct fix.** In one case, both the console's build settings and the repo's `amplify.yml` showed the correct monorepo spec, yet the build kept failing with the exact original error. Deleting and recreating the Amplify app (the GitHub repo itself is untouched by this) cleared it — worth trying before extensive further debugging if a build spec fix doesn't take effect after a genuine push.

5. **CORS must be configured in two separate places for a presigned-URL upload flow, not one.** API Gateway's own CORS settings only cover the `POST /upload-url` call. The actual file upload is a **direct browser-to-S3** `PUT` request using the presigned URL, which requires its **own, separate CORS policy configured directly on the S3 bucket** (Permissions → CORS). Missing either one produces a CORS error only in the browser — not in `curl` or CLI testing, since CORS enforcement is a browser-only mechanism.

6. **CLI/curl success does not prove a browser flow works.** Every gotcha above except #1–#4 is invisible to `curl` or the AWS CLI. Real end-to-end validation requires an actual browser submission through the live portal, not just API-level verification.

7. **Native `<select>` dropdown styling is inconsistently supported across browsers.** The case dropdown's closed box can be fully dark-themed via normal CSS, but the open popup list ignored that styling in MS Edge/Chromium, rendering plain white/gray regardless. Fixed with `color-scheme: dark` on the select element plus explicit `background`/`color` on each `<option>` — a genuine platform limitation, not a CSS mistake.

---

## Scaling Path — RAG / Knowledge Bases

Still not needed at the current case count (3, scaling toward 300). Each case's context remains small, isolated, and looked up by exact `caseId` — RAG only becomes relevant for genuine cross-case semantic search or an open-ended Q&A assistant, neither of which is planned for the core grading pipeline.

**Planned evolution, if and when it's needed** (unchanged from the original plan):

| Stays on S3 | Moves to a vector store |
|---|---|
| Case images (JPEG) | Chunked reference knowledge transcripts |
| Student transcripts (JSON) | Chunked marking matrices |
| Prompt templates (txt) | Chunked case study scenarios |

**Target services:** Amazon Bedrock Knowledge Bases, Amazon Titan Embeddings v2, OpenSearch Serverless.

**Recommended trigger points:**
- **< 20 cases:** keep the current S3-only approach (current state: 3 cases)
- **20–50 cases:** start indexing reference knowledge and marking matrices into a Knowledge Base alongside S3
- **50+ cases:** migrate reference knowledge retrieval fully to RAG; S3 remains the source of truth for images, transcripts, and prompt templates

**Clarified during discussion:** RAG (as a pattern) and Amazon Bedrock Knowledge Bases (AWS's specific managed implementation of that pattern) retrieve only from documents deliberately ingested into a knowledge store you control — never from the live internet at query time. If official regulatory PDFs (NICE/GDC/BDA) are ever ingested as source documents, standard text-based ingestion handles prose/guidance content well, but does not "see" meaning embedded purely in diagrams or charts within a PDF — those would still need the direct-image-to-Claude pattern already used for case study images, or manual transcription into accompanying text.

---

## Content Freshness — Planned, Not Yet Built

Regulatory guidance referenced in case content (e.g. WHO/FDA/BDA figures used in the amalgam-related cases) can go stale over 2-3 years. This is explicitly **a content-maintenance problem, not a model or retrieval-architecture problem** — no model upgrade or RAG implementation fixes staleness on its own, since Claude only knows what's written into each case's `reference-knowledge.json` and `prompt-template.txt`.

A real-world check against BDA's actual February 2024 amalgam position paper surfaced a genuine discrepancy in case content: the assumption that BDA sets a clinical-safety age threshold of 15 was not confirmed by the source paper, which instead discusses a 15-year threshold in the context of an EU environmental/regulatory phase-down, explicitly stating there is no evidence-based health reason to restrict amalgam use by age. This is exactly the class of issue the freshness process below is designed to catch.

Planned direction, to be built out before Phase 2's paid launch:

1. A `metadata.json` per case with `content_last_reviewed` / `sources` / `review_due` dates, so staleness is visible rather than invisible
2. An annual full review cadence of factual claims across all cases, plus event-triggered spot fixes when a specific guideline change is heard about
3. Prompt wording that rewards evidence-based reasoning and correct citation of authoritative bodies generally, not just exact hardcoded figures, so scoring is less brittle to a single number changing
4. A single shared `cases/_shared/current-regulatory-guidance.txt` file referenced by all case prompts via a shared placeholder, so a regulatory update only needs editing in one place rather than across every case's prompt template
5. Optionally, a periodic (e.g. monthly) "regulatory freshness check" Lambda on an EventBridge Scheduler that searches for updates to key claims and emails a human-readable discrepancy report — explicitly not auto-applying changes; human review stays required given the stakes of exam grading

---

## Cognito Authentication — Planned, Not Yet Built

Currently, "who a student is" exists only as an email address typed into the upload form each time — there is no persistent account, login, or session. This is sufficient for Stage 1 (free, async, single-submission-at-a-time) but is a real limitation for two planned capabilities:

- A "My Reports" dashboard showing a student's full assessment history (not just their most recent submission)
- Any meaningful distinction between "a genuine enrolled student" and "anyone who typed in an email address"

**Decided direction: Cognito Option B** — self-signup remains enabled (rather than admin-only account creation), but every new account is automatically disabled on creation and requires manual admin approval (`AdminEnableUser`) before the student can log in. Chosen over admin-only account creation because there is no pre-existing clean enrolled-student list to bulk-create accounts from.

**Settled requirements, not yet built:**
- Approval messaging: "if your registration details are valid, access is granted within 1-2 business days; if not granted after that, contact your course provider" — deliberately does not expose a raw support email address on the page, to avoid spam-harvesting
- Minimal PII collection: full name, email, and an enrollment ID/cohort identifier — nothing beyond what's needed to verify genuine enrollment (explicitly no DOB, address, or phone number)
- Long-term storage of past reports is planned (low-risk, since it's the student's own performance data), but with a stated retention window rather than indefinite retention by default, and a path for a student to request account/data deletion
- Cognito's own user attributes hold name/email/enrollment-id directly; a separate DynamoDB table would hold only the `studentId → past-reports` mapping
- reCAPTCHA is planned for the sign-up screen specifically, alongside (or eventually instead of) the upload form — see [Bot Protection](#bot-protection--captcha-and-crawling)

Mockups for the sign-up, login, and "My Reports" dashboard screens have been produced (dark theme, consistent with the current portal palette, including the lime accent for pending/needs-attention states), but no Cognito infrastructure or React auth integration has been built yet. This work is intentionally paused until requirements are fully settled, to avoid building against an unstable spec.
