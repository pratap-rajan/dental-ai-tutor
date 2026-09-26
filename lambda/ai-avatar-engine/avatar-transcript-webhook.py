import json
import os
import time

import boto3

# Receives Tavus's application.transcription_ready webhook, looks up
# which case/student this conversation belongs to (written by
# ai-avatar-engine at session-creation time), reformats the transcript
# into the SAME shape dental-ai-assessment already expects, and drops
# it into the SAME S3 paths the OSCE/SCR flow uses - so the existing
# scoring/report/email pipeline picks it up completely unchanged.
#
# IMPORTANT: the exact field names below (emailId, reportType) are
# based on this project's README-documented contract for the metadata
# sidecar, not on having the literal presigned_url_lambda.py /
# assessment_engine.py source open in this session. Verify these two
# field names against the real source before relying on this in
# production - if they differ, this Lambda's sidecar write is the only
# place that needs adjusting.

BUCKET_NAME = os.environ["BUCKET_NAME"]
SESSIONS_TABLE_NAME = os.environ.get("AVATAR_SESSIONS_TABLE", "avatar-sessions")
WEBHOOK_SHARED_SECRET = os.environ.get("WEBHOOK_SHARED_SECRET")

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
sessions_table = dynamodb.Table(SESSIONS_TABLE_NAME)


def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method")
    if method == "OPTIONS":
        return {"statusCode": 204, "body": ""}

    # Basic authenticity check - callback_url was created with
    # ?secret=... appended; reject anything that doesn't match rather
    # than trusting every POST to this public endpoint.
    query_params = event.get("queryStringParameters") or {}
    if WEBHOOK_SHARED_SECRET and query_params.get("secret") != WEBHOOK_SHARED_SECRET:
        return {"statusCode": 403, "body": json.dumps({"error": "Invalid webhook secret"})}

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON body"})}

    event_type = body.get("event_type")

    # Tavus sends several event types to the same callback_url
    # (system.pal_joined, system.shutdown, etc.) - only act on the
    # one that actually carries the transcript, and acknowledge
    # everything else with 200 so Tavus doesn't retry them.
    if event_type != "application.transcription_ready":
        return {"statusCode": 200, "body": json.dumps({"skipped": event_type})}

    conversation_id = body.get("conversation_id")
    if not conversation_id:
        print(f"No conversation_id in transcription_ready payload: {body}")
        return {"statusCode": 200, "body": json.dumps({"error": "No conversation_id"})}

    # Look up which case/student this conversation belongs to - written
    # by ai-avatar-engine when the conversation was first created.
    session_lookup = sessions_table.get_item(Key={"conversationId": conversation_id})
    session = session_lookup.get("Item")
    if not session:
        print(f"No session metadata found for conversation_id={conversation_id}")
        return {"statusCode": 200, "body": json.dumps({"error": "Unknown conversation_id"})}

    case_id = session["caseId"]
    student_email = session["studentEmail"]
    report_type = session.get("reportType", "detailed")

    # Reformat Tavus's role-based transcript into a readable two-way
    # dialogue string. "user" is the student; "assistant" is the PAL
    # (Mrs Katherine); "system"/"tool" lines are dropped - they're
    # prompt scaffolding, not something either party said.
    transcript_entries = body.get("properties", {}).get("transcript", [])
    dialogue_lines = []
    for entry in transcript_entries:
        role = entry.get("role")
        content = (entry.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            dialogue_lines.append(f"Student: {content}")
        elif role == "assistant":
            dialogue_lines.append(f"Mrs Katherine (AI patient): {content}")
        # system / tool roles intentionally skipped

    dialogue_text = "\n".join(dialogue_lines)

    if not dialogue_text:
        print(f"Empty transcript for conversation_id={conversation_id}, skipping")
        return {"statusCode": 200, "body": json.dumps({"error": "Empty transcript"})}

    # Wrap in the exact Amazon Transcribe-shaped envelope
    # dental-ai-assessment already expects for every OSCE/SCR case.
    transcribe_shaped = {
        "jobName": f"avatar-{conversation_id}",
        "accountId": "avatar-engine",
        "status": "COMPLETED",
        "results": {
            "transcripts": [
                {"transcript": dialogue_text}
            ]
        }
    }

    timestamp = int(time.time())
    student_prefix = f"avatar-session-{conversation_id}-{timestamp}"

    # Metadata sidecar - same two fields dental-ai-assessment reads
    # for the OSCE/SCR flow, written to the same student-uploads/
    # prefix so nothing downstream needs to know this came from a
    # live avatar call rather than an uploaded recording.
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"student-uploads/{case_id}/{student_prefix}.metadata.json",
        Body=json.dumps({
            "emailId": student_email,
            "reportType": report_type
        }),
        ContentType="application/json"
    )

    # The transcript itself, in the exact path/shape
    # dental-ai-assessment's EventBridge Rule 2 already watches -
    # this single write is what triggers the existing, unchanged
    # scoring pipeline.
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"transcripts/{case_id}/{student_prefix}.json",
        Body=json.dumps(transcribe_shaped),
        ContentType="application/json"
    )

    print(f"Avatar transcript saved for case={case_id}, student={student_email}, conversation={conversation_id}")
    return {"statusCode": 200, "body": json.dumps({"status": "saved", "caseId": case_id})}