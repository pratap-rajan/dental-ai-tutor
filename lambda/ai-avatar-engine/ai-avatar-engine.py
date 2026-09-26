import json
import os
import time
import urllib.request
import urllib.error

import boto3

# Same pattern as your other Lambdas behind the "orebuddy" HTTP API:
# event.requestContext.http.method (v2 payload), not event.httpMethod.
#
# The review report for every avatar session goes to a FIXED admin
# inbox (ADMIN_REVIEW_EMAIL), never to whoever is testing - the intent
# is admin review before manually sharing results with the student, so
# the frontend never collects or sends an email address at all.

TAVUS_API_URL = "https://tavusapi.com/v2/conversations"
CALLBACK_URL = os.environ.get("AVATAR_CALLBACK_URL")  # avatar-transcript-webhook's route, with ?secret=... appended
SESSIONS_TABLE_NAME = os.environ.get("AVATAR_SESSIONS_TABLE", "avatar-sessions")
ADMIN_REVIEW_EMAIL = os.environ.get("ADMIN_REVIEW_EMAIL")
ADMIN_REPORT_TYPE = os.environ.get("ADMIN_REPORT_TYPE", "detailed")
# 900s (15 min) is a reasonable ceiling for case3-avulsed-tooth's telephone
# triage - explicitly requested rather than relying on the account's
# default, since a plan upgrade doesn't necessarily raise this
# automatically. Will still be capped by whatever your Tavus plan's own
# maximum conversation duration actually allows.
MAX_CALL_DURATION_SECONDS = int(os.environ.get("MAX_CALL_DURATION_SECONDS", "900"))

dynamodb = boto3.resource("dynamodb")
sessions_table = dynamodb.Table(SESSIONS_TABLE_NAME)


def get_tavus_api_key():
    api_key = os.environ.get("TAVUS_API_KEY")
    if not api_key:
        raise RuntimeError("TAVUS_API_KEY environment variable is not set")
    return api_key


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "https://www.planoreacademy.co.uk",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
    }


def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method")

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": cors_headers(), "body": ""}

    try:
        if not ADMIN_REVIEW_EMAIL:
            raise RuntimeError("ADMIN_REVIEW_EMAIL environment variable is not set")

        body = json.loads(event.get("body") or "{}")
        pal_id = body.get("palId")
        face_id = body.get("faceId")  # optional; omitted by the frontend today
        case_id = body.get("caseId", "unknown-case")

        if not pal_id:
            return {
                "statusCode": 400,
                "headers": cors_headers(),
                "body": json.dumps({"error": "palId is required"})
            }

        api_key = get_tavus_api_key()

        tavus_payload = {
            "pal_id": pal_id,
            "conversation_name": f"avatar-practice-{case_id}",
            "properties": {
                "max_call_duration": MAX_CALL_DURATION_SECONDS
            }
        }
        if face_id:
            tavus_payload["face_id"] = face_id
        if CALLBACK_URL:
            tavus_payload["callback_url"] = CALLBACK_URL

        request_data = json.dumps(tavus_payload).encode("utf-8")
        req = urllib.request.Request(
            TAVUS_API_URL,
            data=request_data,
            method="POST",
            headers={
                "x-api-key": api_key,
                "Content-Type": "application/json"
            }
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            tavus_response = json.loads(resp.read().decode("utf-8"))

        conversation_id = tavus_response.get("conversation_id")

        # Write the caseId/admin-email mapping the webhook Lambda
        # needs, keyed by conversation_id - the webhook only gets a
        # conversation_id from Tavus and recovers everything else
        # from here.
        if conversation_id:
            sessions_table.put_item(Item={
                "conversationId": conversation_id,
                "caseId": case_id,
                "studentEmail": ADMIN_REVIEW_EMAIL,
                "reportType": ADMIN_REPORT_TYPE,
                "createdAt": int(time.time())
            })

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({
                "conversationUrl": tavus_response.get("conversation_url"),
                "conversationId": conversation_id
            })
        }

    except urllib.error.HTTPError as err:
        error_body = err.read().decode("utf-8")
        print(f"Tavus API error {err.code}: {error_body}")
        return {
            "statusCode": 502,
            "headers": cors_headers(),
            "body": json.dumps({"error": "Tavus API request failed"})
        }
    except Exception as err:
        print(f"Unexpected error: {err}")
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": "Something went wrong creating the session"})
        }