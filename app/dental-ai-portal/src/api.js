import { API_BASE_URL } from "./config.js";

/**
 * Asks the backend for a presigned S3 PUT URL, scoped to
 * student-uploads/{caseId}/{studentFileName}.mp4
 *
 * Expected backend contract (your presigned-URL Lambda, fronted by
 * API Gateway):
 *
 *   POST {API_BASE_URL}/upload-url
 *   body: { caseId, email, fileName, contentType }
 *
 *   response: { uploadUrl, objectKey }
 *
 * uploadUrl is a presigned S3 PUT URL valid for a short time (e.g. 5 min).
 * objectKey is the final S3 key the file will land at — useful for
 * showing the student a reference, or for your own logging.
 */
export async function requestUploadUrl({ caseId, email, fileName, contentType }) {
  const response = await fetch(`${API_BASE_URL}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, email, fileName, contentType })
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
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

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
