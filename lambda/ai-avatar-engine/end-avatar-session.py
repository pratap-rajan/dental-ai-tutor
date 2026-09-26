import json
import os
import urllib.request
import urllib.error

# Companion to ai-avatar-engine: called when the student clicks
# "End session" so the conversation actually stops on Tavus's side,
# instead of just closing the iframe locally. Without this, finished
# conversations pile up as "active" and eventually hit Tavus's
# concurrent-conversation limit, blocking new sessions from starting -
# exactly what happened before this Lambda existed.

TAVUS_API_URL = "https://tavusapi.com/v2/conversations"


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
        body = json.loads(event.get("body") or "{}")
        conversation_id = body.get("conversationId")

        if not conversation_id:
            return {
                "statusCode": 400,
                "headers": cors_headers(),
                "body": json.dumps({"error": "conversationId is required"})
            }

        api_key = get_tavus_api_key()

        req = urllib.request.Request(
            f"{TAVUS_API_URL}/{conversation_id}/end",
            data=b"",
            method="POST",
            headers={"x-api-key": api_key}
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"status": "ended", "conversationId": conversation_id})
        }

    except urllib.error.HTTPError as err:
        error_body = err.read().decode("utf-8")
        print(f"Tavus end-conversation error {err.code}: {error_body}")
        # Treat as best-effort: the student is already leaving the
        # call either way, so a failed end-call shouldn't block the
        # UI - just log it for later cleanup.
        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"status": "end_failed", "detail": error_body})
        }
    except Exception as err:
        print(f"Unexpected error: {err}")
        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"status": "end_failed", "detail": str(err)})
        }