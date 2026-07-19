import json
import os
import base64
import boto3

s3 = boto3.client("s3")

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.environ.get("REGION", "eu-west-2")
)

ses = boto3.client(
    "ses",
    region_name=os.environ.get("REGION", "eu-west-2")
)

BUCKET_NAME = os.environ["BUCKET_NAME"]
MODEL_ID    = os.environ["MODEL_ID"]
REPORT_SENDER = os.environ.get("SES_SENDER", "academy@planore.co.uk")


def read_s3_text(bucket, key):
    """Reads a plain text file from S3 and decodes it."""
    response = s3.get_object(Bucket=bucket, Key=key)
    return response["Body"].read().decode("utf-8")


def read_s3_image_base64(bucket, key):
    """Reads an image from S3 and returns it as a base64 string."""
    response = s3.get_object(Bucket=bucket, Key=key)
    return base64.b64encode(response["Body"].read()).decode("utf-8")


def try_read_s3_text(bucket, key):
    """
    Attempts to read an optional text file from S3.
    Returns None if the object does not exist. Any other S3 error still raises.
    """
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
    """
    Attempts to read an optional case image from S3.
    Returns None if the object does not exist, so text-only cases work
    without a case-study.jpeg file. Any other S3 error still raises.
    """
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


def extract_transcript(transcribe_json_text):
    """Extracts the raw transcript from an Amazon Transcribe JSON structure."""
    data = json.loads(transcribe_json_text)
    return data["results"]["transcripts"][0]["transcript"]


def clean_json_response(text):
    """Strips markdown code fences from the LLM response."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def build_prompt(prompt_template, marking_matrix, reference_answer, student_answer, case_study=""):
    """
    Fills the prompt template loaded from S3 with the dynamic values.
    The template must contain these placeholders:
        {marking_matrix}
        {reference_answer}
        {student_answer}
    It may optionally contain:
        {case_study}   — filled with case-study.txt content when there is
                          no case-study.jpeg image for this case. If the
                          template doesn't reference {case_study}, this
                          value is simply ignored.
    """
    return prompt_template.format(
        marking_matrix=marking_matrix,
        reference_answer=reference_answer,
        student_answer=student_answer,
        case_study=case_study
    )


def invoke_claude(prompt, image_base64=None):
    """
    Invokes the Claude model via Bedrock with a text prompt, and an
    optional case image. If image_base64 is None, the request is sent
    as text-only — used for cases that have no case-study.jpeg.
    """
    content = []

    if image_base64:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": image_base64
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


def generate_html_report(assessment, report_key):
    """Constructs a responsive, print-ready HTML report from the assessment JSON."""
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
                <span style="font-size: 9pt; color: #64748b; font-weight: 500;">Status: Evaluated</span>
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

    <h2>Criteria Breakdowns</h2>
    <div class="crit-table">
        <div class="crit-header">
            <div class="crit-cell" style="width: 25%;">Assessment Domain</div>
            <div class="crit-cell" style="width: 12%; text-align: center;">Score</div>
            <div class="crit-cell" style="width: 63%;">Detailed Evaluator Feedback</div>
        </div>
        {table_rows}
    </div>

    <div class="avoid-break">
        <h2>Confidence &amp; Delivery Assessment</h2>
        <div class="feedback-box">
            <div style="font-weight: bold; color: #334155; margin-bottom: 10px;">Confidence Score: <span style="color: #0284c7;">{confidence.get('score', 0)}/100</span></div>
            <p style="margin: 0; color: #475569; font-size: 9.5pt;">{confidence.get('feedback', '')}</p>
        </div>
    </div>

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


def write_s3_html(bucket, key, html_content):
    """Writes the HTML report to S3 with the correct content type."""
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=html_content.encode("utf-8"),
        ContentType="text/html"
    )


def send_report_email(case_id, file_prefix, html_content, recipient):
    """Sends the HTML assessment report as an email attachment via AWS SES."""
    import email.mime.multipart
    import email.mime.text
    import email.mime.base
    import email.encoders

    msg = email.mime.multipart.MIMEMultipart("mixed")
    msg["Subject"] = case_id
    msg["From"]    = REPORT_SENDER
    msg["To"]      = recipient

    body = email.mime.text.MIMEText(
        f"Please find attached the ORE assessment report for {file_prefix}.",
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

    #
    # Expected event:
    #
    # {
    #   "caseId":           "case1-amalgam-highspot",
    #   "student_json_key": "transcripts/case1-amalgam-highspot/student1.json",
    #   "emailId":          "academy@planore.co.uk"
    # }
    #

    case_id          = event.get("caseId", "case1-amalgam-highspot")
    student_json_key = event.get("student_json_key")
    email_id         = event.get("emailId")

    if not student_json_key:
        raise Exception("student_json_key missing from event")

    if not email_id:
        raise Exception("emailId missing from event")

    file_prefix = (
        student_json_key
        .split("/")[-1]
        .replace(".json", "")
    )

    print(f"Processing case={case_id} student={file_prefix}")

    try:

        #
        # S3 keys — all case-specific files live under cases/{caseId}/
        #

        case_image_key    = f"cases/{case_id}/case-study.jpeg"
        case_study_key    = f"cases/{case_id}/case-study.txt"
        marking_key       = f"cases/{case_id}/case-evaluation-matrix-extracted.txt"
        reference_key     = f"cases/{case_id}/reference-knowledge.json"
        prompt_key        = f"cases/{case_id}/prompt-template.txt"

        print(f"Loading case resources for {case_id}")

        #
        # Read all S3 inputs
        #
        # Case study can be provided either as an image (case-study.jpeg)
        # or as plain text (case-study.txt). If the image exists, it is
        # sent to Claude as visual context and no text case study is
        # needed. If the image is missing, we fall back to the text file.
        #

        case_image_base64 = try_read_s3_image_base64(BUCKET_NAME, case_image_key)

        case_study_text = ""
        if not case_image_base64:
            case_study_text = try_read_s3_text(BUCKET_NAME, case_study_key) or ""
            if case_study_text:
                print(f"Using text case study from {case_study_key}")
            else:
                print(f"No case-study.jpeg or case-study.txt found for {case_id} — proceeding without case study context")

        print(f"Reading marking matrix: {marking_key}")
        marking_matrix    = read_s3_text(BUCKET_NAME, marking_key)
        print("✓ marking matrix loaded")

        print(f"Reading reference knowledge: {reference_key}")
        reference_json    = read_s3_text(BUCKET_NAME, reference_key)
        print("✓ reference knowledge loaded")

        print(f"Reading student transcript: {student_json_key}")
        student_json      = read_s3_text(BUCKET_NAME, student_json_key)
        print("✓ student transcript loaded")

        print(f"Reading prompt template: {prompt_key}")
        prompt_template   = read_s3_text(BUCKET_NAME, prompt_key)
        print("✓ prompt template loaded")

        #
        # Extract transcripts
        #

        reference_answer = extract_transcript(reference_json)
        student_answer   = extract_transcript(student_json)

        #
        # Build prompt from S3 template
        #

        prompt = build_prompt(
            prompt_template,
            marking_matrix,
            reference_answer,
            student_answer,
            case_study=case_study_text
        )

        #
        # Claude evaluation
        #

        result_text = invoke_claude(
            prompt,
            image_base64=case_image_base64
        )

        assessment = json.loads(
            clean_json_response(result_text)
        )

        #
        # Generate and upload HTML report
        #

        report_key = f"reports/{case_id}/{file_prefix}-report.html"

        html_report = generate_html_report(assessment, report_key)

        print(f"Uploading report to {report_key}")

        write_s3_html(BUCKET_NAME, report_key, html_report)

        #
        # Send email
        #

        send_report_email(case_id, file_prefix, html_report, email_id)

        return {
            "statusCode": 200,
            "body": {
                "message":       "Assessment completed",
                "caseId":        case_id,
                "student":       file_prefix,
                "report_s3_key": report_key,
                "email_sent_to": email_id
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
        