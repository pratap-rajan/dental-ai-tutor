import json
import os
import boto3
from boto3.dynamodb.conditions import Key

s3 = boto3.client("s3", region_name=os.environ.get("REGION", "eu-west-2"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("REGION", "eu-west-2"))

BUCKET_NAME = os.environ["BUCKET_NAME"]
REPORTS_TABLE_NAME = os.environ.get("REPORTS_TABLE_NAME", "student-reports")
reports_table = dynamodb.Table(REPORTS_TABLE_NAME)

PRESIGNED_URL_EXPIRY_SECONDS = int(os.environ.get("PRESIGNED_URL_EXPIRY_SECONDS", "600"))  # 10 min

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
}


def response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body_dict)
    }


def presign(key):
    if not key:
        return None
    try:
        return s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": BUCKET_NAME, "Key": key},
            ExpiresIn=PRESIGNED_URL_EXPIRY_SECONDS
        )
    except Exception as ex:
        print(f"WARNING: could not presign {key}: {ex}")
        return None


def lambda_handler(event, context):
    """
    Requires a JWT authorizer attached to this route in API Gateway
    (HTTP API), pointed at your Cognito User Pool — that's what
    populates event.requestContext.authorizer.jwt.claims below. Note
    this is the HTTP API (payload format 2.0) shape, one level deeper
    than the classic REST API Cognito-authorizer shape
    (event.requestContext.authorizer.claims). This Lambda never trusts
    an email passed in the request itself; a student can only ever
    list their OWN reports, derived from their verified ID token.
    """
    print("EVENT =", json.dumps(event))

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return response(200, {})

    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        email = claims["email"]
    except (KeyError, TypeError):
        return response(401, {"error": "Missing or invalid authorization"})

    try:
        resp = reports_table.query(
            KeyConditionExpression=Key("emailId").eq(email.lower().strip()),
            ScanIndexForward=False  # newest first
        )
        items = resp.get("Items", [])
    except Exception as ex:
        print(f"ERROR querying reports for {email}: {ex}")
        return response(500, {"error": "Could not retrieve reports"})

    reports = []
    for item in items:
        reports.append({
            "caseId": item.get("caseId"),
            "assessmentType": item.get("assessmentType"),
            "timestamp": item.get("reportTimestamp"),
            "viewUrl": presign(item.get("htmlKey")),
            "downloadUrl": presign(item.get("pdfKey"))
        })

    return response(200, {"reports": reports})