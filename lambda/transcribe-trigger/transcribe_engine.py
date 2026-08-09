import os
import time
import urllib.parse
import boto3

s3 = boto3.client("s3")

transcribe = boto3.client(
    "transcribe",
    region_name=os.environ.get("REGION", "eu-west-2")
)

INPUT_BUCKET  = os.environ["INPUT_BUCKET"]
OUTPUT_BUCKET = os.environ["OUTPUT_BUCKET"]
INPUT_PREFIX  = os.environ["INPUT_PREFIX"]
OUTPUT_PREFIX = os.environ["OUTPUT_PREFIX"]

# Recording formats accepted end-to-end. Amazon Transcribe's
# StartTranscriptionJob requires an explicit MediaFormat matching the
# actual file type — this maps each accepted extension to the exact
# value Transcribe expects. Keep this in sync with ALLOWED_EXTENSIONS
# in presigned_url_lambda.py; both must accept the same set of formats.
MEDIA_FORMATS = {
    "mp4": "mp4",
    "ogg": "ogg",
    "wav": "wav"
}


def get_uploaded_key_from_event(event):
    """
    If this Lambda was triggered by an S3 event notification (directly,
    or via EventBridge), the event contains the exact key that was just
    uploaded. Returns that key, or None if the event doesn't look like
    an S3 notification (e.g. a manual test invocation).
    """
    try:
        records = event.get("Records")
        if records:
            key = records[0]["s3"]["object"]["key"]
            return urllib.parse.unquote_plus(key)
    except (KeyError, IndexError, TypeError):
        pass

    # EventBridge S3 notification shape
    try:
        detail = event.get("detail", {})
        key = detail["object"]["key"]
        return urllib.parse.unquote_plus(key)
    except (KeyError, TypeError):
        pass

    return None


def find_first_recording_under_prefix(bucket, prefix):
    """
    Fallback for manual/test invocations that don't carry a real S3
    event: scans the prefix and returns the first file matching any
    accepted extension.
    NOT suitable for production use with multiple concurrent uploads —
    prefer get_uploaded_key_from_event() whenever a real event is available.
    """
    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)

    if "Contents" not in response:
        raise Exception(f"No files found under {prefix}")

    for obj in response["Contents"]:
        ext = obj["Key"].rsplit(".", 1)[-1].lower() if "." in obj["Key"] else ""
        if ext in MEDIA_FORMATS:
            return obj["Key"]

    allowed_list = ", ".join(f".{e}" for e in MEDIA_FORMATS)
    raise Exception(f"No recordings found under {prefix} (looked for: {allowed_list})")


def lambda_handler(event, context):

    print("EVENT =", event)

    try:
        recording_file = get_uploaded_key_from_event(event)

        if recording_file:
            print(f"Using uploaded key from event: {recording_file}")
        else:
            print("No S3 event detected in payload — falling back to prefix scan")
            recording_file = find_first_recording_under_prefix(INPUT_BUCKET, INPUT_PREFIX)
            print(f"Found file via scan: {recording_file}")

        extension = recording_file.rsplit(".", 1)[-1].lower() if "." in recording_file else ""
        if extension not in MEDIA_FORMATS:
            allowed_list = ", ".join(f".{e}" for e in MEDIA_FORMATS)
            raise Exception(f"Uploaded file is not a supported recording format ({allowed_list}): {recording_file}")

        #
        # Example:
        # student-uploads/case1-amalgam-highspot/shweta-1784980001.mp4
        # student-uploads/case1-amalgam-highspot/rahul-1784981234.ogg
        #

        parts = recording_file.split("/")
        if len(parts) < 3:
            raise Exception(
                f"Unexpected upload key shape (expected student-uploads/{{caseId}}/{{student}}.{{ext}}): {recording_file}"
            )

        filename     = parts[-1]
        student_name = filename.rsplit(".", 1)[0]
        case_id      = parts[1]

        output_key = f"{OUTPUT_PREFIX}/{case_id}/{student_name}.json"

        job_name = f"{case_id}-{student_name}-{int(time.time())}"

        media_uri = f"s3://{INPUT_BUCKET}/{recording_file}"

        print(f"Job Name: {job_name}")
        print(f"Media URI: {media_uri}")
        print(f"Media Format: {MEDIA_FORMATS[extension]}")
        print(f"Output: {output_key}")

        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            LanguageCode="en-GB",
            MediaFormat=MEDIA_FORMATS[extension],
            Media={"MediaFileUri": media_uri},
            OutputBucketName=OUTPUT_BUCKET,
            OutputKey=output_key
        )

        return {
            "statusCode": 200,
            "body": {
                "jobName":        job_name,
                "studentName":    student_name,
                "caseId":         case_id,
                "inputFile":      recording_file,
                "mediaFormat":    MEDIA_FORMATS[extension],
                "transcriptFile": output_key
            }
        }

    except Exception as ex:
        print(f"ERROR: {str(ex)}")
        return {
            "statusCode": 500,
            "body": {
                "error": str(ex)
            }
        }