import { API_BASE_URL } from "./config.js";

/**
 * Asks the backend for a presigned S3 PUT URL, scoped to
 * student-uploads/{caseId}/{studentFileName}.{ext} — ext is whatever
 * extension the uploaded file actually has (mp4, ogg, or wav).
 *
 * Expected backend contract (your presigned-URL Lambda, fronted by
 * API Gateway):
 *
 *   POST {API_BASE_URL}/upload-url
 *   body: { caseId, email, fileName, contentType, reportType, captchaToken }
 *
 *   response: { uploadUrl, objectKey }
 *
 * uploadUrl is a presigned S3 PUT URL valid for a short time (e.g. 5 min).
 * objectKey is the final S3 key the file will land at — useful for
 * showing the student a reference, or for your own logging.
 *
 * captchaToken is a reCAPTCHA v3 token generated client-side just before
 * submit. It MUST be verified server-side (in the Lambda) against
 * Google's siteverify endpoint before issuing a presigned URL — a
 * client-side-only check does nothing to stop a bot, since a bot can
 * simply skip calling grecaptcha.execute() and call this endpoint
 * directly. If RECAPTCHA_SITE_KEY is unset in config.js, captchaToken
 * will be null and the backend should treat CAPTCHA as disabled.
 */
export async function requestUploadUrl({ caseId, email, fileName, contentType, reportType, captchaToken }) {
  const response = await fetch(`${API_BASE_URL}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, email, fileName, contentType, reportType, captchaToken })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Could not get an upload URL (${response.status}). ${text}`.trim()
    );
  }

  return response.json();
}

/**
 * Uploads the file directly to S3 using the presigned URL.
 * Reports progress via onProgress(percent) if the browser supports it.
 */
export function uploadFileToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(file);
  });
}

/**
 * Lists the signed-in student's own past reports (most recent first).
 * The backend derives the student's identity from the Cognito ID
 * token itself (via the API Gateway Cognito authorizer) — the email
 * is never passed in the request, so a student can never see another
 * student's reports by tampering with a request.
 *
 * Expected backend contract:
 *   GET {API_BASE_URL}/my-reports
 *   headers: { Authorization: idToken }
 *   response: { reports: [{ caseId, assessmentType, timestamp, viewUrl, downloadUrl }] }
 *
 * viewUrl / downloadUrl are short-lived (10 min) presigned S3 GET
 * URLs — re-fetch the list if they've expired rather than caching them.
 */
export async function fetchMyReports(idToken) {
  const response = await fetch(`${API_BASE_URL}/my-reports`, {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Could not load reports (${response.status}). ${text}`.trim());
  }

  return response.json();
}

/**
 * Asks the backend to create a live Tavus conversation for the AI
 * Avatar practice tab, and returns the conversationUrl to embed.
 *
 * Expected backend contract (create-tavus-conversation Lambda):
 *   POST {API_BASE_URL}/create-avatar-session
 *   body: { palId, faceId, caseId }
 *   response: { conversationUrl, conversationId }
 *
 * faceId is optional — omit it to use the PAL's own default_face_id.
 */
export async function requestAvatarConversation({ palId, faceId, caseId }) {
  const response = await fetch(`${API_BASE_URL}/create-avatar-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ palId, faceId, caseId })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Could not start the avatar session (${response.status}). ${text}`.trim());
  }

  return response.json();
}