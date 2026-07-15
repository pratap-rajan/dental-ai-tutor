import os
import time
import boto3

s3 = boto3.client("s3")
transcribe = boto3.client("transcribe")

INPUT_BUCKET = os.environ["INPUT_BUCKET"]
OUTPUT_BUCKET = os.environ["OUTPUT_BUCKET"]

INPUT_PREFIX = os.environ["INPUT_PREFIX"]
OUTPUT_PREFIX = os.environ["OUTPUT_PREFIX"]


def lambda_handler(event, context):

    print("Scanning for uploaded files...")

    response = s3.list_objects_v2(
        Bucket=INPUT_BUCKET,
        Prefix=INPUT_PREFIX
    )

    if "Contents" not in response:
        raise Exception(
            f"No files found under {INPUT_PREFIX}"
        )

    mp4_file = None

    for obj in response["Contents"]:

        key = obj["Key"]

        if key.lower().endswith(".mp4"):
            mp4_file = key
            break

    if not mp4_file:
        raise Exception(
            f"No MP4 files found under {INPUT_PREFIX}"
        )

    print(f"Found file: {mp4_file}")

    #
    # Example:
    # student-uploads/case1-amalgam-highspot/shweta.mp4
    #

    filename = mp4_file.split("/")[-1]

    student_name = filename.rsplit(".", 1)[0]

    case_id = mp4_file.split("/")[1]

    output_key = (
        f"{OUTPUT_PREFIX}/"
        f"{case_id}/"
        f"{student_name}.json"
    )

    job_name = (
        f"{case_id}-"
        f"{student_name}-"
        f"{int(time.time())}"
    )

    media_uri = (
        f"s3://{INPUT_BUCKET}/{mp4_file}"
    )

    print(f"Job Name: {job_name}")
    print(f"Media URI: {media_uri}")
    print(f"Output: {output_key}")

    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        LanguageCode="en-GB",
        MediaFormat="mp4",
        Media={
            "MediaFileUri": media_uri
        },
        OutputBucketName=OUTPUT_BUCKET,
        OutputKey=output_key
    )

    return {
        "statusCode": 200,
        "jobName": job_name,
        "studentName": student_name,
        "caseId": case_id,
        "inputFile": mp4_file,
        "transcriptFile": output_key
    }
