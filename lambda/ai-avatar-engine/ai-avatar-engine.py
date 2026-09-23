import json
import os
import urllib.request
import urllib.error

# Same pattern as your other Lambdas behind the "orebuddy" HTTP API:
# event.requestContext.http.method (v2 payload), not event.httpMethod.

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
        pal_id = body.get("palId")
        face_id = body.get("faceId")
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
            "conversation_name": f"avatar-practice-{case_id}"
        }
        if face_id:
            tavus_payload["face_id"] = face_id

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

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({
                "conversationUrl": tavus_response.get("conversation_url"),
                "conversationId": tavus_response.get("conversation_id")
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