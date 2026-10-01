import json
import os
import time

import boto3
from botocore.exceptions import ClientError

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

    query_params = event.get("queryStringParameters") or {}
    if WEBHOOK_SHARED_SECRET and query_params.get("secret") != WEBHOOK_SHARED_SECRET:
        return {"statusCode": 403, "body": json.dumps({"error": "Invalid webhook secret"})}

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON body"})}

    event_type = body.get("event_type")
    if event_type != "application.transcription_ready":
        return {"statusCode": 200, "body": json.dumps({"skipped": event_type})}

    conversation_id = body.get("conversation_id")
    if not conversation_id:
        print(f"No conversation_id in transcription_ready payload: {body}")
        return {"statusCode": 200, "body": json.dumps({"error": "No conversation_id"})}

    session_lookup = sessions_table.get_item(Key={"conversationId": conversation_id})
    session = session_lookup.get("Item")
    if not session:
        print(f"No session metadata found for conversation_id={conversation_id}")
        return {"statusCode": 200, "body": json.dumps({"error": "Unknown conversation_id"})}

    # Idempotency guard: Tavus delivers application.transcription_ready
    # with "at least once" semantics, not exactly-once - we observed it
    # fire twice for the same conversation_id 20s apart in production.
    # Without this, each duplicate delivery writes a new timestamped
    # transcript+metadata pair to S3, which EventBridge Rule 2 treats
    # as a brand new submission - producing a second, fully duplicate
    # scoring run and a second email. Claim this conversation atomically
    # before doing any work; if another invocation already claimed it
    # (concurrently or moments earlier), skip silently.
    timestamp = int(time.time())
    try:
        sessions_table.update_item(
            Key={"conversationId": conversation_id},
            UpdateExpression="SET transcriptProcessed = :true, transcriptProcessedAt = :ts",
            ConditionExpression="attribute_not_exists(transcriptProcessed)",
            ExpressionAttributeValues={":true": True, ":ts": timestamp}
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            print(f"conversation_id={conversation_id} already processed - skipping duplicate webhook delivery")
            return {"statusCode": 200, "body": json.dumps({"status": "duplicate_skipped"})}
        raise

    case_id = session["caseId"]
    student_email = session["studentEmail"]
    report_type = session.get("reportType", "basic")

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

    dialogue_text = "\n".join(dialogue_lines)

    if not dialogue_text:
        print(f"Empty transcript for conversation_id={conversation_id}, skipping")
        return {"statusCode": 200, "body": json.dumps({"error": "Empty transcript"})}

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

    student_prefix = f"avatar-session-{conversation_id}-{timestamp}"

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"student-uploads/{case_id}/{student_prefix}.metadata.json",
        Body=json.dumps({
            "emailId": student_email,
            "reportType": report_type
        }),
        ContentType="application/json"
    )

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"transcripts/{case_id}/{student_prefix}.json",
        Body=json.dumps(transcribe_shaped),
        ContentType="application/json"
    )

    print(f"Avatar transcript saved for case={case_id}, student={student_email}, conversation={conversation_id}")
    return {"statusCode": 200, "body": json.dumps({"status": "saved", "caseId": case_id})}