import json
import os
import time
import re
import urllib.request
import urllib.parse
import boto3

s3 = boto3.client(
    "s3",
    region_name=os.environ.get("REGION", "eu-west-2")
)

BUCKET_NAME = os.environ["BUCKET_NAME"]
URL_EXPIRY_SECONDS = int(os.environ.get("URL_EXPIRY_SECONDS", "300"))

# Recording formats accepted end-to-end (Amazon Transcribe supports all
# three for batch jobs). Each extension maps to the Content-Type applied
# to the presigned PUT URL if the browser doesn't supply its own. Adding
# a new format later means updating exactly this dict — everywhere else
# in the file derives from it, so nothing else needs to change.
ALLOWED_EXTENSIONS = {
    "mp4": "video/mp4",
    "ogg": "audio/ogg",
    "wav": "audio/wav"
}

# reCAPTCHA v3 server-side verification. RECAPTCHA_SECRET_KEY is the
# SECRET key from https://www.google.com/recaptcha/admin (never the
# site key — that one is public and safe in frontend code; the secret
# key must only ever live server-side, as an env var here).
# Leave unset to disable CAPTCHA enforcement entirely (e.g. while the
# frontend doesn't have RECAPTCHA_SITE_KEY configured either).
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY", "")
RECAPTCHA_MIN_SCORE  = float(os.environ.get("RECAPTCHA_MIN_SCORE", "0.5"))
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}


def sanitize_filename_part(text):
    """Keeps a filename-safe subset of characters, for embedding into an S3 key."""
    text = re.sub(r"[^a-zA-Z0-9_-]", "-", text)
    return text.strip("-") or "student"


def verify_captcha(token):
    """
    Verifies a reCAPTCHA v3 token against Google's siteverify endpoint.
    This MUST happen server-side — checking the token in the browser
    proves nothing, since a bot calling this API directly can simply
    omit the token or send a fake one. Only Google's own verification
    (using our secret key, which never reaches the browser) is trustworthy.

    Returns (ok: bool, reason: str).
    """
    if not RECAPTCHA_SECRET_KEY:
        # CAPTCHA not configured for this deployment — treat as disabled
        # rather than blocking every submission.
        return True, "captcha disabled"

    if not token:
        return False, "missing captcha token"

    try:
        data = urllib.parse.urlencode({
            "secret": RECAPTCHA_SECRET_KEY,
            "response": token
        }).encode("utf-8")

        req = urllib.request.Request(RECAPTCHA_VERIFY_URL, data=data, method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        print(f"reCAPTCHA verify result: {result}")

        if not result.get("success"):
            return False, f"verification failed: {result.get('error-codes')}"

        score = result.get("score", 0)
        if score < RECAPTCHA_MIN_SCORE:
            return False, f"score too low ({score} < {RECAPTCHA_MIN_SCORE})"

        return True, f"ok (score {score})"

    except Exception as ex:
        print(f"ERROR verifying captcha: {ex}")
        # Fail closed: if we can't verify, don't issue an upload URL.
        return False, f"verification error: {ex}"


def response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body_dict)
    }


def lambda_handler(event, context):

    print("EVENT =", json.dumps(event))

    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return response(200, {})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"error": "Request body must be valid JSON"})

    case_id       = body.get("caseId")
    email         = body.get("email")
    file_name     = body.get("fileName")
    content_type  = body.get("contentType")
    report_type   = body.get("reportType", "detailed")
    captcha_token = body.get("captchaToken")

    if not case_id:
        return response(400, {"error": "caseId is required"})
    if not email or "@" not in email:
        return response(400, {"error": "A valid email is required"})
    if not file_name:
        return response(400, {"error": "fileName is required"})

    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if extension not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(f".{e}" for e in ALLOWED_EXTENSIONS)
        return response(400, {"error": f"Unsupported file type. Allowed formats: {allowed_list}"})

    # Trust the browser's detected content-type if it sent one; otherwise
    # fall back to the standard type for this extension.
    if not content_type:
        content_type = ALLOWED_EXTENSIONS[extension]

    if report_type not in ("detailed", "basic"):
        report_type = "detailed"

    captcha_ok, captcha_reason = verify_captcha(captcha_token)
    print(f"Captcha check: ok={captcha_ok} reason={captcha_reason}")
    if not captcha_ok:
        return response(403, {"error": "Verification failed. Please try again."})

    #
    # Build a unique, filename-safe student identifier so repeated
    # uploads by the same student (or same original filename) don't
    # collide with each other or with someone else's file.
    #
    original_stem = file_name.rsplit(".", 1)[0]
    student_name = f"{sanitize_filename_part(original_stem)}-{int(time.time())}"

    object_key   = f"student-uploads/{case_id}/{student_name}.{extension}"
    metadata_key = f"student-uploads/{case_id}/{student_name}.metadata.json"

    print(f"Generating presigned URL for {object_key}")

    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": object_key,
                "ContentType": content_type
            },
            ExpiresIn=URL_EXPIRY_SECONDS
        )
    except Exception as ex:
        print(f"ERROR generating presigned URL: {ex}")
        return response(500, {"error": "Could not generate an upload URL"})

    #
    # Write the metadata sidecar immediately (small, cheap, synchronous).
    # The Assessment Lambda reads this back once the transcript is ready,
    # so the student's email/report-type choice survives the async
    # Transcribe hop without needing to be threaded through EventBridge.
    #
    metadata = {
        "emailId": email,
        "reportType": report_type,
        "originalFileName": file_name,
        "recordingExtension": extension
    }

    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=metadata_key,
            Body=json.dumps(metadata).encode("utf-8"),
            ContentType="application/json"
        )
        print(f"Wrote metadata sidecar to {metadata_key}")
    except Exception as ex:
        # Don't fail the whole request over this — worst case, the
        # Assessment Lambda falls back to DEFAULT_NOTIFY_EMAIL /
        # DEFAULT_REPORT_TYPE, which is a safe degraded outcome rather
        # than blocking the student's upload entirely.
        print(f"WARNING: could not write metadata sidecar: {ex}")

    return response(200, {
        "uploadUrl": upload_url,
        "objectKey": object_key
    })
    