# Architecture — Current Implementation

This document describes the **as-built** architecture of the Dental AI Tutor assessment pipeline, as deployed in the `planore-ai-tutor` AWS account. It supplements the main [README](https://github.com/pratap-rajan/dental-ai-tutor/blob/main/README.md).

**This is a living document.** The pipeline has gone through three distinct stages since the project started — manual Step Functions invocation → fully automated EventBridge chaining → a live React portal in front of it — and this file reflects the current, third stage. Earlier revisions of this document (Step Functions as the trigger, no portal, transcription treated as an external manual step) are now historical and should not be relied on.

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
- [React Portal](#react-portal)
- [Report Generation](#report-generation)
- [Email Delivery](#email-delivery)
- [IAM Permissions](#iam-permissions)
- [Adding a New Case](#adding-a-new-case)
- [Deployment Notes](#deployment-notes)
- [Reliability Notes — EventBridge & DLQs](#reliability-notes--eventbridge--dlqs)
- [Deployment Gotchas — Amplify & CORS](#deployment-gotchas--amplify--cors)
- [Scaling Path — RAG / Knowledge Bases](#scaling-path--rag--knowledge-bases)
- [Content Freshness — Planned, Not Yet Built](#content-freshness--planned-not-yet-built)

---

## Evolution Summary

| Area | Original (Step Functions era) | **Current implementation** |
|---|---|---|
| Trigger | AWS Step Functions, manual event payload | **Two EventBridge rules**, fully automatic — S3 upload triggers the whole chain with zero manual invocation |
| Transcription | Manual/external — transcript assumed to already exist | **Automated** — `assessment-transcribe` Lambda starts the Transcribe job the moment an mp4 lands in S3 |
| Assessment trigger | Step Functions invokes the Lambda directly | **EventBridge Rule 2**, fired when the transcript JSON is written |
| Student intake | None — files uploaded manually to S3 via console/CLI | **Live React portal** on AWS Amplify — case dropdown, email, report type, drag-and-drop upload |
| Email/report-type per student | Passed explicitly in the Step Functions event | **Metadata sidecar** written by the presigned-URL Lambda at upload time, read back by the Assessment Lambda once the transcript is ready |
| Email service | Amazon SES | Amazon SES (unchanged) |
| Prompt | Per-case `prompt-template.txt` in S3 | Per-case `prompt-template.txt` in S3 (unchanged), now includes an explicit deduplication rule in every case |
| Failure visibility | None | **SQS dead-letter queue** on Rule 1's target, capturing failed EventBridge→Lambda invocations |
| Cases live | 1 (case1) | **3** (case1-amalgam-highspot, case2-amalgam-toxicity-filling, case3-avulsed-tooth) |

The pipeline no longer requires any manual step at all, from the moment a student submits the form to the moment their report email arrives.

---

## Component Overview

| Service | Role in this implementation |
|---|---|
| **AWS Amplify** | Hosts the React portal — build/deploy on push to `main`, using a monorepo build spec since the app lives at `app/dental-ai-portal/`, not the repo root |
| **Amazon API Gateway** (HTTP API, `orebuddy`) | Fronts the presigned-URL Lambda — single route, `POST /upload-url` |
| **AWS Lambda — `presigned-upload-url`** | Generates a scoped S3 PUT URL for the browser and writes the per-student metadata sidecar (email, report type) |
| **AWS Lambda — `assessment-transcribe`** | Starts an Amazon Transcribe job when an mp4 lands under `student-uploads/`. Name is historical — it only handles transcription, not assessment |
| **Amazon Transcribe** | Speech-to-text |
| **AWS Lambda — `dental-ai-assessment`** | Loads case assets + the student transcript + the metadata sidecar from S3, builds the prompt, calls Bedrock, generates the HTML report, uploads it, sends the email |
| **Amazon Bedrock (Claude)** | Scores the student transcript against the case's marking matrix and reference answer |
| **Amazon EventBridge** | Two rules chain the pipeline stages together — see [Trigger Flow](#trigger-flow) |
| **Amazon S3** | Stores case assets, student uploads, metadata sidecars, transcripts, and generated reports |
| **Amazon SQS** | Dead-letter queue on Rule 1's target, capturing failed invocations for debugging |
| **Amazon SES** | Sends the HTML report as an email attachment |
| **Amazon CloudWatch** | Logs for all three Lambdas; EventBridge `Invocations`/`FailedInvocations` metrics per rule |

---

## Trigger Flow

The entire pipeline is now event-driven, with two EventBridge rules chaining every stage automatically. There is no Step Functions state machine in the current build — it was replaced entirely by EventBridge once the pipeline was proven reliable enough to run unattended.

### Stage 1 — Student submits via the portal

1. Student fills in the form (case, email, report type, mp4) and clicks submit
2. Browser calls `POST /upload-url` on the API Gateway endpoint
3. `presigned-upload-url` Lambda:
   - Builds a unique, collision-safe key: `student-uploads/{caseId}/{sanitizedName}-{timestamp}.mp4`
   - Returns a presigned S3 PUT URL
   - Synchronously writes `student-uploads/{caseId}/{sanitizedName}-{timestamp}.metadata.json` containing `{"emailId": "...", "reportType": "..."}`
4. Browser PUTs the mp4 directly to S3 using the presigned URL — the file never passes through a Lambda

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

### Stage 3 — Rule 2: transcript ready → assessment

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

Fires when Transcribe writes the transcript JSON. Invokes `dental-ai-assessment`, which derives `caseId` and the student name from the key, reads the matching metadata sidecar, scores the transcript via Bedrock, generates the report, and emails it.

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
│   ├── janedoe-1784980001.mp4
│   └── janedoe-1784980001.metadata.json   ← { emailId, reportType } — written at upload time
│
transcripts/
├── case1-amalgam-highspot/
│   └── janedoe-1784980001.json     ← Amazon Transcribe output format
│
reports/
├── case1-amalgam-highspot/
│   └── janedoe-1784980001-report.html
```

Every case folder under `cases/` is self-contained. The Assessment Lambda never hardcodes anything case-specific — it only knows the fixed filenames it expects inside `cases/{caseId}/`.

**Filename convention that matters:** the prompt file must always be named exactly `prompt-template.txt`, never a case-prefixed variant like `case2-prompt-template.txt` — the Lambda constructs the path purely from `caseId`, so a mismatched filename fails with `NoSuchKey`.

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

**Every current prompt template includes two standard blocks, added after the first two cases surfaced real problems:**

1. **A deduplication rule** — an explicit ownership model assigning each type of observation (criterion feedback, areas for improvement, confidence/delivery notes, final summary) to exactly one section, with a worked example demonstrating it. Added after students reported the same feedback point appearing three times across a single report.
2. **A patient/caller identification exclusion** — instructs the model never to assess, flag, or mention name/gender mismatches, and to refer to the candidate only as "the Student."

---

## Transcribe Trigger Lambda

`assessment-transcribe` (name is historical — contains only transcription-start logic):

1. Reads the real S3 key from the triggering event — supports both direct S3 Event Notification (`Records[0].s3.object.key`) and EventBridge-wrapped (`detail.object.key`) shapes
2. Falls back to scanning `INPUT_PREFIX` for the first `.mp4` **only** when no real event is present (manual console test invocations) — explicitly not relied on for production traffic, since it can't distinguish between concurrent uploads for different students
3. Validates the key has the expected `student-uploads/{caseId}/{student}.mp4` shape before indexing into it, to avoid an unhandled `IndexError` on a malformed path
4. Starts the Transcribe job (`en-GB`, mp4) with output written to `transcripts/{caseId}/{studentName}.json`

**Environment variables:** `INPUT_BUCKET`, `OUTPUT_BUCKET`, `INPUT_PREFIX` (`student-uploads`), `OUTPUT_PREFIX` (`transcripts`), `REGION`.

---

## Assessment Lambda

`dental-ai-assessment`:

1. Calls `resolve_input(event)`, which determines `caseId`, `student_json_key`, `emailId`, and `reportType` from whichever event shape it received (manual payload vs. automated S3/EventBridge event)
2. For automated invocations, reads the metadata sidecar at `student-uploads/{caseId}/{studentName}.metadata.json`; falls back to `DEFAULT_NOTIFY_EMAIL` / `DEFAULT_REPORT_TYPE` env vars if the sidecar doesn't exist (e.g. a manually-uploaded file with no portal submission behind it)
3. Reads the four case files from `cases/{caseId}/` — tries the image first, falls back to text
4. Reads the student transcript from `student_json_key`
5. Fills the prompt template with the marking matrix, reference answer, student answer, and case study text
6. Calls `bedrock-runtime.invoke_model` — with the case image if one exists, text-only otherwise
7. Strips markdown fences from the response and parses it as JSON
8. Renders the assessment JSON into a styled HTML report, honoring `reportType`:
   - `detailed` — full report, including the criteria breakdown table and confidence/delivery section
   - `basic` — score, grade, strengths, areas for improvement, and final summary only
9. Uploads the report to `reports/{caseId}/{studentFile}-report.html`
10. Sends the HTML report as an email attachment via SES to the resolved `emailId`
11. Returns a structured success/failure response (`statusCode` 200 or 500)

**Environment variables:** `BUCKET_NAME`, `MODEL_ID`, `REGION`, `SES_SENDER`, `DEFAULT_NOTIFY_EMAIL`, `DEFAULT_REPORT_TYPE`.

---

## Presigned-URL Lambda

`presigned-upload-url` — the newest component, built specifically to connect the React portal to the existing pipeline without changing it:

1. Validates `caseId`, `email`, `fileName` (must end `.mp4`), `reportType` (defaults to `detailed` if missing/invalid)
2. Builds a collision-safe key from a sanitized version of the original filename plus a timestamp suffix
3. Generates a presigned S3 PUT URL (5-minute default expiry)
4. Writes the metadata sidecar **synchronously**, before returning — guaranteed to exist before the browser even starts uploading
5. Handles CORS preflight (`OPTIONS`) explicitly in code, in addition to API Gateway's own CORS configuration
6. Returns `{uploadUrl, objectKey}` to the browser

If the metadata write fails for any reason, the request still succeeds — the Assessment Lambda's `DEFAULT_` fallback absorbs that failure gracefully rather than blocking the student's submission.

**Environment variables:** `BUCKET_NAME`, `REGION`. **IAM:** `s3:PutObject` scoped to `student-uploads/*`.

---

## React Portal

Built with Vite + React, deployed on AWS Amplify, source at `app/dental-ai-portal/` in the same repo as the Lambdas.

**Pages/sections:**
- Sticky header — logo + "PLAN ORE ACADEMY" wordmark
- Hero — headline, feature pills, animated scorecard preview
- Features and "How it works" sections
- Upload form — case dropdown (`CASE_CATALOG` in `src/config.js`), email field, detailed/basic toggle, drag-and-drop mp4 upload with progress bar
- Confirmation screen — staged progress indicator, confirms the email/report type the student will receive

**Theme** extracted directly from the Plan Ore logo PNG (`#293039` navy, `#00c2cb` teal, `#c3edef` mint) rather than approximated by eye.

**Case catalog** is currently a static array in `config.js` — adding a case to the portal means editing that file and redeploying, separate from adding the case's S3 assets. A future improvement (not yet built) would fetch this from a `cases/case-catalog.json` file in S3 instead, so the portal picks up new cases without a redeploy.

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

**EventBridge rule execution roles (both rules):**
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

---

## Deployment Notes

- **Lambda environment variables:**
  - `dental-ai-assessment`: `BUCKET_NAME`, `MODEL_ID`, `REGION`, `SES_SENDER`, `DEFAULT_NOTIFY_EMAIL`, `DEFAULT_REPORT_TYPE`
  - `assessment-transcribe`: `INPUT_BUCKET`, `OUTPUT_BUCKET`, `INPUT_PREFIX`, `OUTPUT_PREFIX`, `REGION`
  - `presigned-upload-url`: `BUCKET_NAME`, `REGION`
- The Bedrock model ID must be enabled for the account/region in **Bedrock → Model access**
- SES sender identity must be verified before any email will send, regardless of sandbox/production status
- **Amazon EventBridge notifications must be explicitly enabled on the S3 bucket** (S3 → Properties → Amazon EventBridge → On) — without this, neither rule ever fires, with no error surfaced anywhere

---

## Reliability Notes — EventBridge & DLQs

During development, a confirmed instance occurred where EventBridge Rule 2 reported a successful `Invocations` metric with **zero corresponding Lambda log stream** — permissions, target ARN, event pattern, concurrency limits, and deploy timing were all individually verified clean, and CloudTrail did not capture the invoke attempt at all. The issue self-resolved on retry.

Given this, an SQS dead-letter queue is attached to Rule 1's target (`eventbridge-transcribe-dlq`), capturing the original event payload if EventBridge's invoke attempt to the Lambda fails. **The same DLQ pattern should be added to Rule 2** if it hasn't been already — this is the reliable way to capture the actual failure detail if this pattern recurs, since neither CloudWatch metrics nor CloudTrail proved sufficient on their own during the original investigation.

---

## Deployment Gotchas — Amplify & CORS

Worth documenting since each of these cost real debugging time and will likely resurface for anyone extending this project:

1. **Amplify monorepo detection is all-or-nothing.** Once the React app isn't at the repo root (it's nested at `app/dental-ai-portal/`), Amplify requires the wrapped `applications:` YAML format with an explicit `appRoot` — a flat single-app spec fails immediately with `Monorepo spec provided without "applications" key`, even if the flat spec is otherwise perfectly valid.

2. **`npm ci` requires a committed `package-lock.json`.** Unlike `npm install`, it will not generate one on the fly — run `npm install` locally once and commit the resulting lockfile.

3. **A missing `.gitignore` for `node_modules` breaks pushes, not just bloats them.** A large enough uncommitted `node_modules` tree pushed to GitHub can hit `HTTP 400` / unexpected-disconnect errors well before any documented repository size limit.

4. **Stale Amplify build configuration can outlive an apparently-correct fix.** In one case, both the console's build settings and the repo's `amplify.yml` showed the correct monorepo spec, yet the build kept failing with the exact original error. Deleting and recreating the Amplify app (the GitHub repo itself is untouched by this) cleared it — worth trying before extensive further debugging if a build spec fix doesn't take effect after a genuine push.

5. **CORS must be configured in two separate places for a presigned-URL upload flow, not one.** API Gateway's own CORS settings only cover the `POST /upload-url` call. The actual file upload is a **direct browser-to-S3** `PUT` request using the presigned URL, which requires its **own, separate CORS policy configured directly on the S3 bucket** (Permissions → CORS). Missing either one produces a CORS error only in the browser — not in `curl` or CLI testing, since CORS enforcement is a browser-only mechanism.

6. **CLI/curl success does not prove a browser flow works.** Every gotcha above except #1–#4 is invisible to `curl` or the AWS CLI. Real end-to-end validation requires an actual browser submission through the live portal, not just API-level verification.

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

---

## Content Freshness — Planned, Not Yet Built

Regulatory guidance referenced in case content (e.g. WHO/FDA/BDA figures used in the amalgam-related cases) can go stale over 2-3 years. This is explicitly **a content-maintenance problem, not a model or retrieval-architecture problem** — no model upgrade or RAG implementation fixes staleness on its own, since Claude only knows what's written into each case's `reference-knowledge.json` and `prompt-template.txt`.

Planned direction, to be built out before Phase 2's paid launch:

1. A `metadata.json` per case with `content_last_reviewed` / `sources` / `review_due` dates, so staleness is visible rather than invisible
2. An annual full review cadence of factual claims across all cases, plus event-triggered spot fixes when a specific guideline change is heard about
3. Prompt wording that rewards evidence-based reasoning and correct citation of authoritative bodies generally, not just exact hardcoded figures, so scoring is less brittle to a single number changing
4. A single shared `cases/_shared/current-regulatory-guidance.txt` file referenced by all case prompts via a shared placeholder, so a regulatory update only needs editing in one place rather than across every case's prompt template
5. Optionally, a periodic (e.g. monthly) "regulatory freshness check" Lambda on an EventBridge Scheduler that searches for updates to key claims and emails a human-readable discrepancy report — explicitly not auto-applying changes; human review stays required given the stakes of exam grading