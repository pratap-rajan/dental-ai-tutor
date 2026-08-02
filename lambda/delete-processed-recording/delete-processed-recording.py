import os
import boto3

s3 = boto3.client(
    "s3",
    region_name=os.environ.get("REGION", "eu-west-2")
)

BUCKET_NAME   = os.environ["BUCKET_NAME"]
INPUT_PREFIX  = os.environ.get("INPUT_PREFIX", "student-uploads")


def parse_job_name(job_name):
    """
    Reconstructs (case_id, student_name) from a Transcribe job name built
    by the Transcribe Trigger Lambda as:

        f"{case_id}-{student_name}-{int(time.time())}"

    This is inherently a "split from the right" problem: case_id and
    student_name may themselves contain hyphens (e.g.
    "case2-amalgam-toxicity-filling", "janedoe-1784980001"), but the
    trailing timestamp segment is always a plain integer, so we can
    safely peel it off first, then split the remainder into case_id vs
    student_name using the KNOWN case_id (looked up against real case
    folders in S3) rather than guessing where the split falls.

    Returns (case_id, student_name) or (None, None) if it can't be
    confidently parsed.
    """
    parts = job_name.split("-")

    # Last segment must be the trailing unix timestamp — drop it.
    if not parts or not parts[-1].isdigit():
        return None, None
    parts = parts[:-1]

    if len(parts) < 2:
        return None, None

    # Try every possible split point, preferring the LONGEST case_id
    # prefix that actually exists in S3 under cases/{candidate}/ — this
    # avoids guessing wrong when both case_id and student_name contain
    # hyphens themselves.
    for split_point in range(len(parts) - 1, 0, -1):
        candidate_case_id = "-".join(parts[:split_point])
        candidate_student  = "-".join(parts[split_point:])

        if case_exists(candidate_case_id):
            return candidate_case_id, candidate_student

    return None, None


def case_exists(case_id):
    """Checks whether cases/{case_id}/ genuinely exists in S3."""
    try:
        resp = s3.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=f"cases/{case_id}/",
            MaxKeys=1
        )
        return resp.get("KeyCount", 0) > 0
    except Exception:
        return False


def lambda_handler(event, context):

    print("EVENT =", event)

    try:
        detail = event.get("detail", {})
        job_name = detail.get("TranscriptionJobName")
        status   = detail.get("TranscriptionJobStatus")

        if not job_name:
            print("No TranscriptionJobName in event — nothing to do")
            return {"statusCode": 200, "body": {"message": "No job name, skipped"}}

        # Only ever delete on a confirmed COMPLETED job. A FAILED or
        # IN_PROGRESS status must never trigger deletion — if
        # transcription failed, the source recording needs to still
        # exist for investigation or retry.
        if status != "COMPLETED":
            print(f"Job status is '{status}', not COMPLETED — skipping deletion")
            return {"statusCode": 200, "body": {"message": f"Status {status}, skipped"}}

        case_id, student_name = parse_job_name(job_name)

        if not case_id or not student_name:
            print(f"ERROR: could not confidently parse job name '{job_name}' — skipping deletion for safety")
            return {
                "statusCode": 200,
                "body": {"message": "Could not parse job name, skipped deletion for safety"}
            }

        mp4_key = f"{INPUT_PREFIX}/{case_id}/{student_name}.mp4"

        print(f"Resolved job '{job_name}' -> case_id='{case_id}' student_name='{student_name}'")
        print(f"Target mp4 key: {mp4_key}")

        # Confirm the object actually exists before attempting delete,
        # so logs clearly distinguish "already gone" from "deleted now".
        try:
            s3.head_object(Bucket=BUCKET_NAME, Key=mp4_key)
        except s3.exceptions.ClientError as ex:
            if ex.response["Error"]["Code"] in ("404", "NoSuchKey"):
                print(f"mp4 already absent at {mp4_key} — nothing to delete")
                return {
                    "statusCode": 200,
                    "body": {"message": "Recording already absent", "key": mp4_key}
                }
            raise

        s3.delete_object(Bucket=BUCKET_NAME, Key=mp4_key)
        print(f"Deleted {mp4_key} following successful transcription (job: {job_name})")

        return {
            "statusCode": 200,
            "body": {
                "message": "Recording deleted following successful transcription",
                "jobName": job_name,
                "deletedKey": mp4_key
            }
        }

    except Exception as ex:
        # Deliberately non-fatal to the wider pipeline: a failure here
        # should never block or retry-storm the rest of the system.
        # Worst case, a recording lingers a bit longer than intended —
        # log it clearly so it's visible, but don't raise.
        print(f"ERROR during recording cleanup: {ex}")
        return {
            "statusCode": 500,
            "body": {"error": str(ex)}
        }

