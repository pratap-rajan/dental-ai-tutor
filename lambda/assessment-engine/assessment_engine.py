import json
import os
import base64
import boto3

s3 = boto3.client("s3")

bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.environ.get("REGION", "eu-west-2")
)

BUCKET_NAME = os.environ["BUCKET_NAME"]
MODEL_ID = os.environ["MODEL_ID"]


def read_s3_text(bucket, key):
    """Reads a plain text file from an S3 bucket and decodes it."""
    response = s3.get_object(Bucket=bucket, Key=key)
    return response["Body"].read().decode("utf-8")


def read_s3_image_base64(bucket, key):
    """Reads an image from S3 and returns its base64 encoded string."""
    response = s3.get_object(Bucket=bucket, Key=key)
    image_bytes = response["Body"].read()
    return base64.b64encode(image_bytes).decode("utf-8")

def extract_transcript(transcribe_json_text):
    """Extracts the raw transcript text from an Amazon Transcribe JSON structure."""
    data = json.loads(transcribe_json_text)
    return data["results"]["transcripts"][0]["transcript"]


def clean_json_response(text):
    """Cleans up the LLM response by stripping out markdown code blocks."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def write_s3_html(bucket, key, html_content):
    """Writes a styled HTML document directly to an S3 object with the correct content type."""
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=html_content.encode("utf-8"),
        ContentType="text/html"
    )


def generate_html_report(assessment, report_key):
    """Constructs a responsive, print-ready HTML layout populated with assessment data."""
    table_rows = ""
    for criterion in assessment.get("criteria", []):
        table_rows += f"""
        <div class="crit-row">
            <div class="crit-cell crit-cell-name">{criterion.get('name', 'N/A')}</div>
            <div class="crit-cell crit-cell-score">{criterion.get('score', 0)} / {criterion.get('max_score', 0)}</div>
            <div class="crit-cell crit-cell-feedback">{criterion.get('feedback', '')}</div>
        </div>
        """

    strengths_list = "".join([f'<li class="strength-item">{s}</li>' for s in assessment.get("strengths", [])])
    
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

def build_prompt(marking_matrix, reference_answer, student_answer):
    """Constructs the prompt for the Claude model, tuned to provide encouraging, constructive scoring."""
    return f"""
You are an experienced UK dental examiner assessing a student in an ORE-style examination.
The attached image contains the complete case sheet and clinical imagery.
Use the marking matrix exactly.

Compare the student's performance against:
1. Case sheet image
2. Marking matrix
3. Reference answer
4. Student answer

SCORING PHILOSOPHY (ENCOURAGING & CONSTRUCTIVE):
- Be lenient and encouraging in your scoring. Focus on rewarding what the student did right rather than strictly penalizing minor omissions.
- If the student demonstrates safe clinical judgment and hits the core diagnosis, award them a strong baseline score (e.g., meeting standards).
- Construct your feedback to be supportive: praise their strengths first, and frame omissions as "actionable tips for excellence" rather than failures.
- Do not invent criteria.

CRITICAL INSTRUCTION FOR OUTPUT STYLE:
You must structure your JSON evaluation to match the exhaustive granularity, deep actionable feedback style, and precision found in the target sample reference block below. Ensure specific quotes or clinical omissions are isolated cleanly.

--- BEGIN TARGET SAMPLE FORMAT REFERENCE ---
{{
  "overall_score": 72,
  "overall_grade": "MEETS STANDARD",
  "criteria": [
    {{
      "name": "Deriving patient information",
      "score": 3,
      "max_score": 4,
      "feedback": "Student confirmed name and DOB, asked about pain onset, radiation, aggravating factors (biting/chewing), swelling, and pus discharge. However, missed asking about bite height specifically ('do you feel a high bite?'), did not ask about sleep disturbance, and did not ask about medical history until prompted by the asthma mention later. The history was reasonable but not fully systematic per the marking matrix."
    }},
    {{
      "name": "Empathy",
      "score": 3,
      "max_score": 4,
      "feedback": "Student expressed empathy multiple times ('I'm so sorry to hear that') and acknowledged the patient's frustration. However, the empathy felt slightly formulaic and repetitive rather than genuinely tailored. The student did not explicitly validate the patient's annoyance at the previous dentist or reassure them confidently that they would be helped."
    }},
    {{
      "name": "Communication and interaction",
      "score": 3,
      "max_score": 4,
      "feedback": "Student used a drawing/visual aid to explain the high spot, which is commendable. Explanation of the high spot mechanism was clear and patient-friendly. Addressed the colleague's competence question appropriately. However, there was notable filler language ('uh', 'um'), some hesitation, and the student incorrectly identified the patient as 'Mr. John/Jones' (case states Mrs. Mariya, a female patient) — a significant professionalism concern. The student also asked for consent to ask questions, which is slightly unnecessary and disrupts flow."
    }},
    {{
      "name": "Time management: 5 minutes",
      "score": 3,
      "max_score": 4,
      "feedback": "The student covered most key areas within the time frame: history, diagnosis, explanation, treatment, and review. The consultation appeared to be completed within a reasonable timeframe. However, some time was spent on less critical elements (e.g., asking consent to ask questions) which slightly reduced efficiency."
    }},
    {{
      "name": "Clinical management",
      "score": 4,
      "max_score": 4,
      "feedback": "Excellent clinical management: correctly identified high spot diagnosis, explained articulating paper use, grinding down the excess, advised soft diet, prescribed appropriate painkillers (paracetamol given asthma — correctly avoided NSAIDs/aspirin/ibuprofen), and arranged a 2-week review. The asthma-aware prescribing was a standout clinical point not present in the reference answer."
    }}
  ],
  "strengths": [
    "Correct diagnosis of high spot and clear patient-friendly explanation with visual aid",
    "Excellent clinical awareness — correctly avoided NSAIDs due to asthma and prescribed paracetamol instead",
    "Appropriate treatment plan: articulating paper, grinding, soft diet, painkillers, 2-week review",
    "Addressed the patient's concern about the previous dentist's competence appropriately",
    "Explained why shallow cavities predispose to overfilling — directly answering the patient's specific question"
  ],
  "areas_for_improvement": [
    "Critical error: misidentified patient gender and name (called 'Mr. John/Jones' — patient is Mrs. Mariya, a 45-year-old female). This is a significant professionalism and patient safety concern in a real clinical setting",
    "Excessive filler language ('uh', 'um') throughout — reduces professional confidence and clarity",
    "Did not specifically ask about high bite sensation, which is the key diagnostic question for this case",
    "Medical history should be taken earlier in the consultation, not discovered incidentally at the end",
    "Empathy could be more personalised and less repetitive; should more explicitly reassure the patient that the pain will resolve"
  ],
  "confidence_assessment": {{
    "score": 65,
    "feedback": "The student demonstrated moderate confidence in clinical knowledge (correct diagnosis, treatment plan, prescribing awareness) but showed significant uncertainty in communication style. Frequent use of 'uh', 'um', hedging language ('that's might what have happened'), and tentative phrasing ('I think what you have got is...') undermined clinical authority. The misidentification of the patient's name and gender further suggests lack of preparation and situational awareness. The student recovered well when challenged about the colleague's work but overall confidence was inconsistent — strong in clinical content, weak in delivery."
  }},
  "final_feedback": "Mrs. Barkavi demonstrated a solid understanding of the clinical scenario and produced an accurate diagnosis and appropriate management plan, including a commendable asthma-aware prescribing decision. The explanation of the high spot mechanism was clear and well-structured. However, the consultation was significantly undermined by the misidentification of the patient as 'Mr. John' when the case clearly states 'Mrs. Mariya' — this is a fundamental error in patient identification that would be flagged seriously in a real ORE examination. Communication was further weakened by excessive filler language and hesitant phrasing. To reach Above Standard, the student should: (1) always verify patient details against the case sheet, (2) take a complete and systematic history including the specific 'high bite' question early, (3) take medical history before treatment planning, and (4) work on confident, fluent delivery to match the strong clinical knowledge demonstrated."
}}
--- END TARGET SAMPLE FORMAT REFERENCE ---

MARKING MATRIX
{marking_matrix}

REFERENCE ANSWER
{reference_answer}

STUDENT ANSWER
{student_answer}

Return ONLY valid JSON matching the exact schema keys of the reference sample above.
"""

def invoke_claude_with_image(image_base64, prompt):
    """Invokes the Claude model via Bedrock with an image and text prompt."""
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "temperature": 0.1,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    }

    response = bedrock.invoke_model(modelId=MODEL_ID, body=json.dumps(body))
    response_body = json.loads(response["body"].read())
    return response_body["content"][0]["text"]


def lambda_handler(event, context):

    print("EVENT =", json.dumps(event))

    #
    # Expected event:
    #
    # {
    #   "caseId": "case1-amalgam-highspot",
    #   "student_json_key":
    #      "transcripts/case1-amalgam-highspot/student1.json"
    # }
    #

    case_id = event.get(
        "caseId",
        "case1-amalgam-highspot"
    )

    student_json_key = event.get(
        "student_json_key"
    )

    if not student_json_key:
        raise Exception(
            "student_json_key missing from event"
        )

    file_prefix = (
        student_json_key
        .split("/")[-1]
        .replace(".json", "")
    )

    print(
        f"Processing case={case_id} "
        f"student={file_prefix}"
    )

    try:

        #
        # Reference files
        #

        case_image_key = (
            f"cases/{case_id}/case-study.jpeg"
        )

        marking_key = (
            f"cases/{case_id}/"
            f"case-evaluation-matrix-extracted.txt"
        )

        reference_key = (
            f"cases/{case_id}/"
            f"reference-knowledge.json"
        )

        print(
            f"Loading case resources "
            f"for {case_id}"
        )

        #
        # Read S3
        #

        case_image_base64 = read_s3_image_base64(
            BUCKET_NAME,
            case_image_key
        )

        marking_matrix = read_s3_text(
            BUCKET_NAME,
            marking_key
        )

        reference_json = read_s3_text(
            BUCKET_NAME,
            reference_key
        )

        student_json = read_s3_text(
            BUCKET_NAME,
            student_json_key
        )

        #
        # Extract transcripts
        #

        reference_answer = extract_transcript(
            reference_json
        )

        student_answer = extract_transcript(
            student_json
        )

        #
        # Build prompt
        #

        prompt = build_prompt(
            marking_matrix,
            reference_answer,
            student_answer
        )

        #
        # Claude evaluation
        #

        result_text = invoke_claude_with_image(
            case_image_base64,
            prompt
        )

        cleaned_result = clean_json_response(
            result_text
        )

        assessment = json.loads(
            cleaned_result
        )

        #
        # Report location
        #

        report_key = (
            f"reports/{case_id}/"
            f"{file_prefix}-report.html"
        )

        #
        # Generate HTML
        #

        html_report = generate_html_report(
            assessment,
            report_key
        )

        #
        # Upload report
        #

        print(
            f"Uploading report "
            f"to {report_key}"
        )

        write_s3_html(
            BUCKET_NAME,
            report_key,
            html_report
        )

        return {
            "statusCode": 200,
            "body": {
                "message":
                    "Assessment completed",
                "caseId":
                    case_id,
                "student":
                    file_prefix,
                "report_s3_key":
                    report_key
            }
        }

    except Exception as ex:

        print(
            f"ERROR: {str(ex)}"
        )

        return {
            "statusCode": 500,
            "body": {
                "error": str(ex)
            }
        }

