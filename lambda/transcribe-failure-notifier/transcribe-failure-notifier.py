"""
transcribe-failure-notifier
---------------------------
Triggered by EventBridge Rule 4 (Transcribe Job State Change, status FAILED).

What it does:
  1. Looks up the failed job (FailureReason + original media URI)
  2. Finds the student via the metadata sidecar (<stem>.metadata.json)
  3. Emails the student (friendly explanation + how to fix) via SES
  4. Emails the admin an alert with the technical detail
  5. Deletes the orphaned recording (Rule 3 only fires on COMPLETED)

Environment variables:
  REGION                  default eu-west-2
  SES_SENDER              required - verified SES sender
  ADMIN_NOTIFY_EMAIL      optional - admin alert recipient
  NOTIFY_STUDENT          default "true"
  DELETE_FAILED_RECORDING default "true"
"""

import json
import logging
import os
from urllib.parse import unquote, urlparse

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("REGION", "eu-west-2")
SES_SENDER = os.environ["SES_SENDER"]
ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL", "")
NOTIFY_STUDENT = os.environ.get("NOTIFY_STUDENT", "true").lower() == "true"
DELETE_FAILED_RECORDING = os.environ.get("DELETE_FAILED_RECORDING", "true").lower() == "true"

transcribe = boto3.client("transcribe", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)
ses = boto3.client("ses", region_name=REGION)


def _parse_s3_uri(uri):
    parsed = urlparse(uri)
    if parsed.scheme == "s3":
        return parsed.netloc, unquote(parsed.path.lstrip("/"))
    # https://s3.<region>.amazonaws.com/<bucket>/<key>
    parts = parsed.path.lstrip("/").split("/", 1)
    return parts[0], unquote(parts[1]) if len(parts) > 1 else ""


def _student_email(bucket, key):
    sidecar = key.rsplit(".", 1)[0] + ".metadata.json"
    try:
        body = s3.get_object(Bucket=bucket, Key=sidecar)["Body"].read()
        return (json.loads(body).get("emailId") or "").strip().lower()
    except Exception as exc:
        logger.warning("Could not read sidecar %s: %s", sidecar, exc)
        return ""


def _friendly_reason(reason):
    r = (reason or "").lower()
    if "parse" in r or "format" in r or "codec" in r:
        return ("We couldn't read the audio in your recording. The file may be silent, "
                "corrupted, or in a format our system can't decode.")
    if "duration" in r or "short" in r:
        return "Your recording was too short to transcribe."
    if "sample" in r or "channel" in r:
        return "The audio settings of your recording aren't supported."
    return "We were unable to transcribe your recording."


def _send(to, subject, body):
    ses.send_email(
        Source=SES_SENDER,
        Destination={"ToAddresses": [to]},
        Message={"Subject": {"Data": subject, "Charset": "UTF-8"},
                 "Body": {"Text": {"Data": body, "Charset": "UTF-8"}}},
    )


def lambda_handler(event, context):
    detail = event.get("detail", {})
    job_name = detail.get("TranscriptionJobName")
    status = detail.get("TranscriptionJobStatus")

    if status != "FAILED" or not job_name:
        logger.info("Ignoring event: job=%s status=%s", job_name, status)
        return {"status": "ignored"}

    job = transcribe.get_transcription_job(TranscriptionJobName=job_name)["TranscriptionJob"]
    failure_reason = job.get("FailureReason", "Unknown")
    media_uri = job.get("Media", {}).get("MediaFileUri", "")
    bucket, key = _parse_s3_uri(media_uri) if media_uri else ("", "")

    # student-uploads/<caseId>/<file>
    key_parts = key.split("/")
    case_id = key_parts[1] if len(key_parts) > 2 else "unknown"
    student_email = _student_email(bucket, key) if key else ""

    logger.error("Transcribe FAILED job=%s case=%s student=%s reason=%s",
                 job_name, case_id, student_email or "unknown", failure_reason)

    # 1. Student email
    if NOTIFY_STUDENT and student_email:
        try:
            _send(
                student_email,
                "Plan Ore Academy - we couldn't process your recording",
                f"Hello,\n\n"
                f"{_friendly_reason(failure_reason)}\n\n"
                f"Case: {case_id}\n\n"
                "Please check that:\n"
                "  - your microphone was on and the recording has sound when played back\n"
                "  - you upload the original recording (not one re-shared via WhatsApp or similar)\n"
                "  - the file is MP4, OGG or WAV\n\n"
                "Then record again and re-upload from the portal. This attempt has not been "
                "counted in your report history.\n\n"
                "Plan Ore Academy",
            )
        except ClientError as exc:
            logger.error("Student email failed: %s", exc)

    # 2. Admin alert
    if ADMIN_NOTIFY_EMAIL:
        try:
            _send(
                ADMIN_NOTIFY_EMAIL,
                f"[ALERT] Transcribe job failed: {case_id}",
                f"Job: {job_name}\nCase: {case_id}\nStudent: {student_email or 'unknown'}\n"
                f"FailureReason: {failure_reason}\nMedia: {media_uri}\n",
            )
        except ClientError as exc:
            logger.error("Admin email failed: %s", exc)

    # 3. Remove orphaned recording
    if DELETE_FAILED_RECORDING and bucket and key.startswith("student-uploads/"):
        try:
            s3.delete_object(Bucket=bucket, Key=key)
            logger.info("Deleted orphaned recording s3://%s/%s", bucket, key)
        except ClientError as exc:
            logger.error("Delete failed: %s", exc)

    return {"status": "notified", "job": job_name, "case": case_id}