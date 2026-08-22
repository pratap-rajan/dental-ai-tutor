import json
import os
import base64
import urllib.parse
import boto3

s3 = boto3.client("s3")

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.environ.get("REGION", "eu-west-2")
)

bedrock_agent = boto3.client(
    "bedrock-agent-runtime",
    region_name=os.environ.get("REGION", "eu-west-2")
)

ses = boto3.client(
    "ses",
    region_name=os.environ.get("REGION", "eu-west-2")
)

BUCKET_NAME = os.environ["BUCKET_NAME"]
MODEL_ID    = os.environ["MODEL_ID"]
REPORT_SENDER = os.environ.get("SES_SENDER", "academy@planore.co.uk")
DEFAULT_NOTIFY_EMAIL = os.environ.get("DEFAULT_NOTIFY_EMAIL")
DEFAULT_REPORT_TYPE = os.environ.get("DEFAULT_REPORT_TYPE", "detailed")

KNOWLEDGE_BASE_ID = os.environ.get("KNOWLEDGE_BASE_ID", "")
KNOWLEDGE_BASE_MAX_RESULTS = int(os.environ.get("KNOWLEDGE_BASE_MAX_RESULTS", "5"))

# SCR-only timing gate. Hard reject beyond MAX_SCR_RECORDING_SECONDS;
# between SCR_IDEAL_MAX_SECONDS and the hard limit, still scored
# normally but flagged with an advisory note in the report.
MAX_SCR_RECORDING_SECONDS = int(os.environ.get("MAX_SCR_RECORDING_SECONDS", "720"))  # 12 min
SCR_IDEAL_MAX_SECONDS     = int(os.environ.get("SCR_IDEAL_MAX_SECONDS", "600"))       # 10 min


def get_s3_key_from_event(event):
    try:
        records = event.get("Records")
        if records:
            key = records[0]["s3"]["object"]["key"]
            return urllib.parse.unquote_plus(key)
    except (KeyError, IndexError, TypeError):
        pass
    try:
        detail = event.get("detail", {})
        key = detail["object"]["key"]
        return urllib.parse.unquote_plus(key)
    except (KeyError, TypeError):
        pass
    return None


def read_upload_metadata(bucket, case_id, student_name):
    key = f"student-uploads/{case_id}/{student_name}.metadata.json"
    raw = try_read_s3_text(BUCKET_NAME, key)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        print(f"Loaded upload metadata from {key}: {data}")
        return data
    except json.JSONDecodeError:
        print(f"Metadata file at {key} was not valid JSON — ignoring")
        return {}


def resolve_input(event):
    if event.get("student_json_key"):
        report_type = event.get("reportType") or DEFAULT_REPORT_TYPE
        return (
            event.get("caseId", "case1-amalgam-highspot"),
            event["student_json_key"],
            event.get("emailId") or DEFAULT_NOTIFY_EMAIL,
            report_type if report_type in ("detailed", "basic") else "detailed"
        )

    key = get_s3_key_from_event(event)
    if not key:
        raise Exception(
            "Could not determine student_json_key: event has neither "
            "an explicit 'student_json_key' field nor a recognizable "
            "S3/EventBridge object key."
        )

    if not key.lower().endswith(".json"):
        raise Exception(f"Triggering object is not a JSON transcript: {key}")

    parts = key.split("/")
    if len(parts) < 3:
        raise Exception(
            f"Unexpected transcript key shape (expected transcripts/{{caseId}}/{{student}}.json): {key}"
        )

    case_id = parts[1]
    student_name = parts[-1].rsplit(".", 1)[0]

    metadata = read_upload_metadata(BUCKET_NAME, case_id, student_name)

    email_id = metadata.get("emailId") or DEFAULT_NOTIFY_EMAIL

    report_type = metadata.get("reportType") or DEFAULT_REPORT_TYPE
    if report_type not in ("detailed", "basic"):
        report_type = "detailed"

    return (case_id, key, email_id, report_type)


def read_s3_text(bucket, key):
    response = s3.get_object(Bucket=bucket, Key=key)
    return response["Body"].read().decode("utf-8")


def read_s3_image_base64(bucket, key):
    response = s3.get_object(Bucket=bucket, Key=key)
    return base64.b64encode(response["Body"].read()).decode("utf-8")


def try_read_s3_text(bucket, key):
    try:
        return read_s3_text(bucket, key)
    except s3.exceptions.NoSuchKey:
        print(f"No file found at {key} — skipping")
        return None
    except s3.exceptions.ClientError as ex:
        if ex.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            print(f"No file found at {key} — skipping")
            return None
        raise


def try_read_s3_image_base64(bucket, key):
    try:
        return read_s3_image_base64(bucket, key)
    except s3.exceptions.NoSuchKey:
        print(f"No case image found at {key} — proceeding text-only")
        return None
    except s3.exceptions.ClientError as ex:
        if ex.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            print(f"No case image found at {key} — proceeding text-only")
            return None
        raise


def load_case_images(bucket, case_id):
    """
    Loads any number of images under cases/{case_id}/case-study-images/
    (sorted by key — use filenames like 01-..., 02-... for predictable
    ordering), for cases needing text + one-or-more images together
    (e.g. SCR). Falls back to the legacy single cases/{case_id}/case-study.jpeg
    only if that folder is empty, so none of the existing OSCE cases
    need any changes.

    Returns a list of base64 strings (possibly empty).
    """
    images = []
    prefix = f"cases/{case_id}/case-study-images/"
    resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    for obj in sorted(resp.get("Contents", []), key=lambda o: o["Key"]):
        if obj["Key"].endswith("/"):
            continue
        try:
            images.append(read_s3_image_base64(bucket, obj["Key"]))
        except Exception as ex:
            print(f"WARNING: could not read case image {obj['Key']}: {ex}")

    if images:
        print(f"Loaded {len(images)} case image(s) from {prefix}")
        return images

    legacy = try_read_s3_image_base64(bucket, f"cases/{case_id}/case-study.jpeg")
    return [legacy] if legacy else []


def extract_transcript(transcribe_json_text):
    """Extracts the raw transcript from an Amazon Transcribe JSON structure."""
    data = json.loads(transcribe_json_text)
    return data["results"]["transcripts"][0]["transcript"]


def extract_transcript_and_duration(transcribe_json_text):
    """
    Extracts both the transcript text and total spoken duration (in
    seconds) from a raw Amazon Transcribe JSON result. Duration is the
    end_time of the last timed item — Transcribe already returns this
    on every item, it just wasn't being read before. Used for the
    STUDENT's transcript only; the reference answer keeps using
    extract_transcript() since it doesn't need a duration check.
    """
    data = json.loads(transcribe_json_text)
    transcript = data["results"]["transcripts"][0]["transcript"]
    duration = 0.0
    for item in reversed(data["results"].get("items", [])):
        if "end_time" in item:
            duration = float(item["end_time"])
            break
    return transcript, duration


def clean_json_response(text):
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def retrieve_knowledge_base_context(query_text, case_id):
    if not KNOWLEDGE_BASE_ID:
        return ""
    try:
        response = bedrock_agent.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={"text": query_text},
            retrievalConfiguration={
                "vectorSearchConfiguration": {
                    "numberOfResults": KNOWLEDGE_BASE_MAX_RESULTS
                }
            }
        )
        chunks = [
            r["content"]["text"]
            for r in response.get("retrievalResults", [])
            if r.get("content", {}).get("text")
        ]
        if not chunks:
            print(f"Knowledge Base retrieval for case={case_id} returned no results")
            return ""
        print(f"Knowledge Base retrieval for case={case_id} returned {len(chunks)} chunk(s)")
        return "\n\n---\n\n".join(chunks)
    except Exception as ex:
        print(f"WARNING: Knowledge Base retrieval failed, proceeding without it: {ex}")
        return ""


def check_case_relevance(case_study_text, marking_matrix, student_answer, images_base64=None):
    """
    images_base64 is now a LIST (was a single optional image before) —
    pass [] or None for text-only cases.
    """
    check_prompt = f"""You are checking whether a student's spoken exam
answer actually corresponds to a specific clinical case, before any
scoring happens. This is a relevance check ONLY — do not evaluate
quality, do not award marks, do not identify errors or omissions.

CASE STUDY / SCENARIO
{case_study_text if case_study_text else "(see attached image(s))"}

MARKING MATRIX (topics this case is testing)
{marking_matrix}

STUDENT'S SPOKEN ANSWER (transcribed)
{student_answer}

IMPORTANT: if the case study above describes MULTIPLE numbered/lettered
scenario variants (e.g. "Scenario 1" and "Scenario 2"), these are ALL
equally valid, intended versions of this SAME case — a student may be
given any one of them. The student's answer should be marked relevant
if it matches ANY ONE of the listed scenario variants, even if it does
not match all of them, and even if the variants differ significantly in
patient details, presenting complaint, or which specific topics need to
be covered (e.g. one variant may not require LA to be discussed at all
while another requires LA, IV sedation, AND GA — both are still this
same case). Do not mark a transcript as irrelevant merely because it
matches a different variant than another one described in the case
study, or because it covers a different subset of the variants'
combined topics — only mark it irrelevant if it fails to match ANY of
the listed variants.

Question: Does the student's answer describe an attempt to manage THIS
specific clinical scenario (i.e. any one of its variants, if multiple
are listed) — even if done poorly, incompletely, or with significant
clinical errors? A poor or incomplete attempt at the RIGHT scenario (or
any one of its valid variants) should be marked relevant. Only mark it
as NOT relevant if the transcript is clearly about a different clinical
scenario entirely (e.g. a different presenting complaint, a different
type of consultation, or unrelated content) — the kind of mismatch that
would happen if a recording for a different case was uploaded by
mistake.

Return ONLY valid JSON in this exact shape, nothing else:
{{
  "relevant": true or false,
  "reason": "one short sentence explaining the decision"
}}
"""

    result_text = invoke_claude(check_prompt, images_base64=images_base64)
    result = json.loads(clean_json_response(result_text))

    return {
        "relevant": bool(result.get("relevant", True)),
        "reason": result.get("reason", "")
    }


def generate_rejection_report(case_id, reason):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px;
    }}
    .box {{
        max-width: 640px; margin: 0 auto; background: #ffffff;
        border: 1px solid #fecaca; border-left: 4px solid #dc2626;
        border-radius: 8px; padding: 30px;
    }}
    h1 {{ font-size: 18pt; color: #991b1b; margin: 0 0 12px; }}
    p {{ font-size: 11pt; line-height: 1.6; color: #334155; }}
    .reason {{ background: #fef2f2; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 10.5pt; color: #7f1d1d; }}
</style>
</head>
<body>
    <div class="box">
        <h1>Unable to Assess — Case Mismatch Detected</h1>
        <p>
            This recording could not be scored against <strong>{case_id}</strong>.
            The content of the recording does not appear to match the
            clinical scenario for this case.
        </p>
        <div class="reason">{reason}</div>
        <p>
            This usually happens when a recording is uploaded to the
            wrong case. Please check which case this recording was
            actually intended for and re-submit it under the correct
            case selection.
        </p>
        <p>No score has been generated for this attempt.</p>
    </div>
</body>
</html>
"""


def generate_time_limit_rejection_report(case_id, duration_seconds, max_seconds):
    """
    Honest, non-scoring HTML report for when an SCR recording exceeds
    the hard time limit — styled consistently with generate_rejection_report().
    """
    minutes = duration_seconds / 60
    max_minutes = max_seconds / 60
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px;
    }}
    .box {{
        max-width: 640px; margin: 0 auto; background: #ffffff;
        border: 1px solid #fecaca; border-left: 4px solid #dc2626;
        border-radius: 8px; padding: 30px;
    }}
    h1 {{ font-size: 18pt; color: #991b1b; margin: 0 0 12px; }}
    p {{ font-size: 11pt; line-height: 1.6; color: #334155; }}
    .reason {{ background: #fef2f2; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 10.5pt; color: #7f1d1d; }}
</style>
</head>
<body>
    <div class="box">
        <h1>Unable to Assess — Recording Exceeds Time Limit</h1>
        <p>
            This recording could not be scored against <strong>{case_id}</strong>.
            The Structured Clinical Reasoning (SCR) exam format allows a
            maximum of {max_minutes:.0f} minutes per case.
        </p>
        <div class="reason">
            Your recording was {minutes:.1f} minutes long, which exceeds
            the {max_minutes:.0f}-minute limit for this case type.
        </div>
        <p>
            Please re-record your answer within the allowed time and
            re-submit under the same case selection.
        </p>
        <p>No score has been generated for this attempt.</p>
    </div>
</body>
</html>
"""


def build_prompt(prompt_template, marking_matrix, reference_answer, student_answer, case_study="", knowledge_context=""):
    return prompt_template.format(
        marking_matrix=marking_matrix,
        reference_answer=reference_answer,
        student_answer=student_answer,
        case_study=case_study,
        knowledge_context=knowledge_context
    )


def invoke_claude(prompt, images_base64=None):
    """
    images_base64 is now a LIST — pass [] or None for text-only cases,
    one item for a single-image OSCE case, or several for a multi-image
    SCR case. Order in the list is the order sent to the model.
    """
    content = []

    for img in (images_base64 or []):
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": img
            }
        })

    content.append({
        "type": "text",
        "text": prompt
    })

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "temperature": 0.1,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ]
    }
    response = bedrock.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(body)
    )
    response_body = json.loads(response["body"].read())
    return response_body["content"][0]["text"]


def generate_html_report(assessment, report_key, report_type="detailed"):
    """
    UNCHANGED — the existing OSCE per-question report. Still used
    whenever assessment_type is "OSCE" (the default for all 10
    existing cases).
    """
    table_rows = ""
    for criterion in assessment.get("criteria", []):
        table_rows += f"""
        <div class="crit-row">
            <div class="crit-cell crit-cell-name">{criterion.get('name', 'N/A')}</div>
            <div class="crit-cell crit-cell-score">{criterion.get('score', 0)} / {criterion.get('max_score', 0)}</div>
            <div class="crit-cell crit-cell-feedback">{criterion.get('feedback', '')}</div>
        </div>
        """

    strengths_list = "".join(
        [f'<li class="strength-item">{s}</li>' for s in assessment.get("strengths", [])]
    )

    improvements_list = ""
    for imp in assessment.get("areas_for_improvement", []):
        if "critical error" in imp.lower():
            improvements_list += f"""
            <li class="improvement-item">
                <span class="critical-badge">Critical Error</span><br>{imp}
            </li>"""
        else:
            improvements_list += f'<li class="improvement-item">{imp}</li>'

    confidence = assessment.get("confidence_assessment", {})

    is_detailed = report_type == "detailed"

    report_type_badge = " · Basic Summary" if not is_detailed else ""

    criteria_section = f"""
    <h2>Criteria Breakdowns</h2>
    <div class="crit-table">
        <div class="crit-header">
            <div class="crit-cell" style="width: 25%;">Assessment Domain</div>
            <div class="crit-cell" style="width: 12%; text-align: center;">Score</div>
            <div class="crit-cell" style="width: 63%;">Detailed Evaluator Feedback</div>
        </div>
        {table_rows}
    </div>
    """ if is_detailed else ""

    confidence_section = f"""
    <div class="avoid-break">
        <h2>Confidence &amp; Delivery Assessment</h2>
        <div class="feedback-box">
            <div style="font-weight: bold; color: #334155; margin-bottom: 10px;">Confidence Score: <span style="color: #0284c7;">{confidence.get('score', 0)}/100</span></div>
            <p style="margin: 0; color: #475569; font-size: 9.5pt;">{confidence.get('feedback', '')}</p>
        </div>
    </div>
    """ if is_detailed else ""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {{ size: A4; margin: 20mm 15mm 20mm 15mm; background-color: #f8fafc; }}
    * {{ box-sizing: border-box; }}
    body {{
        margin: 0; padding: 0;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1e293b; line-height: 1.5; font-size: 10pt;
        background-color: #f8fafc;
    }}
    .header-container {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 25px; }}
    .header-table {{ display: table; width: 100%; }}
    .header-cell {{ display: table-cell; vertical-align: middle; }}
    .header-right {{ text-align: right; }}
    h1 {{ font-size: 20pt; color: #0f172a; margin: 0 0 5px 0; font-weight: 700; letter-spacing: -0.5px; }}
    .subtitle {{ font-size: 10pt; color: #0284c7; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }}
    .meta-box {{ background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 15px; margin-bottom: 25px; display: table; width: 100%; }}
    .meta-col {{ display: table-cell; width: 25%; }}
    .meta-label {{ font-size: 8pt; color: #64748b; text-transform: uppercase; margin-bottom: 2px; font-weight: 600; }}
    .meta-value {{ font-size: 10pt; font-weight: 600; color: #334155; }}
    .score-container {{ display: table; width: 100%; margin-bottom: 30px; }}
    .score-card {{ display: table-cell; width: 50%; padding-right: 10px; }}
    .score-card:last-child {{ padding-right: 0; padding-left: 10px; }}
    .score-inner {{ background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }}
    .score-num {{ font-size: 28pt; font-weight: 700; color: #0284c7; line-height: 1; margin-bottom: 5px; }}
    .score-lbl {{ font-size: 9pt; color: #64748b; text-transform: uppercase; font-weight: 600; }}
    .grade-text {{ font-size: 14pt; font-weight: 700; color: #16a34a; margin-top: 5px; margin-bottom: 5px; }}
    h2 {{ font-size: 13pt; color: #0f172a; margin: 25px 0 12px 0; padding-bottom: 5px; border-left: 4px solid #0284c7; padding-left: 10px; page-break-after: avoid; }}
    .crit-table {{ display: table; width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 25px; }}
    .crit-row {{ display: table-row; border-bottom: 1px solid #e2e8f0; }}
    .crit-header {{ display: table-row; background-color: #f1f5f9; font-weight: 600; color: #475569; font-size: 9pt; text-transform: uppercase; }}
    .crit-cell {{ display: table-cell; padding: 10px 12px; vertical-align: top; }}
    .crit-cell-name {{ width: 25%; font-weight: 600; color: #334155; }}
    .crit-cell-score {{ width: 12%; text-align: center; font-weight: bold; color: #0f172a; }}
    .crit-cell-feedback {{ width: 63%; color: #475569; font-size: 9.5pt; }}
    .feedback-box {{ background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 20px; }}
    .final-feedback-box {{ background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 6px; padding: 15px; margin-bottom: 20px; color: #14532d; }}
    ul {{ margin: 0; padding-left: 20px; }}
    li {{ margin-bottom: 8px; color: #334155; }}
    .critical-badge {{ background-color: #fee2e2; color: #991b1b; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 8pt; display: inline-block; margin-bottom: 5px; text-transform: uppercase; }}
    .avoid-break {{ page-break-inside: avoid; }}
</style>
</head>
<body>
    <div class="header-container">
        <div class="header-table">
            <div class="header-cell">
                <h1>Candidate Outcome Report</h1>
                <div class="subtitle">UK ORE-Style Examination Assessment</div>
            </div>
            <div class="header-cell header-right">
                <span style="font-size: 9pt; color: #64748b; font-weight: 500;">Status: Evaluated{report_type_badge}</span>
            </div>
        </div>
    </div>

    <div class="meta-box">
        <div class="meta-col">
            <div class="meta-label">Candidate Assessment</div>
            <div class="meta-value">ORE Evaluation</div>
        </div>
        <div class="meta-col">
            <div class="meta-label">File Reference</div>
            <div class="meta-value" style="font-size: 8.5pt;">{report_key.split('/')[-1]}</div>
        </div>
    </div>

    <div class="score-container">
        <div class="score-card">
            <div class="score-inner">
                <div class="score-num">{assessment.get('overall_score', 0)}%</div>
                <div class="score-lbl">Overall Assessment Score</div>
            </div>
        </div>
        <div class="score-card">
            <div class="score-inner">
                <div class="grade-text">{assessment.get('overall_grade', 'N/A')}</div>
                <div class="score-lbl">Performance Grade</div>
            </div>
        </div>
    </div>

    {criteria_section}

    {confidence_section}

    <div class="avoid-break">
        <h2>Key Strengths</h2>
        <div class="feedback-box" style="border-left: 4px solid #16a34a;">
            <ul>{strengths_list}</ul>
        </div>
    </div>

    <div class="avoid-break">
        <h2>Areas for Improvement</h2>
        <div class="feedback-box" style="border-left: 4px solid #dc2626;">
            <ul>{improvements_list}</ul>
        </div>
    </div>

    <div class="avoid-break" style="margin-top: 25px;">
        <div class="final-feedback-box">
            <h2 style="margin-top: 0; color: #14532d; border-left: none; padding-left: 0;">Final Summary &amp; Examiner Feedback</h2>
            <p style="margin: 0; font-size: 9.5pt; text-align: justify;">{assessment.get('final_feedback', '')}</p>
        </div>
    </div>
</body>
</html>
"""


def generate_html_report_scr(assessment, report_key, case_id, timing_advisory=None):
    """
    NEW — SCR report: domain-level results table, case summary table
    (GDC codes + result), per-domain feedback cards, areas for
    improvement, confidence/delivery, and a GDC code glossary table at
    the end (built from assessment["code_glossary"], which Claude
    populates using ONLY the definitions supplied in the marking
    matrix — see prompt-template.txt).
    """
    domains = assessment.get("domains", [])
    case_total = assessment.get("case_total", 0)
    case_max = assessment.get("case_max", 16)
    case_result = assessment.get("case_result", "Did Not Meet Standard")
    result_class = "result-met" if case_result == "Met Standard" else "result-not-met"

    domain_rows = ""
    for d in domains:
        d_result = "Met Standard" if d.get("score", 0) >= 3 else "Did Not Meet Standard"
        d_class = "result-met" if d_result == "Met Standard" else "result-not-met"
        domain_rows += f"""
        <tr>
            <td>{d.get('name', 'N/A')}</td>
            <td class="{d_class}">{d_result}</td>
        </tr>"""

    all_codes = sorted(set(code for d in domains for code in d.get("codes_assessed", [])))
    codes_str = ", ".join(all_codes)

    feedback_cards = ""
    for i, d in enumerate(domains, start=1):
        score = d.get("score", 0)
        score_class = "met" if score >= 3 else "not-met"
        result_label = "Met Standard" if score >= 3 else "Did Not Meet Standard"
        feedback_cards += f"""
    <div class="domain-feedback">
        <div class="domain-feedback-title">{i}. {d.get('name', 'N/A')}</div>
        <div class="domain-feedback-score {score_class}">Score: {score} / 4 — {result_label}</div>
        <p>{d.get('feedback', '')}</p>
    </div>"""

    strengths_list = "".join(f"<li>{s}</li>" for s in assessment.get("strengths", []))
    improvements_list = "".join(f"<li>{i}</li>" for i in assessment.get("areas_for_improvement", []))

    confidence = assessment.get("confidence_assessment", {})

    timing_banner = f"""
    <div class="advisory-banner">
        <strong>Timing note:</strong> {timing_advisory} This is advisory only and did not affect your score.
    </div>""" if timing_advisory else ""

    glossary_rows = ""
    for entry in assessment.get("code_glossary", []):
        glossary_rows += f"""
        <tr>
            <td class="code-cell">{entry.get('code', '')}</td>
            <td>{entry.get('meaning', '')}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {{ size: A4; margin: 20mm 15mm 20mm 15mm; background-color: #f8fafc; }}
    * {{ box-sizing: border-box; }}
    body {{
        margin: 0; padding: 0;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1e293b; line-height: 1.5; font-size: 10pt;
        background-color: #f8fafc;
    }}
    .page {{ max-width: 780px; margin: 0 auto; padding: 30px 20px; }}
    .header-container {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }}
    .header-table {{ display: table; width: 100%; }}
    .header-cell {{ display: table-cell; vertical-align: middle; }}
    h1 {{ font-size: 20pt; color: #0f172a; margin: 0 0 5px 0; font-weight: 700; letter-spacing: -0.5px; }}
    .subtitle {{ font-size: 10pt; color: #0284c7; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }}
    .meta-box {{ background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 15px; margin-bottom: 20px; display: table; width: 100%; }}
    .meta-col {{ display: table-cell; width: 25%; }}
    .meta-label {{ font-size: 8pt; color: #64748b; text-transform: uppercase; margin-bottom: 2px; font-weight: 600; }}
    .meta-value {{ font-size: 10pt; font-weight: 600; color: #334155; }}
    .advisory-banner {{ background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 9.5pt; color: #78350f; }}
    .advisory-banner strong {{ color: #92400e; }}
    h2 {{ font-size: 13pt; color: #0f172a; margin: 24px 0 10px; font-weight: 700; }}
    .domain-table, .case-table, .glossary-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }}
    .domain-table th, .case-table th, .glossary-table th {{ background-color: #f1f5f9; text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; padding: 10px 14px; font-weight: 700; }}
    .domain-table td, .case-table td, .glossary-table td {{ padding: 10px 14px; font-size: 9.5pt; border-top: 1px solid #e2e8f0; vertical-align: top; }}
    .glossary-table td {{ font-size: 9pt; color: #334155; }}
    .code-cell {{ font-weight: 700; color: #0f172a; white-space: nowrap; }}
    .result-met {{ color: #15803d; font-weight: 700; }}
    .result-not-met {{ color: #b91c1c; font-weight: 700; }}
    .case-total-row td {{ background-color: #f8fafc; font-weight: 700; }}
    .domain-feedback {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 18px; margin-bottom: 14px; }}
    .domain-feedback-title {{ font-weight: 700; font-size: 10.5pt; color: #0f172a; margin-bottom: 4px; }}
    .domain-feedback-score {{ font-size: 9pt; font-weight: 700; margin-bottom: 8px; }}
    .domain-feedback-score.met {{ color: #0284c7; }}
    .domain-feedback-score.not-met {{ color: #b91c1c; }}
    .domain-feedback p {{ margin: 0; font-size: 9.5pt; color: #334155; }}
    .feedback-box {{ background: #f8fafc; border-radius: 6px; padding: 12px 16px; }}
    ul {{ margin: 0; padding-left: 18px; }}
    li {{ font-size: 9.5pt; color: #334155; margin-bottom: 6px; }}
    .confidence-box {{ background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 10px; }}
</style>
</head>
<body>
<div class="page">

    <div class="header-container">
        <div class="header-table">
            <div class="header-cell">
                <h1>Structured Clinical Reasoning Report</h1>
                <p class="subtitle">Plan Ore Academy &middot; ORE Buddy</p>
            </div>
        </div>
    </div>

    <div class="meta-box">
        <div class="meta-col">
            <div class="meta-label">Case</div>
            <div class="meta-value">{case_id}</div>
        </div>
        <div class="meta-col">
            <div class="meta-label">Format</div>
            <div class="meta-value">SCR</div>
        </div>
        <div class="meta-col">
            <div class="meta-label">Case Score</div>
            <div class="meta-value">{case_total} / {case_max}</div>
        </div>
        <div class="meta-col">
            <div class="meta-label">Case Result</div>
            <div class="meta-value {result_class}">{case_result}</div>
        </div>
    </div>

    {timing_banner}

    <h2>Domain Results</h2>
    <table class="domain-table">
        <tr><th style="width:70%;">Domain</th><th style="width:30%;">Result</th></tr>
        {domain_rows}
    </table>

    <h2>Case Summary</h2>
    <table class="case-table">
        <tr>
            <th style="width:12%;">Case</th>
            <th style="width:63%;">GDC Safe Practitioner Framework Learning Outcomes Assessed</th>
            <th style="width:25%;">Result</th>
        </tr>
        <tr>
            <td>1</td>
            <td>{codes_str}</td>
            <td class="{result_class}">{case_result}</td>
        </tr>
        <tr class="case-total-row">
            <td colspan="2">Case Total</td>
            <td>{case_total} / {case_max}</td>
        </tr>
    </table>

    <h2>Domain Feedback</h2>
    {feedback_cards}

    <h2>Areas for Improvement</h2>
    <div class="feedback-box"><ul>{improvements_list}</ul></div>

    <h2>Confidence &amp; Delivery</h2>
    <div class="confidence-box">
        <div style="font-weight: bold; color: #334155; margin-bottom: 10px;">Confidence Score: <span style="color: #0284c7;">{confidence.get('score', 0)}/100</span></div>
        <p style="margin: 0; color: #475569; font-size: 9.5pt;">{confidence.get('feedback', '')}</p>
    </div>

    <h2>GDC Code Glossary</h2>
    <table class="glossary-table">
        <tr><th style="width:15%;">Code</th><th style="width:85%;">Meaning</th></tr>
        {glossary_rows}
    </table>

</div>
</body>
</html>
"""


def write_s3_html(bucket, key, html_content):
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=html_content.encode("utf-8"),
        ContentType="text/html"
    )


def send_report_email(case_id, file_prefix, html_content, recipient):
    import email.mime.multipart
    import email.mime.text
    import email.mime.base
    import email.encoders

    msg = email.mime.multipart.MIMEMultipart("mixed")
    msg["Subject"] = case_id
    msg["From"]    = REPORT_SENDER
    msg["To"]      = recipient

    body = email.mime.text.MIMEText(
        f"Please find attached the assessment report for {file_prefix}.",
        "plain"
    )
    msg.attach(body)

    attachment = email.mime.base.MIMEBase("text", "html")
    attachment.set_payload(html_content.encode("utf-8"))
    email.encoders.encode_base64(attachment)
    attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"{file_prefix}-report.html"
    )
    msg.attach(attachment)

    ses.send_raw_email(
        Source=REPORT_SENDER,
        Destinations=[recipient],
        RawMessage={"Data": msg.as_string()}
    )

    print(f"Report email sent to {recipient} for {file_prefix}")


def lambda_handler(event, context):

    print("EVENT =", json.dumps(event))

    case_id, student_json_key, email_id, report_type = resolve_input(event)

    if not student_json_key:
        raise Exception("student_json_key missing from event")

    if not email_id:
        raise Exception(
            "No emailId available — set the DEFAULT_NOTIFY_EMAIL "
            "environment variable for automated (non-manual) invocations."
        )

    file_prefix = (
        student_json_key
        .split("/")[-1]
        .replace(".json", "")
    )

    print(f"Processing case={case_id} student={file_prefix}")

    try:

        # Assessment type — NEW. Defaults to OSCE if the file is absent,
        # so all 10 existing cases need no changes.
        assessment_type_key = f"cases/{case_id}/assessment-type.txt"
        assessment_type = (try_read_s3_text(BUCKET_NAME, assessment_type_key) or "OSCE").strip().upper()
        print(f"Assessment type: {assessment_type}")

        #
        # S3 keys — all case-specific files live under cases/{caseId}/
        #
        case_study_key = f"cases/{case_id}/case-study.txt"
        marking_key    = f"cases/{case_id}/case-evaluation-matrix-extracted.txt"
        reference_key  = f"cases/{case_id}/reference-knowledge.json"
        prompt_key     = f"cases/{case_id}/prompt-template.txt"

        print(f"Loading case resources for {case_id}")

        # Case study — text and images are now loaded independently and
        # unconditionally (not either/or). load_case_images() falls
        # back to the legacy single case-study.jpeg internally, so this
        # is fully backward compatible with every existing OSCE case.
        case_study_text = try_read_s3_text(BUCKET_NAME, case_study_key) or ""
        case_images = load_case_images(BUCKET_NAME, case_id)

        if case_study_text:
            print(f"Loaded case study text from {case_study_key}")
        if case_images:
            print(f"Loaded {len(case_images)} case image(s)")
        if not case_study_text and not case_images:
            print(f"No case-study.txt, case-study.jpeg, or case-study-images/ found for {case_id} — proceeding without case study context")

        print(f"Reading marking matrix: {marking_key}")
        marking_matrix = read_s3_text(BUCKET_NAME, marking_key)
        print("✓ marking matrix loaded")

        print(f"Reading reference knowledge: {reference_key}")
        reference_json = read_s3_text(BUCKET_NAME, reference_key)
        print("✓ reference knowledge loaded")

        print(f"Reading student transcript: {student_json_key}")
        student_json = read_s3_text(BUCKET_NAME, student_json_key)
        print("✓ student transcript loaded")

        print(f"Reading prompt template: {prompt_key}")
        prompt_template = read_s3_text(BUCKET_NAME, prompt_key)
        print("✓ prompt template loaded")

        reference_answer = extract_transcript(reference_json)
        student_answer, duration_seconds = extract_transcript_and_duration(student_json)
        print(f"Student recording duration: {duration_seconds:.0f}s")

        # HARD reject only beyond MAX_SCR_RECORDING_SECONDS, SCR only
        if assessment_type == "SCR" and duration_seconds > MAX_SCR_RECORDING_SECONDS:
            print(f"REJECTED — duration {duration_seconds:.0f}s exceeds SCR hard limit of {MAX_SCR_RECORDING_SECONDS}s")

            report_key = f"reports/{case_id}/{file_prefix}-report.html"
            html_report = generate_time_limit_rejection_report(case_id, duration_seconds, MAX_SCR_RECORDING_SECONDS)

            write_s3_html(BUCKET_NAME, report_key, html_report)
            send_report_email(case_id, file_prefix, html_report, email_id)

            return {
                "statusCode": 200,
                "body": {
                    "message": "Rejected — recording exceeds SCR time limit",
                    "caseId": case_id,
                    "student": file_prefix,
                    "report_s3_key": report_key,
                    "email_sent_to": email_id,
                    "durationSeconds": duration_seconds
                }
            }

        # 10-12 min: scored normally, but flagged — not a rejection
        timing_advisory = None
        if assessment_type == "SCR" and duration_seconds > SCR_IDEAL_MAX_SECONDS:
            timing_advisory = (
                f"This recording was {duration_seconds / 60:.1f} minutes long. "
                f"The SCR exam format expects each case to be answered in "
                f"approximately 10 minutes — aim to bring your response "
                f"closer to this target."
            )
            print(f"NOTE: duration {duration_seconds:.0f}s exceeds ideal {SCR_IDEAL_MAX_SECONDS}s — flagging in report, not rejecting")

        #
        # Relevance gate
        #
        print("Running case-relevance check...")
        relevance = check_case_relevance(
            case_study_text,
            marking_matrix,
            student_answer,
            images_base64=case_images
        )
        print(f"Relevance check result: {relevance}")

        if not relevance["relevant"]:
            print(f"REJECTED — case mismatch detected: {relevance['reason']}")

            report_key = f"reports/{case_id}/{file_prefix}-report.html"
            html_report = generate_rejection_report(case_id, relevance["reason"])

            write_s3_html(BUCKET_NAME, report_key, html_report)
            send_report_email(case_id, file_prefix, html_report, email_id)

            return {
                "statusCode": 200,
                "body": {
                    "message":       "Rejected — case mismatch",
                    "caseId":        case_id,
                    "student":       file_prefix,
                    "report_s3_key": report_key,
                    "email_sent_to": email_id,
                    "rejectionReason": relevance["reason"]
                }
            }

        knowledge_context = retrieve_knowledge_base_context(
            query_text=student_answer,
            case_id=case_id
        )

        prompt = build_prompt(
            prompt_template,
            marking_matrix,
            reference_answer,
            student_answer,
            case_study=case_study_text,
            knowledge_context=knowledge_context
        )

        result_text = invoke_claude(prompt, images_base64=case_images)

        assessment = json.loads(clean_json_response(result_text))

        report_key = f"reports/{case_id}/{file_prefix}-report.html"

        if assessment_type == "SCR":
            html_report = generate_html_report_scr(
                assessment,
                report_key,
                case_id,
                timing_advisory=timing_advisory
            )
        else:
            html_report = generate_html_report(assessment, report_key, report_type=report_type)

        print(f"Uploading report to {report_key}")
        write_s3_html(BUCKET_NAME, report_key, html_report)

        send_report_email(case_id, file_prefix, html_report, email_id)

        return {
            "statusCode": 200,
            "body": {
                "message":       "Assessment completed",
                "caseId":        case_id,
                "student":       file_prefix,
                "report_s3_key": report_key,
                "email_sent_to": email_id,
                "reportType":    report_type,
                "assessmentType": assessment_type,
                "durationSeconds": duration_seconds
            }
        }

    except Exception as ex:

        print(f"ERROR: {str(ex)}")

        return {
            "statusCode": 500,
            "body": {
                "error": str(ex)
            }
        }