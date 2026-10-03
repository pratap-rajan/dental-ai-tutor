import json
import os
import time
import urllib.request
import urllib.error

import boto3
from botocore.exceptions import ClientError

# Safety-net Lambda, run on a schedule (EventBridge rate expression,
# e.g. every 1 minute). Backstops avatar-transcript-webhook for any
# avatar session that ends WITHOUT Tavus's application.transcription_ready
# webhook ever arriving - network drop mid-call, browser crash, Tavus's
# own plan-cap/timeout force-kill, or any other abrupt end. Tavus still
# generates the transcript server-side in these cases (per their docs,
# "after ending a conversation, the chat history is saved") - it's
# specifically webhook DELIVERY that isn't guaranteed, not the data
# itself. So rather than depending on a single push, this sweeps
# avatar-sessions for anything not yet processed and pulls the
# transcript directly via GET /v2/conversations/{id}?verbose=true.
#
# Shares the exact same idempotency guard (the transcriptProcessed
# attribute on avatar-sessions) that avatar-transcript-webhook claims
# before doing any work - whichever of the two gets to a given
# conversation first wins the conditional update; the other silently
# backs off. No duplicate transcripts, no duplicate emails, regardless
# of which path actually delivers for a given session.

BUCKET_NAME = os.environ["BUCKET_NAME"]
SESSIONS_TABLE_NAME = os.environ.get("AVATAR_SESSIONS_TABLE", "avatar-sessions")
TAVUS_API_KEY = os.environ["TAVUS_API_KEY"]
ADMIN_REVIEW_EMAIL = os.environ.get("ADMIN_REVIEW_EMAIL")

# Don't poll a session younger than this - it may still be legitimately
# in progress. Harmless either way (an in-progress call's verbose GET
# just won't have the transcription_ready event yet), this just avoids
# wasted API calls. Safe to leave low even after a Tavus plan upgrade
# to longer sessions - polling mid-call is a no-op, not an error.
MIN_AGE_SECONDS = int(os.environ.get("MIN_AGE_SECONDS", "90"))

# Stop polling (and alert the admin instead) once a session is this
# old with still no transcript - avoids polling forever on a session
# that genuinely never produced one.
MAX_AGE_SECONDS = int(os.environ.get("MAX_AGE_SECONDS", "1800"))  # 30 min

TAVUS_API_BASE = "https://tavusapi.com/v2/conversations"

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
sessions_table = dynamodb.Table(SESSIONS_TABLE_NAME)
ses = boto3.client("ses")


def get_conversation_verbose(conversation_id):
    req = urllib.request.Request(
        f"{TAVUS_API_BASE}/{conversation_id}?verbose=true",
        method="GET",
        headers={"x-api-key": TAVUS_API_KEY}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def extract_transcript_entries(conversation_detail):
    for ev in conversation_detail.get("events", []):
        if ev.get("event_type") == "application.transcription_ready":
            return ev.get("properties", {}).get("transcript", [])
    return None


def build_dialogue(transcript_entries):
    # Same reformatting avatar-transcript-webhook does - "user" is the
    # student, "assistant" is the PAL (Mrs Katherine); system/tool
    # lines are prompt scaffolding, not something either party said.
    lines = []
    for entry in transcript_entries:
        role = entry.get("role")
        content = (entry.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            lines.append(f"Student: {content}")
        elif role == "assistant":
            lines.append(f"Mrs Katherine (AI patient): {content}")
    return "\n".join(lines)


def claim_conversation(conversation_id):
    """Atomically claim this conversation for processing. Returns False
    if avatar-transcript-webhook (or an earlier poller sweep) already
    claimed it - the caller should then skip it entirely."""
    try:
        sessions_table.update_item(
            Key={"conversationId": conversation_id},
            UpdateExpression=(
                "SET transcriptProcessed = :true, "
                "transcriptProcessedAt = :ts, "
                "transcriptProcessedBy = :by"
            ),
            ConditionExpression="attribute_not_exists(transcriptProcessed)",
            ExpressionAttributeValues={
                ":true": True,
                ":ts": int(time.time()),
                ":by": "poller"
            }
        )
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise


def write_transcript_to_pipeline(session, conversation_id, dialogue_text):
    # Identical S3 writes to avatar-transcript-webhook's normal path -
    # same paths, same shapes - so dental-ai-assessment's existing
    # EventBridge Rule 2 picks this up exactly as it would a webhook
    # delivery. Nothing downstream needs to know which path produced it.
    case_id = session["caseId"]
    student_email = session["studentEmail"]
    report_type = session.get("reportType", "basic")

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
    print(f"[poller] Recovered transcript for conversation={conversation_id}, case={case_id}, student={student_email}")


def notify_admin_unrecoverable(session, conversation_id):
    if not ADMIN_REVIEW_EMAIL:
        return
    try:
        ses.send_email(
            Source=ADMIN_REVIEW_EMAIL,
            Destination={"ToAddresses": [ADMIN_REVIEW_EMAIL]},
            Message={
                "Subject": {"Data": f"Avatar session never produced a transcript: {conversation_id}"},
                "Body": {"Text": {"Data": (
                    f"conversation_id={conversation_id}\n"
                    f"caseId={session.get('caseId')}\n"
                    f"createdAt={session.get('createdAt')}\n\n"
                    f"No application.transcription_ready event appeared after "
                    f"{MAX_AGE_SECONDS}s of polling via GET /v2/conversations. "
                    "This session will not get an automatic report - check "
                    "Tavus's own dashboard for this conversation_id if the "
                    "student needs to be followed up with manually."
                )}}
            }
        )
    except Exception as err:
        print(f"[poller] Failed to send admin alert for {conversation_id}: {err}")


def lambda_handler(event, context):
    now = int(time.time())

    # Scan is fine at this table's current size (roughly one row per
    # avatar session attempted). Revisit with a GSI on
    # transcriptProcessed if avatar-session volume grows significantly -
    # not a concern yet given the single-case pilot this is built for.
    response = sessions_table.scan()
    candidates = response.get("Items", [])

    processed_count = 0
    alerted_count = 0

    for session in candidates:
        if session.get("transcriptProcessed"):
            continue

        conversation_id = session.get("conversationId")
        created_at = session.get("createdAt", 0)
        age = now - created_at

        if age < MIN_AGE_SECONDS:
            continue  # still plausibly in progress

        if age > MAX_AGE_SECONDS:
            if claim_conversation(conversation_id):
                notify_admin_unrecoverable(session, conversation_id)
                alerted_count += 1
            continue

        try:
            detail = get_conversation_verbose(conversation_id)
        except urllib.error.HTTPError as err:
            print(f"[poller] Tavus GET failed for {conversation_id}: {err.code}")
            continue
        except Exception as err:
            print(f"[poller] Unexpected error polling {conversation_id}: {err}")
            continue

        transcript_entries = extract_transcript_entries(detail)
        if not transcript_entries:
            continue  # not ready yet - try again next sweep

        dialogue_text = build_dialogue(transcript_entries)
        if not dialogue_text:
            continue  # transcript event exists but has no usable content yet

        if claim_conversation(conversation_id):
            write_transcript_to_pipeline(session, conversation_id, dialogue_text)
            processed_count += 1
        # else: avatar-transcript-webhook (or a parallel sweep) already
        # claimed this one - skip, nothing to do.

    print(f"[poller] Swept {len(candidates)} session(s): recovered {processed_count}, alerted {alerted_count}")
    return {"processed": processed_count, "alerted": alerted_count}