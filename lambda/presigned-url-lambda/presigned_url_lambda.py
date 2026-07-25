import json
import os
import time
import re
import boto3

s3 = boto3.client(
    "s3",
    region_name=os.environ.get("REGION", "eu-west-2")
)

BUCKET_NAME = os.environ["BUCKET_NAME"]
URL_EXPIRY_SECONDS = int(os.environ.get("URL_EXPIRY_SECONDS", "300"))

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def sanitize_filename_part(text):
    """Keeps a filename-safe subset of characters, for embedding into an S3 key."""
    text = re.sub(r"[^a-zA-Z0-9_-]", "-", text)
    return text.strip("-") or "student"


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
    content_type  = body.get("contentType", "video/mp4")
    report_type   = body.get("reportType", "detailed")

    if not case_id:
        return response(400, {"error": "caseId is required"})
    if not email or "@" not in email:
        return response(400, {"error": "A valid email is required"})
    if not file_name:
        return response(400, {"error": "fileName is required"})
    if not file_name.lower().endswith(".mp4"):
        return response(400, {"error": "Only .mp4 files are supported"})
    if report_type not in ("detailed", "basic"):
        report_type = "detailed"

    #
    # Build a unique, filename-safe student identifier so repeated
    # uploads by the same student (or same original filename) don't
    # collide with each other or with someone else's file.
    #
    original_stem = file_name.rsplit(".", 1)[0]
    student_name = f"{sanitize_filename_part(original_stem)}-{int(time.time())}"

    object_key   = f"student-uploads/{case_id}/{student_name}.mp4"
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
        "originalFileName": file_name
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

