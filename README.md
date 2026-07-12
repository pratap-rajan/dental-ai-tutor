# dental-ai-tutor

# High-Level Architecture Diagram
This high-level blueprint shows how your file moves seamlessly through your AWS services:

graph TD
    A[User uploads student video to S3] --> B(AWS Step Functions Orchestrator)
    B --> C[1. AWS Transcribe Converts Video to JSON Text]
    C --> D[2. Lambda Function Evaluates Text against Rubric via Bedrock]
    D --> E[3. Lambda Saves Styled HTML Report to S3]
    E --> F[4. Amazon SNS/SES Emails HTML Report Summary to Inbox]

# LLow-Level Execution Sequence
When an .mp4 file drops into your bucket, AWS Step Functions coordinates the following tasks behind the scenes:

sequenceDiagram
    autonumber
    actor User as Examiner (S3 Upload)
    participant SF as AWS Step Functions
    participant TR as AWS Transcribe
    participant S3 as Amazon S3 Bucket
    participant LM as AWS Lambda (Bedrock)
    participant SNS as Amazon SNS (Email)

    User->>S3: Uploads case21-highspot-johnsmith.mp4
    Note over SF: Triggered by EventBridge S3 Upload Event
    SF->>TR: StartTranscriptionJob
    TR->>S3: Read .mp4 media file
    TR->>S3: Write transcribed text to case21-highspot-johnsmith.json
    TR-->>SF: Job Completed successfully
    SF->>LM: Invoke Evaluation Lambda (Passes file parameters)
    LM->>S3: Reads Rubric, Case Images, and newly created Student JSON
    LM->>LM: Generates custom encouraging HTML layout
    LM->>S3: Saves case21-highspot-johnsmith-outcome-report.html
    LM-->>SF: Returns JSON payload (Score, Grade, Feedback)
    SF->>SNS: Publish Message (Email Alert)
    SNS-->>User: You receive evaluation results in your inbox

# S3 Bucket Folder Structure:
Before running an evaluation for a case, you must pre-stage your baseline exam materials using your AWS Management Console.
Name your student videos using this exact template pattern:
[CaseID]-[CaseName]-[StudentName].mp4 (e.g., case21-highspot-johnsmith.mp4).
Here is exactly how your S3 bucket folder directory must look:

your-dental-exam-bucket/
│
├── cases/
│   └── case21/                                 # Folder matches your CaseID prefix
│       ├── case-study.jpeg                     # PRE-REQUISITE: Clinical case image
│       ├── case-evaluation-matrix-extracted.txt # PRE-REQUISITE: Explicit rubric definitions
│       └── ai-tutor-demo.json                  # PRE-REQUISITE: Baseline ideal reference transcript
│
├── student-uploads/
│   └── case21/
│       # 1. You upload this video file:
│       ├── case21-highspot-johnsmith.mp4       
│       #
│       # 2. AWS Transcribe automatically outputs this text file:
│       └── case21-highspot-johnsmith.json      
│
└── cases/
    └── reports/
        └── case21/
            # 3. Your Lambda creates this beautiful print-ready document:
            └── case21-highspot-johnsmith-outcome-report.html

AWS Management Console Setup Guide
Follow these steps directly inside your AWS Console to hook the entire system together:

1. Set Up Email Notifications (Amazon SNS)
Search for Simple Notification Service (SNS) in the AWS console header.
Click Topics on the left menu, click Create Topic, choose Standard, and name it DentalReportTopic. Click Save.
Open your newly created topic, look under the Subscriptions tab, and click Create Subscription.
Change the Protocol dropdown selection to Email, and input your personal email address into the Endpoint box.
Open your email inbox, find the confirmation message sent by AWS, and click Confirm Subscription.

2. Configure Your Lambda Function Environment
Open your function page in AWS Lambda.
Go to the Configuration tab, then select Environment variables on the left sub-panel.

Add these parameters:
BUCKET_NAME = your-dental-exam-bucket
MODEL_ID = anthropic.claude-3-5-sonnet-20240620-v1:0 (or your chosen Claude runtime variant)
Ensure your Lambda Execution IAM role includes permissions for s3:GetObject, s3:PutObject, bedrock:InvokeModel, and transcribe:*.

3. Create the Automation Trigger (Amazon EventBridge)
Navigate to Amazon EventBridge in the console.
Create a new rule called TriggerExamWorkflowOnUpload.
Set the rule type to Rule with an event pattern.
Use an S3 object creation pattern filtering for objects matching prefix student-uploads/ and suffix .mp4.
Select your Step Functions State Machine as the rule target destination.
